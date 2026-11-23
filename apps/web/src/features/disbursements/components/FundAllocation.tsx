"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleDollarSign, Wallet } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import { Chip, DetailRow, StatCard } from "@repo/ui/surface";
import { toStroops } from "@repo/stellar/format";
import type { BeneficiaryRecord, PaymentStatus } from "@repo/stellar/campaign";
import { routes } from "@/lib/routes";
import { fixed2, usdc } from "@/lib/format";
import { useToast } from "@/lib/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { CardSkeleton, EmptyState, ErrorState, StatsSkeleton } from "@/components/states";
import { CountUp, CountUpUsd } from "@/components/Money";
import { HashBox } from "@/components/ExplorerButton";
import { useBeneficiaries } from "@/features/beneficiaries/hooks";
import { useLedger } from "@/features/ledger/hooks";
import { CampaignPicker, useSelectedCampaign } from "@/features/campaigns/components/CampaignPicker";
import { useBatchPayout, type PayoutItem } from "@/features/disbursements/hooks";
import { PAYMENT_STATUS, canPay } from "@/features/disbursements/status";
import { FundDialog } from "@/features/disbursements/components/FundDialog";
import { BatchDialog } from "@/features/disbursements/components/BatchDialog";

const AMOUNT = /^\d+(\.\d{1,7})?$/;

const paymentStatus = (b: BeneficiaryRecord): PaymentStatus => b.allocation?.status ?? "pending_allocation";

/**
 * Screen 4 (Figma "Fund allocation"): balance, available funds and approved beneficiaries; select recipients, set
 * each USDC allocation, review, then "Execute payment" runs the sequential batch. Amounts are checked against the
 * campaign maximum and available funds here and again by the contract.
 */
