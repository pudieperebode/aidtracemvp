"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Download, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Chip, Notice, StatCard } from "@repo/ui/surface";
import type { ReconciliationPayout } from "@repo/stellar/campaign";
import { routes } from "@/lib/routes";
import { errorMessage, retryAfter } from "@/lib/api/errors";
import { fixed2, isoDay, utcDateTime } from "@/lib/format";
import { useNow } from "@/lib/clock";
import { useToast } from "@/lib/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, FilterSelect, Pagination, type Column } from "@/components/DataTable";
import { EmptyState, ErrorState, StatsSkeleton } from "@/components/states";
import { CountUp, CountUpUsd } from "@/components/Money";
import { HashLink } from "@/components/ExplorerButton";
import { CampaignPicker, useSelectedCampaign } from "@/features/campaigns/components/CampaignPicker";
import { useLedger } from "@/features/ledger/hooks";
import { PERIODS, TYPE_FILTERS, periodStart } from "@/features/ledger/status";
import { TransactionsTable } from "@/features/ledger/components/TransactionsTable";
import { useDownloadReport, useReconcile } from "@/features/reports/hooks";

const PAGE = 8;

export interface ReportsQuery {
	campaign?: string;
	period?: string;
	type?: string;
	page?: number;
}

const asType = (t?: string) => (t === "funding" || t === "disbursement" || t === "recovery" ? t : undefined);

/**
 * Screen 7 (Figma "Reports"), per campaign: inflows, outflows, available balance and beneficiary payments;
 * filterable transaction history; an on-demand reconciliation against Stellar; and the backend's CSV export
 * (allocation references only, never names).
 */
export function Reports({ query }: { query: ReportsQuery }) {
	const router = useRouter();
	const toast = useToast();
	const now = useNow(60_000);
	const campaigns = useSelectedCampaign(query.campaign);
	const mine = campaigns.list.filter((c) => c.status !== "draft");
	const campaign = campaigns.selected?.status === "draft" ? mine[0] : campaigns.selected;
	const t = campaign?.totals;
	const page = Math.max(1, query.page ?? 1);
	const history = useLedger(
		{
			campaign: campaign?.reference,
			type: asType(query.type),
			from: periodStart(query.period, now),
			limit: PAGE,
			offset: (page - 1) * PAGE,
		},
		!!campaign,
	);
	const csv = useDownloadReport(campaign?.reference);
	const set = (next: Partial<ReportsQuery>) =>
		router.replace(routes.REPORTS({ ...query, page: undefined, ...next }), { scroll: false });

	const exportCsv = () =>
		csv.mutate(`aidtrace-report-${campaign!.reference}-${isoDay(now)}.csv`, {
			onSuccess: () =>
				toast.success("Report downloaded", {
					description: "Allocation references only. Beneficiary names and documents are never included.",
				}),
			onError: (error) => {
				const wait = retryAfter(error);
				toast.error("Couldn't download the report", {
					description: wait ? `Too many exports. Try again in ${wait} s.` : errorMessage(error),
				});
			},
		});

	return (
		<>
			<PageHeader
				title="Reports"
				subtitle="Monitor campaign inflows, outflows and beneficiary payments."
				action={
					<>
						{mine.length > 1 && campaign && <CampaignPicker list={mine} selected={campaign} className="w-full sm:w-[300px]" />}
						<Button
							onClick={exportCsv}
							isLoading={csv.isPending}
							loadingText="Preparing CSV…"
							disabled={!campaign}
							className="h-10"
						>
							<Download /> Download CSV
						</Button>
					</>
				}
			/>

			{campaigns.error ? (
				<div className="rounded-card bg-white">
					<ErrorState error={campaigns.error} onRetry={() => campaigns.refetch()} />
				</div>
			) : campaigns.isPending ? (
				<StatsSkeleton />
			) : !campaign || !t ? (
				<div className="rounded-card bg-white">
					<EmptyState
						title="No report activity yet"
						action={
							<Button asChild size="sm">
								<Link href={routes.CREATE_CAMPAIGN}>Create campaign</Link>
							</Button>
						}
					>
						Reports cover your published campaigns. Create one to start tracking inflows and payouts.
					</EmptyState>
				</div>
			) : (
				<>
					<p className="caption mb-3">
						{campaign.reference} · {campaign.title}
					</p>
					<div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
						<StatCard
							className="animate-rise"
							label="Total inflows"
							value={<CountUpUsd stroops={t.raised} />}
							caption="All funding confirmed on Stellar"
							tone="review"
						/>
						<StatCard
							className="animate-rise"
							style={{ ["--i" as string]: 1 }}
							label="Total outflows"
							value={<CountUpUsd stroops={t.disbursed} />}
							caption="All disbursements completed"
							tone="accent"
						/>
						<StatCard
							className="animate-rise"
							style={{ ["--i" as string]: 2 }}
							label="Available balance"
							value={<CountUpUsd stroops={t.available} />}
							caption={BigInt(t.recovered) > 0n ? `${fixed2(t.recovered)} USDC recovered` : "USDC currently in escrow"}
							tone="pollen"
						/>
						<StatCard
							className="animate-rise"
							style={{ ["--i" as string]: 3 }}
							label="Beneficiary payments"
							value={<CountUp value={t.beneficiaries_paid} />}
							caption="Paid directly to beneficiaries"
							tone="ink"
						/>
					</div>

					<section aria-labelledby="history" className="mt-8">
						<h2 id="history" className="h-section">
							Transaction history
						</h2>
						<p className="caption mt-2">
							A complete record of campaign financial activity, including pending and failed attempts.
						</p>
						<div className="mt-4 flex flex-col gap-2 sm:flex-row">
							<FilterSelect
								label="Period"
								value={query.period ?? ""}
								onChange={(v) => set({ period: v || undefined })}
								options={PERIODS}
								className="sm:w-[150px]"
							/>
							<FilterSelect
								label="Transaction type"
								value={query.type ?? ""}
								onChange={(v) => set({ type: v || undefined })}
								options={TYPE_FILTERS.map((o) => (o.value ? o : { ...o, label: "All transaction types" }))}
								className="sm:w-[200px]"
							/>
						</div>
						<TransactionsTable
							rows={history.data?.results}
							isLoading={history.isPending}
							error={history.error}
							onRetry={() => history.refetch()}
							emptyTitle="No report activity yet"
							emptyBody="Nothing in this period. Try a longer period or another transaction type."
						/>
						{history.data && (
							<Pagination
								total={history.data.total}
								limit={PAGE}
								offset={(page - 1) * PAGE}
								onPage={(offset) => router.replace(routes.REPORTS({ ...query, page: offset / PAGE + 1 }), { scroll: false })}
							/>
						)}
					</section>

					<ReconciliationSection key={campaign.reference} reference={campaign.reference} />
				</>
			)}
		</>
	);
}

