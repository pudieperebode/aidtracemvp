import type { ChipTone } from "@repo/ui/surface";
import type { LedgerTxType, TxStatus } from "@repo/stellar/campaign";

/** The design calls funding "Donation" and disbursements "Payment"; a confirmed one reads `done`. */
export const TX_TYPE: Record<LedgerTxType, { label: string; done: string }> = {
	funding: { label: "Donation", done: "Completed" },
	disbursement: { label: "Payment", done: "Paid" },
	recovery: { label: "Recovery", done: "Returned" },
};

/** Pending and failed rows are attempts submitted to Stellar. A failed one moved no funds; totals count confirmed rows only. */
export const TX_STATUS: Record<TxStatus, { label: string; tone: ChipTone; live?: boolean }> = {
	confirmed: { label: "Completed", tone: "success" },
	pending: { label: "Pending", tone: "warning", live: true },
	failed: { label: "Failed", tone: "danger" },
};

export const STATUS_FILTERS = [
	{ value: "", label: "Status: All" },
	{ value: "confirmed", label: "Completed" },
	{ value: "pending", label: "Pending" },
	{ value: "failed", label: "Failed" },
];

export const TYPE_FILTERS = [
	{ value: "", label: "Type: All" },
	{ value: "funding", label: "Donations" },
	{ value: "disbursement", label: "Payments" },
	{ value: "recovery", label: "Recoveries" },
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

/** The PRD §7 privacy limitation, in the backend guide's words. Shown on every public ledger view. */
export const PRIVACY_NOTICE =
	"Names and personal details are never published, but Stellar payments and wallet addresses are publicly visible.";
