/**
 * The AidTrace UI data model, shared by every app. Field names are snake_case and amounts are stroop strings
 * (7 decimals, as integers) so money never passes through floating point; timestamps are unix seconds.
 * The backend's own shapes live in each app's `lib/api/dto.ts` and are adapted into these.
 *
 * Privacy (PRD §3, §7): anything typed `Public*` (and `LedgerEntry`) may be shown to anonymous visitors and
 * exported in public CSVs. Names, contact details and eligibility evidence exist only on `BeneficiaryRecord`, which
 * only an authorized organization administrator can load (and every load is logged by the backend). List rows
 * (`Beneficiary`) carry no personal details. Never widen a public type with those fields.
 */

/** Stroop amount as a decimal integer string ("1000000000" = 100 USDC). */
export type Stroops = string;
/** Unix seconds. */
export type Timestamp = number;
/** Stellar account address (G…). */
export type Address = string;

// ---------------------------------------------------------------------------------------------------------------
// Statuses (PRD tables, as the backend names them). Labels, tones and copy live in the web app's `features/*/status.ts`.
// ---------------------------------------------------------------------------------------------------------------

export const CAMPAIGN_STATUSES = ["draft", "active", "closed", "cancelled"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** What to show: `funded` = still active and the funding target is reached (the backend's `displayStatus`). */
export type CampaignDisplayStatus = CampaignStatus | "funded";

/** Deliverable 1, "Recommended approval workflow": the review states the backend stores. */
export const BENEFICIARY_STATUSES = ["registered", "under_review", "approved", "rejected"] as const;
export type BeneficiaryStatus = (typeof BENEFICIARY_STATUSES)[number];

/**
 * What the beneficiary chip shows: the review state, or (once approved) Allocated / Paid, derived from the
 * beneficiary's allocation. "Paid" only ever comes from a backend-confirmed payout.
 */
export type BeneficiaryStage = BeneficiaryStatus | "allocated" | "paid";

/** An allocation's state on the backend (Deliverable 2, "Payment lifecycle"). */
export const ALLOCATION_STATUSES = ["allocated", "ready", "processing", "confirmed", "failed", "cancelled"] as const;
export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];

/** The payment lifecycle as shown: `pending_allocation` = approved, no live allocation yet. */
export type PaymentStatus = AllocationStatus | "pending_allocation";

/** Public ledger transaction types. `recovery`: unclaimed escrow returned to the organization's wallet. */
export const LEDGER_TX_TYPES = ["funding", "disbursement", "recovery"] as const;
export type LedgerTxType = (typeof LEDGER_TX_TYPES)[number];

/**
 * A ledger row's state on Stellar. `pending` / `failed` rows are attempts submitted to Stellar; a failed one moved
 * no funds, and totals count confirmed rows only. A UI status is never proof of payment (Deliverable 2).
 */
export const TX_STATUSES = ["confirmed", "pending", "failed"] as const;
export type TxStatus = (typeof TX_STATUSES)[number];

// ---------------------------------------------------------------------------------------------------------------
// Organizations and campaigns
// ---------------------------------------------------------------------------------------------------------------

export interface Organization {
	id: string;
	name: string;
	description: string | null;
	website_url: string | null;
	/** The wallet that registered the organization: its authorized administrator wallet. */
	admin_wallet: Address | null;
}

export interface Campaign {
	/** Public campaign reference ("AT-1001"). Every campaign route is keyed by it. */
	reference: string;
	title: string;
	description: string;
	/** Plain-language eligibility requirements (off-chain). */
	eligibility_requirements: string;
	/** Free text ("Food security"), shown on cards and used to filter. */
	category: string | null;
	/** Set by a platform administrator: shown first and on the landing page. */
	featured: boolean;
	organization: { name: string; website_url: string | null };
	admin_wallet: Address;
	/** Funding target in USDC. */
	target: Stroops;
	/** Maximum allocation per beneficiary. */
	max_allocation: Stroops;
	/** Intended number of beneficiaries. */
	beneficiary_target: number;
	starts_at: Timestamp;
	ends_at: Timestamp;
	status: CampaignStatus;
	display_status: CampaignDisplayStatus;
	created_at: Timestamp;
	updated_at: Timestamp;
}

/** Campaign financial overview (PRD §7). Every total comes from confirmed on-chain activity. */
export interface CampaignTotals {
	target: Stroops;
	/** Confirmed USDC received. */
	raised: Stroops;
	/** Funds assigned to approved beneficiaries and not yet paid or cancelled. */
	allocated: Stroops;
	/** Confirmed beneficiary payouts. */
	disbursed: Stroops;
	/** Unclaimed escrow returned to the organization. */
	recovered: Stroops;
	/** Funds remaining in campaign escrow. */
	available: Stroops;
	beneficiaries_approved: number;
	beneficiaries_paid: number;
}

/** What anonymous visitors see: no admin-only fields. */
export interface PublicCampaign extends Pick<
	Campaign,
	| "reference"
	| "title"
	| "description"
	| "eligibility_requirements"
	| "category"
	| "featured"
	| "organization"
	| "beneficiary_target"
	| "starts_at"
	| "ends_at"
	| "status"
	| "display_status"
> {
	totals: CampaignTotals;
}

/** A campaign as its administrator sees it. */
export type ManagedCampaign = Campaign & { totals: CampaignTotals };

/** Platform-wide transparency statistics for the landing page (Screen 1). */
export interface PublicStats {
	campaigns: number;
	active_campaigns: number;
	organizations: number;
	target: Stroops;
	raised: Stroops;
	disbursed: Stroops;
	beneficiaries_approved: number;
	beneficiaries_paid: number;
	verified_transactions: number;
}

// ---------------------------------------------------------------------------------------------------------------
// Beneficiaries (protected) and allocations
// ---------------------------------------------------------------------------------------------------------------

/** A beneficiary list row (administrators only): name, reference, wallet and status. No contact or evidence. */
export interface Beneficiary {
	id: string;
	/** Unique, privacy-safe reference ("BNF-…"). */
	reference: string;
	/** Name or internal identifier. In the organization's list only; the backend logs each name it returns. */
	full_name: string | null;
	wallet: Address;
	status: BeneficiaryStatus;
	eligibility_status: "pending" | "eligible" | "ineligible";
	/** The live or paid allocation (organization list only). Null when there is none (a cancelled one doesn't count). */
	allocation: BeneficiaryAllocation | null;
	reviewed_at: Timestamp | null;
	created_at: Timestamp;
}

/** The allocation summary on a beneficiary row. It has no id: pay and cancel look it up in the allocations list. */
export interface BeneficiaryAllocation {
	/** "ALC-…" */
	reference: string;
	amount: Stroops;
	status: AllocationStatus;
}

export interface EvidenceFile {
	id: string;
	content_type: string;
	size: number;
	sha256: string;
	uploaded_at: Timestamp;
}

/** Admin-only, loaded one at a time (each load is access-logged). Stored off-chain; never published. */
export interface BeneficiaryRecord extends Beneficiary {
	full_name: string;
	email: string | null;
	phone: string | null;
	eligibility_details: string;
	/** The reviewer's note, shown to the applicant. */
	review_note: string | null;
	evidence: EvidenceFile[];
}

export interface Allocation {
	id: string;
	/** Random public reference ("ALC-…"): the only recipient identifier on the public ledger. */
	reference: string;
	beneficiary_id: string;
	beneficiary_reference: string;
	wallet: Address;
	amount: Stroops;
	status: AllocationStatus;
	payout_tx_hash: string | null;
	explorer_url: string | null;
	paid_at: Timestamp | null;
	cancelled_at: Timestamp | null;
	created_at: Timestamp;
}

// ---------------------------------------------------------------------------------------------------------------
// Public ledger and reporting
// ---------------------------------------------------------------------------------------------------------------

/** One transaction on the public ledger (PRD §7, "Public ledger information"). */
export interface LedgerEntry {
	id: string;
	campaign_reference: string;
	type: LedgerTxType;
	amount: Stroops;
	status: TxStatus;
	/** Privacy-safe recipient: the allocation reference for disbursements; null for funding and recovery. */
	recipient_reference: string | null;
	timestamp: Timestamp;
	/** Null until the transaction is in a ledger. */
	ledger: number | null;
	tx_hash: string;
	/** Stellar Expert link, as the backend returns it. Null for an attempt Stellar rejected before a ledger. */
	explorer_url: string | null;
	/** Set when `status` is `failed`. */
	failure_code: string | null;
}

/** Reports & reconciliation (Screen 7): the backend's on-chain check of a campaign. */
export interface Reconciliation {
	/** True when every confirmed payout, ledger entry and open balance matches Stellar. */
	reconciled: boolean;
	checked_at: Timestamp;
	payouts: ReconciliationPayout[];
}

export interface ReconciliationPayout {
	allocation_reference: string;
	amount: Stroops;
	tx_hash: string | null;
	matched: boolean;
	/** Why it didn't match, when it didn't. */
	issue: string | null;
}
