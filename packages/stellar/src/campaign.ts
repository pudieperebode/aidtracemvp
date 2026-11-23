/**
 * The AidTrace UI data model, shared by every app. Field names are snake_case and amounts are stroop strings
 * (7 decimals, as integers) so money never passes through floating point; timestamps are unix seconds.
 * The backend's own shapes live in each app's `lib/api/dto.ts` and are adapted into these.
 *
 * Privacy (PRD §3, §7): anything typed `Public*` (and `LedgerEntry`) may be shown to anonymous visitors and
 * exported in public CSVs. Names, contact details, identity documents and eligibility evidence exist only on
 * `BeneficiaryRecord`, which only an authorized organization administrator can load. Never widen a public type
 * with those fields.
 */

/** Stroop amount as a decimal integer string ("1000000000" = 100 USDC). */
export type Stroops = string;
/** Unix seconds. */
export type Timestamp = number;
/** Stellar account address (G…). */
export type Address = string;

// ---------------------------------------------------------------------------------------------------------------
// Statuses (PRD tables). Labels, tones and copy for each live in the web app's `features/*/status.ts`.
// ---------------------------------------------------------------------------------------------------------------

export const CAMPAIGN_STATUSES = ["draft", "active", "funded", "closed", "cancelled"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Deliverable 1, "Recommended approval workflow". */
export const BENEFICIARY_STATUSES = ["registered", "under_review", "approved", "rejected", "allocated", "paid"] as const;
export type BeneficiaryStatus = (typeof BENEFICIARY_STATUSES)[number];

/** Deliverable 2, "Payment lifecycle". */
export const PAYMENT_STATUSES = ["pending_allocation", "allocated", "ready", "processing", "confirmed", "failed", "cancelled"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Public ledger transaction types (PRD §7). */
export const LEDGER_TX_TYPES = ["funding", "disbursement"] as const;
export type LedgerTxType = (typeof LEDGER_TX_TYPES)[number];

/** On-chain state of a ledger entry. A UI status change is never proof of payment (Deliverable 2). */
export const TX_STATUSES = ["pending", "processing", "confirmed", "failed"] as const;
export type TxStatus = (typeof TX_STATUSES)[number];

// ---------------------------------------------------------------------------------------------------------------
// Organizations and campaigns
// ---------------------------------------------------------------------------------------------------------------

export interface Organization {
	id: string;
	name: string;
	website: string;
	/** The wallet authorized to fund, allocate and pay out for this organization's campaigns. */
	admin_wallet: Address;
	created_at: Timestamp;
}

export type CampaignCategory = "water" | "food" | "education" | "health";

export interface Campaign {
	id: string;
	/** Public campaign reference shown to donors and on chain ("AT-2026-0012"). */
	reference: string;
	title: string;
	description: string;
	organization: Pick<Organization, "id" | "name" | "website">;
	category: CampaignCategory;
	featured: boolean;
	admin_wallet: Address;
	/** Funding target in USDC. */
	target: Stroops;
	/** Maximum allocation per beneficiary. */
	max_allocation: Stroops;
	/** Intended number of beneficiaries. */
	beneficiary_target: number;
	/** Plain-language eligibility requirements (off-chain). */
	eligibility: string[];
	starts_at: Timestamp;
	ends_at: Timestamp;
	status: CampaignStatus;
	/** Soroban campaign id once registered on chain; null while draft. */
	contract_campaign_id: string | null;
	created_at: Timestamp;
}

/** Campaign financial overview (PRD §7). Every total comes from confirmed on-chain activity. */
export interface CampaignTotals {
	target: Stroops;
	/** Confirmed USDC received. */
	raised: Stroops;
	/** Funds assigned to approved beneficiaries. */
	allocated: Stroops;
	/** Confirmed beneficiary payouts. */
	disbursed: Stroops;
	/** Funds remaining in campaign escrow (raised − disbursed). */
	available: Stroops;
	beneficiaries_approved: number;
	beneficiaries_paid: number;
}

/** What anonymous visitors see: no admin-only fields. */
export interface PublicCampaign
	extends Pick<
		Campaign,
		"id" | "reference" | "title" | "description" | "organization" | "category" | "featured" | "beneficiary_target" | "eligibility" | "starts_at" | "ends_at" | "status"
	> {
	totals: CampaignTotals;
}

/** Platform-wide transparency statistics for the landing page (Screen 1). */
export interface PublicStats {
	campaigns: number;
	active_campaigns: number;
	target: Stroops;
	raised: Stroops;
	disbursed: Stroops;
	beneficiaries_approved: number;
	beneficiaries_paid: number;
}

// ---------------------------------------------------------------------------------------------------------------
// Beneficiaries (protected) and allocations
// ---------------------------------------------------------------------------------------------------------------

export interface EvidenceFile {
	id: string;
	name: string;
	content_type: string;
	size: number;
	uploaded_at: Timestamp;
}

/** Admin-only. Stored off-chain in protected storage; never published on the ledger or in public exports. */
export interface BeneficiaryRecord {
	id: string;
	/** Unique, privacy-safe reference ("BEN-0042"). The only beneficiary identifier shown publicly. */
	reference: string;
	campaign_id: string;
	/** Name or internal identifier. */
	name: string;
	wallet: Address | null;
	eligibility_notes: string;
	evidence: EvidenceFile[];
	status: BeneficiaryStatus;
	reviewed_by: Address | null;
	reviewed_at: Timestamp | null;
	rejection_reason: string | null;
	allocation: Allocation | null;
	created_at: Timestamp;
}

export interface Allocation {
	id: string;
	beneficiary_id: string;
	campaign_id: string;
	amount: Stroops;
	status: PaymentStatus;
	/** Set once a payout transaction is submitted. */
	tx_hash: string | null;
	failure_reason: string | null;
	updated_at: Timestamp;
}

// ---------------------------------------------------------------------------------------------------------------
// Public ledger and reporting
// ---------------------------------------------------------------------------------------------------------------

/** One verified transaction on the public ledger (PRD §7, "Public ledger information"). */
export interface LedgerEntry {
	id: string;
	campaign_reference: string;
	type: LedgerTxType;
	amount: Stroops;
	status: TxStatus;
	/** Privacy-safe counterparty: the beneficiary reference for disbursements, the funder for funding. */
	counterparty_ref: string;
	tx_hash: string;
	timestamp: Timestamp;
}

/** Reports & reconciliation (Screen 7): confirmed payouts matched against allocations. */
export interface ReconciliationRow {
	beneficiary_reference: string;
	allocated: Stroops;
	paid: Stroops;
	tx_hash: string | null;
	matched: boolean;
}
