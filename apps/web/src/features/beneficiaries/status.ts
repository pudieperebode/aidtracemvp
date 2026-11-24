import type { ChipTone } from "@repo/ui/surface";
import type { Beneficiary, BeneficiaryStage } from "@repo/stellar/campaign";

/** Deliverable 1 "Recommended approval workflow", with the design's chip colours. The only place this copy lives. */
export const BENEFICIARY_STATUS: Record<BeneficiaryStage, { label: string; tone: ChipTone; meaning: string }> = {
	registered: { label: "Pending", tone: "pending", meaning: "Application submitted, waiting for review" },
	under_review: { label: "Under review", tone: "review", meaning: "Eligibility being assessed" },
	approved: { label: "Approved", tone: "success", meaning: "Eligible to receive allocated funds" },
	rejected: { label: "Rejected", tone: "warning", meaning: "Application did not meet requirements" },
	allocated: { label: "Allocated", tone: "neutral", meaning: "Funding amount assigned" },
	paid: { label: "Paid", tone: "success", meaning: "Approved disbursement completed" },
};

/** The backend filters by review state only. */
export const BENEFICIARY_FILTERS: { value: string; label: string }[] = [
	{ value: "", label: "All statuses" },
	{ value: "registered", label: "Pending" },
	{ value: "under_review", label: "Under review" },
	{ value: "approved", label: "Approved" },
	{ value: "rejected", label: "Rejected" },
];

/** What the chip shows, from the row's own allocation. "Paid" only from a backend-confirmed payout. */
export function stageOf(b: Beneficiary): BeneficiaryStage {
	if (b.status !== "approved" || !b.allocation) return b.status;
	return b.allocation.status === "confirmed" ? "paid" : "allocated";
}

/**
 * Review actions by state (`registered → start review → under review → approve | reject`; a decision can be reopened
 * while the beneficiary has no live or paid allocation).
 */
export const reviewActions = (b: Beneficiary) => ({
	startReview: b.status === "registered",
	decide: b.status === "under_review",
	reopen: (b.status === "approved" || b.status === "rejected") && !b.allocation,
});
