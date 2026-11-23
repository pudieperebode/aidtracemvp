import type { ChipTone } from "@repo/ui/surface";
import type { LedgerTxType, TxStatus } from "@repo/stellar/campaign";

/** The design calls funding "Donation" and disbursements "Payment". */
export const TX_TYPE: Record<LedgerTxType, { label: string }> = {
	funding: { label: "Donation" },
	disbursement: { label: "Payment" },
};

export const TX_STATUS: Record<TxStatus, { label: string; tone: ChipTone; live?: boolean }> = {
	pending: { label: "Pending", tone: "pending" },
	processing: { label: "Processing", tone: "warning", live: true },
	confirmed: { label: "Completed", tone: "success" },
	failed: { label: "Failed", tone: "danger" },
};

export const TYPE_FILTERS = [
	{ value: "", label: "Type: All" },
	{ value: "funding", label: "Donations" },
	{ value: "disbursement", label: "Payments" },
];

export const STATUS_FILTERS = [
	{ value: "", label: "Status: All" },
	{ value: "confirmed", label: "Completed" },
	{ value: "pending", label: "Pending" },
	{ value: "failed", label: "Failed" },
];

/** Date ranges for the ledger and reports ("01 Aug – 31 Aug 2025" in the design). */
export const PERIODS = [
	{ value: "", label: "All time" },
	{ value: "7d", label: "Last 7 days" },
	{ value: "30d", label: "Last 30 days" },
	{ value: "month", label: "This month" },
] as const;

export function periodStart(period: string | undefined, now: number): string | undefined {
	if (period === "7d") return new Date(now - 7 * 86_400_000).toISOString();
	if (period === "30d") return new Date(now - 30 * 86_400_000).toISOString();
	if (period === "month") {
		const d = new Date(now);
		return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
	}
	return undefined;
}
