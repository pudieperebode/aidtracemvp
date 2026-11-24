"use client";

import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import { SearchInput } from "@repo/ui/field";
import { Notice } from "@repo/ui/surface";
import { routes } from "@/lib/routes";
import { useNow } from "@/lib/clock";
import { PageHeader } from "@/components/PageHeader";
import { FilterSelect, Pagination } from "@/components/DataTable";
import { useLedger } from "@/features/ledger/hooks";
import { useFreshIds } from "@/features/ledger/fresh";
import { PERIODS, PRIVACY_NOTICE, STATUS_FILTERS, TYPE_FILTERS, periodStart } from "@/features/ledger/status";
import { TransactionsTable } from "@/features/ledger/components/TransactionsTable";

const PAGE = 8;

const asType = (t?: string) => (t === "funding" || t === "disbursement" || t === "recovery" ? t : undefined);
const asStatus = (s?: string) => (s === "confirmed" || s === "pending" || s === "failed" ? s : undefined);

export interface LedgerQuery {
	campaign?: string;
	type?: string;
	status?: string;
	q?: string;
	period?: string;
	page?: number;
}

/**
 * Screen 6 (Figma "Public ledger"): every funding and payment transaction with amounts, statuses, timestamps, hashes
 * linking to Stellar Expert and privacy-safe recipient references. Search and filters live in the URL so a filtered
 * view can be shared.
 */
export function PublicLedger({ query }: { query: LedgerQuery }) {
	const router = useRouter();
	const now = useNow(60_000);
	const page = Math.max(1, query.page ?? 1);
	const ledger = useLedger({
		campaign: query.campaign,
		type: asType(query.type),
		status: asStatus(query.status),
		search: query.q,
		from: periodStart(query.period, now),
		limit: PAGE,
		offset: (page - 1) * PAGE,
	});
	const fresh = useFreshIds(ledger.data?.results);
	const set = (next: Partial<LedgerQuery>) =>
		router.replace(routes.LEDGER({ ...query, page: undefined, ...next }), { scroll: false });
	const filtered = !!(query.campaign || query.type || query.status || query.q || query.period);

	return (
		<>
			<PageHeader title="Public ledger" subtitle="An open record of every contribution and beneficiary payment." />
			<form
				role="search"
				className="animate-rise mb-4 grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap"
				onSubmit={(e) => {
					e.preventDefault();
					set({ q: new FormData(e.currentTarget).get("q")?.toString().trim() || undefined });
				}}
			>
				<SearchInput
					key={query.q ?? ""}
					name="q"
					defaultValue={query.q}
					placeholder="Search hash, reference or campaign"
					aria-label="Search by transaction hash, campaign or recipient reference, or campaign title"
					className="sm:col-span-2 lg:w-[290px]"
				/>
				<FilterSelect
					label="Type"
					value={query.type ?? ""}
					onChange={(v) => set({ type: v || undefined })}
					options={TYPE_FILTERS}
					className="lg:w-[175px]"
				/>
				<FilterSelect
					label="Status"
					value={query.status ?? ""}
					onChange={(v) => set({ status: v || undefined })}
					options={STATUS_FILTERS}
					className="lg:w-[175px]"
				/>
				<FilterSelect
					label="Period"
					value={query.period ?? ""}
					onChange={(v) => set({ period: v || undefined })}
					options={PERIODS}
					className="sm:col-span-2 lg:w-[175px]"
				/>
				{filtered && (
					<Button type="button" variant="ghost" className="h-10" onClick={() => router.replace(routes.LEDGER())}>
						Clear
					</Button>
				)}
			</form>

			{query.campaign && (
				<p className="caption mb-3">
					Showing campaign <span className="text-ink">{query.campaign}</span>
				</p>
			)}

			<TransactionsTable
				variant="ledger"
				rows={ledger.data?.results}
				isLoading={ledger.isPending}
				error={ledger.error}
				onRetry={() => ledger.refetch()}
				freshIds={fresh}
				emptyTitle={filtered ? "No transactions to display" : "No transactions yet"}
				emptyBody={
					filtered
						? "Try a different search, type, status or period."
						: "Funding and payouts will appear here as soon as they're submitted to Stellar."
				}
			/>
			<p className="caption mt-3">
				Pending and failed rows are attempts submitted to Stellar. A failed one moved no funds, and totals count confirmed
				transactions only.
			</p>
			{ledger.data && (
				<Pagination
					total={ledger.data.total}
					limit={PAGE}
					offset={(page - 1) * PAGE}
					onPage={(offset) => router.replace(routes.LEDGER({ ...query, page: offset / PAGE + 1 }), { scroll: false })}
				/>
			)}

			<Notice tone="info" title="Privacy-safe by design" className="mt-8">
				{PRIVACY_NOTICE} Recipients appear only as a random allocation reference (ALC-…), and anyone can verify these payments
				independently on Stellar Expert.
			</Notice>
		</>
	);
}