/** The on-demand check, per campaign (keyed by reference so a result never shows under another campaign). */
function ReconciliationSection({ reference }: { reference: string }) {
	const reconcile = useReconcile(reference);
	const result = reconcile.data;
	const unmatched = result?.payouts.filter((p) => !p.matched) ?? [];
	const reconColumns: Column<ReconciliationPayout>[] = [
		{ key: "ref", header: "Allocation ref.", cell: (p) => p.allocation_reference, mobile: "title" },
		{ key: "amount", header: "Amount (USDC)", cell: (p) => <span className="tabular-nums">{fixed2(p.amount)}</span> },
		{
			key: "hash",
			header: "Transaction",
			cell: (p) => (p.tx_hash ? <HashLink hash={p.tx_hash} /> : <span className="caption">—</span>),
		},
		{ key: "issue", header: "Issue", cell: (p) => <Chip tone="danger">{p.issue ?? "Mismatch"}</Chip> },
	];

	return (
		<section aria-labelledby="recon" className="mt-10">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 id="recon" className="h-section">
						Financial reconciliation
					</h2>
					<p className="caption mt-2">Checks every confirmed payout, ledger entry and open escrow balance against Stellar.</p>
				</div>
				<Button
					variant="outline"
					className="bg-white"
					onClick={() => reconcile.mutate()}
					isLoading={reconcile.isPending}
					loadingText="Checking Stellar…"
				>
					<ShieldCheck /> {result ? "Run again" : "Run reconciliation"}
				</Button>
			</div>
			<div className="mt-4">
				{reconcile.error ? (
					<Notice tone="error" title="Reconciliation didn't run">
						{retryAfter(reconcile.error)
							? `Too many checks. Try again in ${retryAfter(reconcile.error)} s.`
							: errorMessage(reconcile.error)}
					</Notice>
				) : !result ? (
					<div className="rounded-card bg-white">
						<EmptyState title="Not checked yet" icon="search">
							Run a reconciliation to match this campaign&apos;s payouts and balances with what is actually on Stellar.
						</EmptyState>
					</div>
				) : result.reconciled ? (
					<Notice tone="success" title="Verified on Stellar" icon={<CheckCircle2 className="size-4" aria-hidden />}>
						{result.payouts.length} confirmed payout{result.payouts.length === 1 ? "" : "s"} matched, with the ledger and escrow
						balances. Checked {utcDateTime(result.checked_at)}.
					</Notice>
				) : (
					<>
						<Notice
							tone="warning"
							title={`${unmatched.length} payout${unmatched.length === 1 ? "" : "s"} didn't match`}
							icon={<TriangleAlert className="size-4" aria-hidden />}
						>
							Checked {utcDateTime(result.checked_at)}. Review these with your team before reporting totals.
						</Notice>
						<DataTable
							className="mt-4"
							caption="Unmatched payouts"
							columns={reconColumns}
							rows={unmatched}
							rowKey={(p) => p.allocation_reference}
							empty={null}
						/>
					</>
				)}
			</div>
		</section>
	);
}