export function FundAllocation({ reference }: { reference?: string }) {
	const toast = useToast();
	const campaigns = useSelectedCampaign(reference);
	const campaign = campaigns.selected;
	const list = useBeneficiaries(campaign?.id, { status: "approved,allocated", limit: 200 });
	const latest = useLedger({ campaign: campaign?.reference, type: "disbursement", status: "confirmed", limit: 1 }, !!campaign);
	const batch = useBatchPayout(campaign?.id ?? "");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [amounts, setAmounts] = useState<Record<string, string>>({});
	const [funding, setFunding] = useState(false);
	const [batchOpen, setBatchOpen] = useState(false);

	const rows = list.data?.results ?? [];
	const max = campaign ? BigInt(campaign.max_allocation) : 0n;
	const defaultAmount = (b: BeneficiaryRecord) => fixed2(b.allocation && b.allocation.status !== "cancelled" ? b.allocation.amount : (campaign?.max_allocation ?? "0")).replace(/,/g, "");
	const amountOf = (b: BeneficiaryRecord) => amounts[b.id] ?? defaultAmount(b);
	const amountError = (b: BeneficiaryRecord) => {
		const v = amountOf(b);
		if (!AMOUNT.test(v) || toStroops(v) <= 0n) return "Enter an amount";
		if (toStroops(v) > max) return `Max ${fixed2(max)}`;
		return null;
	};

	const payable = rows.filter((b) => canPay(paymentStatus(b)));
	const chosen = payable.filter((b) => selected.has(b.id));
	const selectedTotal = chosen.reduce((sum, b) => sum + (amountError(b) ? 0n : toStroops(amountOf(b))), 0n);
	const t = campaign?.totals;
	const balance = t ? BigInt(t.available) : 0n;
	const unallocated = t ? BigInt(t.available) - BigInt(t.allocated) : 0n;
	const remaining = balance - selectedTotal;
	const invalid = chosen.some((b) => amountError(b));
	const tooMuch = selectedTotal > balance;

	const toggle = (id: string, on: boolean) =>
		setSelected((s) => {
			const next = new Set(s);
			if (on) next.add(id);
			else next.delete(id);
			return next;
		});

	const execute = async () => {
		const items: PayoutItem[] = chosen.map((b) => {
			const amount = amountOf(b);
			const current = b.allocation && b.allocation.status !== "cancelled" ? b.allocation.amount : null;
			return { beneficiaryId: b.id, reference: b.reference, amount, allocate: current === null || BigInt(current) !== toStroops(amount) };
		});
		setBatchOpen(true);
		await batch.run(items);
		setSelected(new Set());
	};

	const columns: Column<BeneficiaryRecord>[] = [
		{
			key: "select",
			header: (
				<Checkbox
					aria-label="Select all payable beneficiaries"
					checked={payable.length > 0 && chosen.length === payable.length ? true : chosen.length ? "indeterminate" : false}
					onCheckedChange={(on) => setSelected(on ? new Set(payable.map((b) => b.id)) : new Set())}
					disabled={!payable.length}
				/>
			),
			className: "w-12",
			mobile: "hide",
			cell: (b) => <Checkbox aria-label={`Select ${b.reference}`} checked={selected.has(b.id)} onCheckedChange={(on) => toggle(b.id, on === true)} disabled={!canPay(paymentStatus(b))} />,
		},
		{
			key: "ref",
			header: "Reference",
			mobile: "title",
			cell: (b) => (
				<label className="flex items-center gap-3 md:contents">
					<span className="md:hidden">
						<Checkbox aria-label={`Select ${b.reference}`} checked={selected.has(b.id)} onCheckedChange={(on) => toggle(b.id, on === true)} disabled={!canPay(paymentStatus(b))} />
					</span>
					{b.reference}
				</label>
			),
		},
		{
			key: "amount",
			header: "USDC allocation",
			className: "w-[180px]",
			cell: (b) => {
				const error = selected.has(b.id) ? amountError(b) : null;
				return (
					<div className="flex flex-col items-end gap-1 md:items-start">
						<input
							aria-label={`USDC allocation for ${b.reference}`}
							inputMode="decimal"
							value={amountOf(b)}
							onChange={(e) => setAmounts((a) => ({ ...a, [b.id]: e.target.value.replace(/[^\d.]/g, "") }))}
							disabled={!canPay(paymentStatus(b))}
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
			cell: (b) => {
				const s = PAYMENT_STATUS[paymentStatus(b)];
				return (
					<span title={b.allocation?.failure_reason ?? s.description}>
						<Chip key={s.label} tone={s.tone} live={s.live} className="animate-pop">
							{s.label}
						</Chip>
					</span>
				);
			},
		},
	];

	const header = (
		<PageHeader
			title="Fund allocation"
			subtitle="Allocate USDC to approved beneficiaries and review payments."
			action={
				campaign && (
					<>
						{campaigns.list.length > 1 && <CampaignPicker list={campaigns.list} selected={campaign} className="w-full sm:w-[280px]" />}
						{(campaign.status === "active" || campaign.status === "funded") && (
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

	return (
		<>
			{header}
			{!t ? (
				<StatsSkeleton count={3} />
			) : (
				<div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
					<StatCard className="animate-rise" label="Campaign balance" value={<CountUpUsd stroops={t.available} cents />} caption="Total funds currently held" tone="review" />
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
						caption="Ready for fund allocation"
						tone="pollen"
					/>
				</div>
			)}

			<div className="mt-8 grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,370px)]">
				<section aria-labelledby="approved" className="min-w-0">
					<h2 id="approved" className="h-section">
						Approved beneficiaries
					</h2>
					<p className="caption mt-2">Select recipients and enter their USDC allocation (max {campaign ? fixed2(campaign.max_allocation) : "—"} each).</p>
					<DataTable
						className="mt-4"
						caption="Approved beneficiaries"
						columns={columns}
						rows={list.data ? rows : undefined}
						rowKey={(b) => b.id}
						isLoading={list.isPending}
						error={list.error}
						onRetry={() => list.refetch()}
						rowClassName={(b) => (selected.has(b.id) ? "bg-page" : undefined)}
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
					{list.data && rows.length > 0 && (
						<p className="mt-4 text-xs">
							{chosen.length} of {payable.length} beneficiaries selected
						</p>
					)}
				</section>

				<div className="flex flex-col gap-3 xl:sticky xl:top-[88px]">
					{!campaign || !t ? (
						<CardSkeleton className="min-h-[260px]" lines={5} />
					) : (
						<section className="animate-rise rounded-card bg-white p-4 sm:p-5" style={{ ["--i" as string]: 3 }} aria-live="polite">
							<h2 className="h-section">Review allocation</h2>
							<p className="caption mt-2">{campaign.title}</p>
							<div className="my-5 h-px bg-line" />
							<dl className="flex flex-col gap-4">
								<DetailRow label="Selected beneficiaries" value={chosen.length} />
								<DetailRow label="Selected total" value={usdc(selectedTotal)} />
								<DetailRow label="Remaining balance" value={<span className={tooMuch ? "text-danger" : undefined}>{usdc(remaining > 0n ? remaining : 0n)}</span>} />
							</dl>
							{tooMuch && <p className="mt-3 text-xs text-danger">The selection is more than the campaign holds. Fund the campaign or select fewer beneficiaries.</p>}
							<Button
								className="mt-6 h-10 w-full"
								disabled={!chosen.length || invalid || tooMuch || batch.running}
								isLoading={batch.running}
								loadingText="Executing payments…"
								onClick={() => {
									if (!chosen.length) return toast.info("Select at least one beneficiary");
									void execute();
								}}
							>
								<Wallet /> Execute payment
							</Button>
							<p className="caption mt-3">Review wallet addresses before confirming. Each payment is signed by your wallet.</p>
						</section>
					)}

					<section className="animate-rise rounded-card bg-white p-4 sm:p-5" style={{ ["--i" as string]: 4 }}>
						<p className="flex items-center gap-2 text-[13px]">
							<svg viewBox="0 0 16 16" className="size-4 text-brand" fill="none" aria-hidden>
								<path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
							Latest payment confirmation
						</p>
						{latest.isPending ? (
							<div className="shimmer mt-4 h-9 rounded-control" />
						) : confirmed ? (
							<div className="mt-4">
								<Chip tone="success">Completed</Chip>
								<p className="mt-4 text-xs">
									{fixed2(confirmed.amount)} USDC to {confirmed.counterparty_ref}
								</p>
								<p className="caption mt-3 mb-1.5">Transaction hash</p>
								<HashBox hash={confirmed.tx_hash} />
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
						if (batch.summary.confirmed) toast.success(`${batch.summary.confirmed} payment${batch.summary.confirmed === 1 ? "" : "s"} confirmed`);
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
