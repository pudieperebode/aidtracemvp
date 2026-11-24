"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleDollarSign, Send, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import { Chip, DetailRow, Notice, StatCard } from "@repo/ui/surface";
import { toStroops } from "@repo/stellar/format";
import type { Allocation, Beneficiary, PaymentStatus } from "@repo/stellar/campaign";
import { routes } from "@/lib/routes";
import { api } from "@/lib/api/client";
import { listAllBeneficiaries } from "@/lib/api/endpoints";
import { errorMessage } from "@/lib/api/errors";
import { fixed2, usdc } from "@/lib/format";
import { useToast } from "@/lib/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { CardSkeleton, EmptyState, ErrorState, StatsSkeleton } from "@/components/states";
import { CountUp, CountUpUsd } from "@/components/Money";
import { HashBox } from "@/components/ExplorerButton";
import { useSession } from "@/features/auth/store";
import { useAllocations } from "@/features/beneficiaries/hooks";
import { currentAllocation } from "@/features/beneficiaries/status";
import { useLedger } from "@/features/ledger/hooks";
import { usePublishCampaign } from "@/features/campaigns/hooks";
import { CampaignPicker, useSelectedCampaign } from "@/features/campaigns/components/CampaignPicker";
import { useBatchPayout, useCancelAllocation, type PayoutItem } from "@/features/disbursements/hooks";
import { PAYMENT_STATUS, canCancel, canPay } from "@/features/disbursements/status";
import { FundDialog } from "@/features/disbursements/components/FundDialog";
import { BatchDialog } from "@/features/disbursements/components/BatchDialog";

const AMOUNT = /^\d+(\.\d{1,7})?$/;

interface Row {
	beneficiary: Beneficiary;
	allocation: Allocation | null;
	status: PaymentStatus;
}

/**
 * Screen 4 (Figma "Fund allocation"): balance, available funds and approved beneficiaries; select recipients, set
 * each USDC allocation, review, then "Execute payment" runs Allocate → Lock → Pay (one wallet signature to lock each
 * group of up to 20, then one per payout). Amounts are checked against the campaign maximum and available funds here
 * and again by the backend. An existing allocation's amount is fixed: cancel it to change it.
 */
