"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Download, TriangleAlert } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Chip, StatCard } from "@repo/ui/surface";
import type { CampaignTotals, ReconciliationRow } from "@repo/stellar/campaign";
import { routes } from "@/lib/routes";
import { api } from "@/lib/api/client";
import { listLedger } from "@/lib/api/endpoints";
import { errorMessage } from "@/lib/api/errors";
import { fixed2, isoDay } from "@/lib/format";
import { useNow } from "@/lib/clock";
import { useToast } from "@/lib/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, FilterSelect, Pagination, type Column } from "@/components/DataTable";
import { EmptyState, ErrorState, StatsSkeleton } from "@/components/states";
import { CountUp, CountUpUsd } from "@/components/Money";
import { HashLink } from "@/components/ExplorerButton";
import { useCampaigns } from "@/features/campaigns/hooks";
import { useLedger } from "@/features/ledger/hooks";
import { PERIODS, TYPE_FILTERS, periodStart } from "@/features/ledger/status";
import { TransactionsTable } from "@/features/ledger/components/TransactionsTable";
import { useReconciliation } from "@/features/reports/hooks";
import { campaignReportCsv, downloadCsv } from "@/features/reports/csv";

const PAGE = 8;

export interface ReportsQuery {
	campaign?: string;
	period?: string;
	type?: string;
	page?: number;
}

const sum = (list: CampaignTotals[]): CampaignTotals =>
	list.reduce(
		(a, t) => ({
			target: (BigInt(a.target) + BigInt(t.target)).toString(),
			raised: (BigInt(a.raised) + BigInt(t.raised)).toString(),
			allocated: (BigInt(a.allocated) + BigInt(t.allocated)).toString(),
			disbursed: (BigInt(a.disbursed) + BigInt(t.disbursed)).toString(),
			available: (BigInt(a.available) + BigInt(t.available)).toString(),
			beneficiaries_approved: a.beneficiaries_approved + t.beneficiaries_approved,
			beneficiaries_paid: a.beneficiaries_paid + t.beneficiaries_paid,
		}),
		{ target: "0", raised: "0", allocated: "0", disbursed: "0", available: "0", beneficiaries_approved: 0, beneficiaries_paid: 0 },
	);

/**
 * Screen 7 (Figma "Reports"): inflows, outflows, available balance and beneficiary payments for one campaign or all of
 * the organization's campaigns; filterable transaction history; reconciliation of allocations against confirmed
 * payouts; and a CSV export with only public-safe fields.
 */
