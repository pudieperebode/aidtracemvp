"use client";

import { Chip } from "@repo/ui/surface";
import type { LedgerEntry } from "@repo/stellar/campaign";
import { fixed2, utcDateTime } from "@/lib/format";
import { DataTable, type Column } from "@/components/DataTable";
import { HashLink } from "@/components/ExplorerButton";
import { EmptyState } from "@/components/states";
import { TX_STATUS, TX_TYPE } from "@/features/ledger/status";

/** Confirmed payments read "Paid", confirmed donations "Completed" (as in the design); pending / failed attempts say so. */
export function TxStatusChip({ entry }: { entry: LedgerEntry }) {
	const s = TX_STATUS[entry.status];
	return (
		<span title={entry.status === "failed" ? `No funds moved${entry.failure_code ? ` (${entry.failure_code})` : ""}` : undefined}>
			<Chip tone={s.tone} live={s.live}>
				{entry.status === "confirmed" ? TX_TYPE[entry.type].done : s.label}
			</Chip>
		</span>
	);
}

/** Signed amount: inflows "+2,500.00", outflows "-250.00". */
export const signedAmount = (e: LedgerEntry) => `${e.type === "funding" ? "+" : "-"}${fixed2(e.amount)}`;

const recipient = (e: LedgerEntry) =>
	e.type === "funding" ? "Campaign escrow" : e.type === "recovery" ? "Organization wallet" : (e.recipient_reference ?? "—");

/**
 * Transaction history table (Campaign dashboard "Latest transactions" and Reports "Transaction history"):
 * timestamp, type, reference, signed amount, status. `variant="ledger"` adds the hash + recipient columns of
 * Screen 6. Recipients appear only by a random allocation reference, never a name.
 */
export function TransactionsTable({
	rows,
	isLoading,
	error,
	onRetry,
	variant = "history",
	emptyTitle = "No transactions yet",
	emptyBody = "Funding and payments will appear here once they're submitted to Stellar.",
	freshIds,
}: {
	rows: LedgerEntry[] | undefined;
	isLoading?: boolean;
	error?: unknown;
	onRetry?: () => void;
	variant?: "history" | "ledger";
	emptyTitle?: string;
	emptyBody?: string;
	/** Rows that just arrived: they flash once. */
	freshIds?: Set<string>;
}) {
	const history: Column<LedgerEntry>[] = [
		{
			key: "time",
			header: "Timestamp",
			cell: (e) => <span className="tabular-nums">{utcDateTime(e.timestamp)}</span>,
			mobile: "title",
		},
		{ key: "type", header: "Type", cell: (e) => TX_TYPE[e.type].label },
		{
			key: "ref",
			header: "Reference",
			cell: (e) => (e.type === "disbursement" ? (e.recipient_reference ?? "—") : e.campaign_reference),
		},
		{
			key: "amount",
			header: "Amount (USDC)",
			cell: (e) => (
				<span className={e.status === "failed" ? "text-muted line-through tabular-nums" : "tabular-nums"}>{signedAmount(e)}</span>
			),
		},
		{ key: "status", header: "Status", cell: (e) => <TxStatusChip entry={e} /> },
	];

	const ledger: Column<LedgerEntry>[] = [
		{ key: "campaign", header: "Campaign ref.", cell: (e) => e.campaign_reference, mobile: "title" },
		{ key: "type", header: "Type", cell: (e) => TX_TYPE[e.type].label },
		{
			key: "amount",
			header: "USDC amount",
			cell: (e) => (
				<span className={e.status === "failed" ? "text-muted line-through tabular-nums" : "tabular-nums"}>
					{fixed2(e.amount)}
				</span>
			),
		},
		{ key: "status", header: "Status", cell: (e) => <TxStatusChip entry={e} /> },
		{
			key: "time",
			header: "Timestamp",
			cell: (e) => <span className="whitespace-nowrap tabular-nums">{utcDateTime(e.timestamp)}</span>,
		},
		{
			key: "hash",
			header: "Transaction hash",
			cell: (e) =>
				e.explorer_url || e.status !== "failed" ? (
					<HashLink hash={e.tx_hash} href={e.explorer_url} />
				) : (
					<span className="caption font-mono">Not on a ledger</span>
				),
		},
		{ key: "recipient", header: "Recipient ref.", cell: recipient },
	];

	return (
		<DataTable
			columns={variant === "ledger" ? ledger : history}
			rows={rows}
			rowKey={(e) => e.id}
			isLoading={isLoading}
			error={error}
			onRetry={onRetry}
			caption="Transactions"
			className="mt-4"
			rowClassName={(e) => (freshIds?.has(e.id) ? "animate-record" : undefined)}
			empty={
				<EmptyState title={emptyTitle} icon="search">
					{emptyBody}
				</EmptyState>
			}
		/>
	);
}
