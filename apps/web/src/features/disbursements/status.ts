import type { ChipTone } from "@repo/ui/surface";
import type { PaymentStatus } from "@repo/stellar/campaign";

/** Deliverable 2 "Payment lifecycle", with the design's chip colours. The only place this copy lives. */
export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: ChipTone; description: string; live?: boolean }> = {
	pending_allocation: { label: "Pending", tone: "pending", description: "Approved but not yet assigned funds" },
	allocated: { label: "Allocated", tone: "neutral", description: "Funding amount assigned" },
	ready: { label: "Ready", tone: "review", description: "Allocation authorized and funds available" },
	processing: { label: "Processing", tone: "warning", description: "Transaction submitted", live: true },
	confirmed: { label: "Paid", tone: "success", description: "Stellar transaction confirmed" },
	failed: { label: "Failed", tone: "danger", description: "Transaction unsuccessful. No funds were deducted from the campaign." },
	cancelled: { label: "Cancelled", tone: "neutral", description: "Unpaid allocation cancelled by an authorized administrator" },
};

/** A payout can be executed for an unpaid, uncancelled allocation; the contract enforces the same rule. */
export const canPay = (status: PaymentStatus) => status !== "confirmed" && status !== "processing";
