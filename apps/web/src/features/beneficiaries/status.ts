import type { ChipTone } from "@repo/ui/surface";
import type { BeneficiaryStatus } from "@repo/stellar/campaign";

/** Deliverable 1 "Recommended approval workflow", with the design's chip colours. The only place this copy lives. */
export const BENEFICIARY_STATUS: Record<BeneficiaryStatus, { label: string; tone: ChipTone; meaning: string }> = {
	registered: { label: "Pending", tone: "pending", meaning: "Application submitted, waiting for review" },
	under_review: { label: "Under review", tone: "review", meaning: "Eligibility being assessed" },
	approved: { label: "Approved", tone: "success", meaning: "Eligible to receive allocated funds" },
	rejected: { label: "Rejected", tone: "warning", meaning: "Application did not meet requirements" },
	allocated: { label: "Allocated", tone: "neutral", meaning: "Funding amount assigned" },
	paid: { label: "Paid", tone: "success", meaning: "Approved disbursement completed" },
};

export const BENEFICIARY_FILTERS: { value: string; label: string }[] = [
	{ value: "", label: "All statuses" },
	{ value: "registered", label: "Pending" },
	{ value: "under_review", label: "Under review" },
	{ value: "approved", label: "Approved" },
	{ value: "allocated", label: "Allocated" },
	{ value: "paid", label: "Paid" },
	{ value: "rejected", label: "Rejected" },
];

/** Review actions are available while an application is pending or under review. */
export const canReview = (status: BeneficiaryStatus) => status === "registered" || status === "under_review";