export function Reports({ query }: { query: ReportsQuery }) {
	const router = useRouter();
	const toast = useToast();
	const now = useNow(60_000);
	const campaigns = useCampaigns();
	const mine = (campaigns.data?.results ?? []).filter((c) => c.status !== "draft");
	const campaign = query.campaign ? mine.find((c) => c.reference === query.campaign) : undefined;
	const scope = campaign ? [campaign] : mine;
	const totals = campaigns.data ? sum(scope.map((c) => c.totals)) : undefined;
	const page = Math.max(1, query.page ?? 1);
	const from = periodStart(query.period, now);
	const history = useLedger({ campaign: campaign?.reference, type: query.type, from, limit: PAGE, offset: (page - 1) * PAGE }, !!campaigns.data);
	const recon = useReconciliation(campaign?.id);
	const [exporting, setExporting] = useState(false);
	const set = (next: Partial<ReportsQuery>) => router.replace(routes.REPORTS({ ...query, page: undefined, ...next }), { scroll: false });

	const exportCsv = async () => {
		setExporting(true);
		try {
			const rows = (await Promise.all(scope.map((c) => listLedger(api, { campaign: c.reference, type: query.type, from, limit: 500 })))).flatMap((p) => p.results);
			rows.sort((a, b) => b.timestamp - a.timestamp);
			const label = campaign ? `${campaign.reference} · ${campaign.title}` : "All campaigns";
			downloadCsv(`aidtrace-report-${campaign?.reference ?? "all"}-${isoDay(now)}.csv`, campaignReportCsv(label, totals!, rows, recon.data ?? []));
			toast.success("Report downloaded", { description: `${rows.length} transactions. Beneficiary names and documents are never included.` });
		} catch (error) {
			toast.error("Couldn't build the report", { description: errorMessage(error) });
		} finally {
			setExporting(false);
		}
	};

	const reconColumns: Column<ReconciliationRow>[] = [
		{ key: "ref", header: "Beneficiary ref.", cell: (r) => r.beneficiary_reference, mobile: "title" },
		{ key: "allocated", header: "Allocated (USDC)", cell: (r) => <span className="tabular-nums">{fixed2(r.allocated)}</span> },
		{ key: "paid", header: "Paid on chain (USDC)", cell: (r) => <span className="tabular-nums">{fixed2(r.paid)}</span> },
		{ key: "hash", header: "Transaction", cell: (r) => (r.tx_hash ? <HashLink hash={r.tx_hash} /> : <span className="caption">Not paid yet</span>) },
		{
			key: "match",
			header: "Reconciled",
			cell: (r) =>
				r.matched ? (
					<Chip tone="success">{BigInt(r.paid) > 0n ? "Matched" : "Awaiting payout"}</Chip>
				) : (
					<Chip tone="danger">Mismatch</Chip>
				),
		},
	];
	const reconciled = recon.data?.filter((r) => r.matched).length ?? 0;

	return (
		<>
			<PageHeader
				title="Reports"
				subtitle="Monitor campaign inflows, outflows and beneficiary payments."
				action={
					<Button onClick={exportCsv} isLoading={exporting} loadingText="Preparing CSV…" disabled={!totals} className="h-10">
						<Download /> Download CSV
					</Button>
				}
			/>

			{campaigns.error ? (
				<div className="rounded-card bg-white">
					<ErrorState error={campaigns.error} onRetry={() => campaigns.refetch()} />
				</div>
			) : !totals ? (
				<StatsSkeleton />
			) : mine.length === 0 ? (
				<div className="rounded-card bg-white">
					<EmptyState
						title="No report activity yet"
						action={
							<Button asChild size="sm">
								<Link href={routes.CREATE_CAMPAIGN}>Create campaign</Link>
							</Button>
						}
					>
						Reports cover your registered campaigns. Create one to start tracking inflows and payouts.
					</EmptyState>
				</div>
			) : (
				<>
					<FilterSelect
						label="Campaign"
						className="mb-4 sm:w-[340px]"
						value={campaign?.reference ?? ""}
						onChange={(v) => set({ campaign: v || undefined })}
						options={[{ value: "", label: "All campaigns" }, ...mine.map((c) => ({ value: c.reference, label: `${c.reference} · ${c.title}` }))]}
					/>
					<div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
						<StatCard className="animate-rise" label="Total inflows" value={<CountUpUsd stroops={totals.raised} />} caption="All contributions received" tone="review" />
						<StatCard className="animate-rise" style={{ ["--i" as string]: 1 }} label="Total outflows" value={<CountUpUsd stroops={totals.disbursed} />} caption="All disbursements completed" tone="accent" />
						<StatCard className="animate-rise" style={{ ["--i" as string]: 2 }} label="Available balance" value={<CountUpUsd stroops={totals.available} />} caption="USDC currently available" tone="pollen" />
						<StatCard
							className="animate-rise"
							style={{ ["--i" as string]: 3 }}
							label="Beneficiary payments"
							value={<CountUp value={totals.beneficiaries_paid} />}
							caption="Paid directly to beneficiaries"
							tone="ink"
						/>
					</div>

					<section aria-labelledby="history" className="mt-8">
						<h2 id="history" className="h-section">
							Transaction history
						</h2>
						<p className="caption mt-2">A complete record of campaign financial activity.</p>
						<div className="mt-4 flex flex-col gap-2 sm:flex-row">
							<FilterSelect label="Period" value={query.period ?? ""} onChange={(v) => set({ period: v || undefined })} options={PERIODS} className="sm:w-[150px]" />
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
							<Pagination total={history.data.total} limit={PAGE} offset={(page - 1) * PAGE} onPage={(offset) => router.replace(routes.REPORTS({ ...query, page: offset / PAGE + 1 }), { scroll: false })} />
						)}
					</section>

					<section aria-labelledby="recon" className="mt-10">
						<div className="flex flex-wrap items-end justify-between gap-3">
							<div>
								<h2 id="recon" className="h-section">
									Financial reconciliation
								</h2>
								<p className="caption mt-2">Allocations matched against payouts confirmed on Stellar.</p>
							</div>
							{campaign && recon.data && recon.data.length > 0 && (
								<p className="flex items-center gap-2 text-xs">
									{reconciled === recon.data.length ? (
										<CheckCircle2 className="size-4 text-brand" aria-hidden />
									) : (
										<TriangleAlert className="size-4 text-accent" aria-hidden />
									)}
									{reconciled} of {recon.data.length} allocations reconciled
								</p>
							)}
						</div>
						{campaign ? (
							<DataTable
								className="mt-4"
								caption="Reconciliation"
								columns={reconColumns}
								rows={recon.data?.slice(0, 50)}
								rowKey={(r) => r.beneficiary_reference}
								isLoading={recon.isPending}
								error={recon.error}
								onRetry={() => recon.refetch()}
								empty={<EmptyState title="Nothing to reconcile yet">Allocations and payouts will be matched here.</EmptyState>}
							/>
						) : (
							<div className="mt-4 rounded-card bg-white">
								<EmptyState title="Choose a campaign" icon="search">
									Reconciliation runs per campaign. Pick one above to match its allocations with confirmed payouts.
								</EmptyState>
							</div>
						)}
					</section>
				</>
			)}
		</>
	);
}