export function FundAllocation({ reference }: { reference?: string }) {
	const toast = useToast();
	const token = useSession((s) => s.accessToken);
	const campaigns = useSelectedCampaign(reference);
	const campaign = campaigns.selected;
	const ref = campaign?.reference ?? "";
	const approved = useQuery({
		queryKey: ["beneficiaries", ref, { status: "approved", all: true }],
		queryFn: () => listAllBeneficiaries(api, ref, "approved"),
		enabled: !!token && !!campaign,
	});
	const allocations = useAllocations(campaign?.reference);
	const latest = useLedger({ campaign: campaign?.reference, type: "disbursement", status: "confirmed", limit: 1 }, !!campaign);
	const batch = useBatchPayout(ref);
	const cancel = useCancelAllocation(ref);
	const publish = usePublishCampaign();
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [amounts, setAmounts] = useState<Record<string, string>>({});
	const [funding, setFunding] = useState(false);
	const [batchOpen, setBatchOpen] = useState(false);
	const [cancelling, setCancelling] = useState<string | null>(null);

	const rows: Row[] = (approved.data ?? []).map((beneficiary) => {
		const allocation = currentAllocation(allocations.data, beneficiary.id);
		return { beneficiary, allocation, status: allocation?.status ?? "pending_allocation" };
	});
	const max = campaign ? BigInt(campaign.max_allocation) : 0n;
	const defaultAmount = (r: Row) =>
		fixed2(r.allocation ? r.allocation.amount : (campaign?.max_allocation ?? "0")).replace(/,/g, "");
	const amountOf = (r: Row) => (r.allocation ? defaultAmount(r) : (amounts[r.beneficiary.id] ?? defaultAmount(r)));
	const amountError = (r: Row) => {
		if (r.allocation) return null; // fixed: already allocated
		const v = amountOf(r);
		if (!AMOUNT.test(v) || toStroops(v) <= 0n) return "Enter an amount";
		if (toStroops(v) > max) return `Max ${fixed2(max)}`;
		return null;
	};

	const payable = rows.filter((r) => canPay(r.status));
	const chosen = payable.filter((r) => selected.has(r.beneficiary.id));
	const selectedTotal = chosen.reduce((sum, r) => sum + (amountError(r) ? 0n : toStroops(amountOf(r))), 0n);
	const newTotal = chosen
		.filter((r) => !r.allocation)
		.reduce((sum, r) => sum + (amountError(r) ? 0n : toStroops(amountOf(r))), 0n);
	const t = campaign?.totals;
	const balance = t ? BigInt(t.available) : 0n;
	const unallocated = t ? BigInt(t.available) - BigInt(t.allocated) : 0n;
	const remaining = balance - selectedTotal;
	const invalid = chosen.some((r) => amountError(r));
	const tooMuch = newTotal > (unallocated > 0n ? unallocated : 0n);
	const signatures =
		Math.ceil(
			chosen.filter((r) => r.status === "pending_allocation" || r.status === "cancelled" || r.status === "allocated").length / 20,
		) + chosen.length;

	const toggle = (id: string, on: boolean) =>
		setSelected((s) => {
			const next = new Set(s);
			if (on) next.add(id);
			else next.delete(id);
			return next;
		});

	const execute = async () => {
		const items: PayoutItem[] = chosen.map((r) => ({
			beneficiaryId: r.beneficiary.id,
			reference: r.beneficiary.reference,
			amount: amountOf(r),
			allocation:
				r.allocation &&
				(r.allocation.status === "allocated" || r.allocation.status === "ready" || r.allocation.status === "failed")
					? { id: r.allocation.id, status: r.allocation.status }
					: null,
		}));
		setBatchOpen(true);
		await batch.run(items);
		setSelected(new Set());
	};

	const cancelRow = (r: Row) => {
		if (!r.allocation) return;
		setCancelling(r.beneficiary.id);
		cancel.mutate(
			{ allocationId: r.allocation.id },
			{
				onSuccess: () =>
					toast.info(`Allocation for ${r.beneficiary.reference} cancelled`, {
						description: "Its funds are back in the campaign pool.",
					}),
				onError: (e) => toast.error(`Couldn't cancel ${r.beneficiary.reference}'s allocation`, { description: errorMessage(e) }),
				onSettled: () => setCancelling(null),
			},
		);
	};

	const checkbox = (r: Row) => (
		<Checkbox
			aria-label={`Select ${r.beneficiary.reference}`}
			checked={selected.has(r.beneficiary.id)}
			onCheckedChange={(on) => toggle(r.beneficiary.id, on === true)}
			disabled={!canPay(r.status)}
		/>
	);

	const columns: Column<Row>[] = [
		{
			key: "select",
			header: (
				<Checkbox
					aria-label="Select all payable beneficiaries"
					checked={payable.length > 0 && chosen.length === payable.length ? true : chosen.length ? "indeterminate" : false}
					onCheckedChange={(on) => setSelected(on ? new Set(payable.map((r) => r.beneficiary.id)) : new Set())}
					disabled={!payable.length}
				/>
			),
			className: "w-12",
			mobile: "hide",
			cell: checkbox,
		},
		{
			key: "ref",
			header: "Beneficiary",
			mobile: "title",
			cell: (r) => (
				<label className="flex items-center gap-3 md:contents">
					<span className="md:hidden">{checkbox(r)}</span>
					<span className="flex flex-col">
						<span>{r.beneficiary.reference}</span>
						{r.beneficiary.full_name && <span className="caption">{r.beneficiary.full_name}</span>}
					</span>
				</label>
			),
		},
		{
			key: "amount",
			header: "USDC allocation",
			className: "w-[180px]",
			cell: (r) => {
				const error = selected.has(r.beneficiary.id) ? amountError(r) : null;
				return (
					<div className="flex flex-col items-end gap-1 md:items-start">
						<input
							aria-label={`USDC allocation for ${r.beneficiary.reference}`}
							inputMode="decimal"
							value={amountOf(r)}
							onChange={(e) => setAmounts((a) => ({ ...a, [r.beneficiary.id]: e.target.value.replace(/[^\d.]/g, "") }))}
							disabled={!canPay(r.status) || !!r.allocation}
							title={r.allocation ? "Already allocated. Cancel the allocation to change the amount." : undefined}
							className={`h-8 w-[110px] rounded-control border bg-white px-2 text-xs tabular-nums outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15 disabled:border-transparent disabled:bg-transparent ${error ? "border-danger" : "border-line md:border-transparent md:hover:border-line"}`}
						/>
						{error && <span className="text-[11px] text-danger">{error}</span>}
					</div>
				);
			},
		},
		{
			key: "status",
			header: "Payment status",
			cell: (r) => {
				const s = PAYMENT_STATUS[r.status];
				return (
					<div className="flex items-center gap-2">
						<span title={s.description}>
							<Chip key={s.label} tone={s.tone} live={s.live} className="animate-pop">
								{s.label}
							</Chip>
						</span>
						{r.allocation && <span className="caption hidden font-mono xl:inline">{r.allocation.reference}</span>}
					</div>
				);
			},
		},
		{
			key: "actions",
			header: <span className="sr-only">Actions</span>,
			mobile: "label",
			className: "w-[92px]",
			cell: (r) =>
				canCancel(r.status) ? (
					<Button
						variant="ghost"
						size="sm"
						className="h-8"
						onClick={() => cancelRow(r)}
						isLoading={cancelling === r.beneficiary.id}
						loadingText="Cancelling"
						disabled={batch.running || !!cancelling}
					>
						Cancel
					</Button>
				) : null,
		},
	];

	const header = (
		<PageHeader
			title="Fund allocation"
			subtitle="Allocate USDC to approved beneficiaries and review payments."
			action={
				campaign && (
					<>
						{campaigns.list.length > 1 && (
							<CampaignPicker list={campaigns.list} selected={campaign} className="w-full sm:w-[280px]" />
						)}
						{campaign.status === "active" && (
							<Button variant="outline" className="h-10 bg-white" onClick={() => setFunding(true)}>
								<CircleDollarSign /> Fund campaign
							</Button>
						)}
					</>
				)
			}
		/>
	);

	if (campaigns.error)
		return (
			<>
				{header}
				<div className="rounded-card bg-white">
					<ErrorState error={campaigns.error} onRetry={() => campaigns.refetch()} />
				</div>
			</>
		);

	if (!campaigns.isPending && !campaign)
		return (
			<>
				{header}
				<div className="rounded-card bg-white">
					<EmptyState
						title="No campaigns to allocate"
						action={
							<Button asChild size="sm">
								<Link href={routes.CREATE_CAMPAIGN}>Create campaign</Link>
							</Button>
						}
					>
						Create and fund a campaign, approve beneficiaries, then allocate USDC here.
					</EmptyState>
				</div>
			</>
		);

	const confirmed = latest.data?.results[0];
	const listError = approved.error ?? allocations.error;

	return (
		<>
			{header}
			{campaign?.status === "draft" && (
				<Notice
					tone="warning"
					title={`${campaign.reference} is a draft`}
					className="mb-3"
					action={
						<Button
							size="sm"
							isLoading={publish.isPending}
							loadingText="Publishing…"
							onClick={() =>
								publish.mutate(campaign.reference, {
									onSuccess: (c) =>
										toast.success(`${c.title} is live`, {
											description: "It's on the public dashboard. Fund it to start allocating.",
										}),
									onError: (e) => toast.error("Couldn't publish the campaign", { description: errorMessage(e) }),
								})
							}
						>
							<Send /> Publish
						</Button>
					}
				>
					Publish it to show it publicly, accept applications and fund it.
				</Notice>
			)}
			{!t ? (
				<StatsSkeleton count={3} />
			) : (
				<div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
					<StatCard
						className="animate-rise"
						label="Campaign balance"
						value={<CountUpUsd stroops={t.available} cents />}
						caption="Total funds held in escrow"
						tone="review"
					/>
					<StatCard
						className="animate-rise"
						style={{ ["--i" as string]: 1 }}
						label="Available funds"
						value={<CountUpUsd stroops={unallocated > 0n ? unallocated : 0n} cents />}
						caption="USDC available to allocate"
						tone="accent"
					/>
					<StatCard
						className="animate-rise col-span-2 xl:col-span-1"
						style={{ ["--i" as string]: 2 }}
						label="Approved beneficiaries"
						value={<CountUp value={payable.length} />}
						caption="Waiting for allocation or payment"
						tone="pollen"
					/>
				</div>
			)}

			<div className="mt-8 grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,370px)]">
				<section aria-labelledby="approved" className="min-w-0">
					<h2 id="approved" className="h-section">
						Approved beneficiaries
					</h2>
					<p className="caption mt-2">
						Select recipients and enter their USDC allocation (max {campaign ? fixed2(campaign.max_allocation) : "—"} each).
					</p>
					<DataTable
						className="mt-4"
						caption="Approved beneficiaries"
						columns={columns}
						rows={approved.data && allocations.data ? rows : undefined}
						rowKey={(r) => r.beneficiary.id}
						isLoading={approved.isPending || allocations.isPending}
						error={listError}
						onRetry={() => {
							void approved.refetch();
							void allocations.refetch();
						}}
						rowClassName={(r) => (selected.has(r.beneficiary.id) ? "bg-page" : undefined)}
						empty={
							<EmptyState
								title="No approved beneficiaries"
								action={
									<Button asChild size="sm" variant="outline">
										<Link href={routes.BENEFICIARIES({ campaign: campaign?.reference })}>Review beneficiaries</Link>
									</Button>
								}
							>
								Approve beneficiaries on the registration screen and they&apos;ll appear here, ready for allocation.
							</EmptyState>
						}
					/>
					{approved.data && rows.length > 0 && (
						<p className="mt-4 text-xs">
							{chosen.length} of {payable.length} beneficiaries selected
						</p>
					)}
				</section>

				<div className="flex flex-col gap-3 xl:sticky xl:top-[88px]">
					{!campaign || !t ? (
						<CardSkeleton className="min-h-[260px]" lines={5} />
					) : (
						<section
							className="animate-rise rounded-card bg-white p-4 sm:p-5"
							style={{ ["--i" as string]: 3 }}
							aria-live="polite"
						>
							<h2 className="h-section">Review allocation</h2>
							<p className="caption mt-2">{campaign.title}</p>
							<div className="my-5 h-px bg-line" />
							<dl className="flex flex-col gap-4">
								<DetailRow label="Selected beneficiaries" value={chosen.length} />
								<DetailRow label="Selected total" value={usdc(selectedTotal)} />
								<DetailRow
									label="Remaining balance"
									value={<span className={tooMuch ? "text-danger" : undefined}>{usdc(remaining > 0n ? remaining : 0n)}</span>}
								/>
							</dl>
							{tooMuch && (
								<p className="mt-3 text-xs text-danger">
									The new allocations are more than the campaign has unallocated. Fund the campaign or select fewer beneficiaries.
								</p>
							)}
							<Button
								className="mt-6 h-10 w-full"
								disabled={!chosen.length || invalid || tooMuch || batch.running || campaign.status !== "active"}
								isLoading={batch.running}
								loadingText="Executing payments…"
								onClick={() => {
									if (!chosen.length) return toast.info("Select at least one beneficiary");
									void execute();
								}}
							>
								<Wallet /> Execute payment
							</Button>
							<p className="caption mt-3">
								{chosen.length
									? `Your wallet will ask for ${signatures} signature${signatures === 1 ? "" : "s"}: one to lock each group of up to 20 allocations in escrow, then one per payout. Review wallet addresses first.`
									: "Each payment is signed by your wallet. Review wallet addresses before confirming."}
							</p>
						</section>
					)}

					<section className="animate-rise rounded-card bg-white p-4 sm:p-5" style={{ ["--i" as string]: 4 }}>
						<p className="flex items-center gap-2 text-[13px]">
							<svg viewBox="0 0 16 16" className="size-4 text-brand" fill="none" aria-hidden>
								<path
									d="M3 8.5 6.5 12 13 4.5"
									stroke="currentColor"
									strokeWidth="1.6"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							Latest payment confirmation
						</p>
						{latest.isPending ? (
							<div className="shimmer mt-4 h-9 rounded-control" />
						) : confirmed ? (
							<div className="mt-4">
								<Chip tone="success">Completed</Chip>
								<p className="mt-4 text-xs">
									{fixed2(confirmed.amount)} USDC to {confirmed.recipient_reference}
								</p>
								<p className="caption mt-3 mb-1.5">Transaction hash</p>
								<HashBox hash={confirmed.tx_hash} href={confirmed.explorer_url} />
							</div>
						) : (
							<p className="caption mt-3">No payments yet. Confirmed payouts show here with their Stellar transaction.</p>
						)}
					</section>
				</div>
			</div>

			{campaign && <FundDialog open={funding} onOpenChange={setFunding} campaign={campaign} />}
			<BatchDialog
				open={batchOpen}
				onOpenChange={(open) => {
					setBatchOpen(open);
					if (!open) {
						if (batch.summary.confirmed)
							toast.success(`${batch.summary.confirmed} payment${batch.summary.confirmed === 1 ? "" : "s"} confirmed`);
						batch.reset();
					}
				}}
				items={batch.items}
				states={batch.states}
				running={batch.running}
				summary={batch.summary}
				onStop={batch.cancel}
			/>
		</>
	);
}
