import type { ChipTone } from "@repo/ui/surface";
import type { PaymentStatus } from "@repo/stellar/campaign";

/** Deliverable 2 "Payment lifecycle", with the design's chip colours. The only place this copy lives. */
export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: ChipTone; description: string; live?: boolean }> = {
	pending_allocation: { label: "Pending", tone: "pending", description: "Approved but not yet assigned funds" },
	allocated: {
		label: "Allocated",
		tone: "neutral",
		description: "Funding amount assigned; locks into escrow when you execute payment",
	},
	ready: { label: "Ready", tone: "review", description: "Funds locked in escrow for this beneficiary, ready for payment" },
	processing: { label: "Processing", tone: "warning", description: "Transaction submitted", live: true },
	confirmed: { label: "Paid", tone: "success", description: "Stellar transaction confirmed" },
	failed: {
		label: "Failed",
		tone: "danger",
		description: "Transaction unsuccessful. No funds moved; retry the payout or cancel it.",
	},
	cancelled: { label: "Cancelled", tone: "neutral", description: "Unpaid allocation cancelled by an authorized administrator" },
};

/** Execute payment covers new allocations, locking and payout; only paid or in-flight ones are excluded. */
export const canPay = (status: PaymentStatus) => status !== "confirmed" && status !== "processing";

/** Unpaid allocations can be cancelled (a locked one needs a signature to return its funds to the pool). */
export const canCancel = (status: PaymentStatus) => status === "allocated" || status === "ready" || status === "failed";
