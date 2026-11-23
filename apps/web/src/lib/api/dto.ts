/**
 * Backend shapes (camelCase, decimal amount strings, ISO dates). PROVISIONAL: derived from the PRD's backend table
 * (§5) and the envelope Stackly's backend used. Replace with the real shapes once the AidTrace backend publishes its
 * OpenAPI document, then fix `adapters.ts`; nothing else should need to change.
 */

/** Every response: `{ statusCode, message, data }`. */
export interface Envelope<T> {
	statusCode: number;
	message: string;
	data: T;
}

/** Lists: `{ results, paginationMeta }` with `limit` / `offset`. */
export interface Paginated<T> {
	results: T[];
	paginationMeta: { total: number; limit: number; offset: number };
}

export interface AuthTokensDto {
	accessToken: string;
	refreshToken: string;
}

export interface MeDto {
	address: string;
	/** "org_admin" for organization administrators; beneficiaries and donors don't sign in for the MVP. */
	role: "org_admin" | "platform_admin";
	organizationId: string | null;
}

export interface OrganizationDto {
	id: string;
	name: string;
	website: string;
	adminWallet: string;
	createdAt: string;
}

export interface CampaignTotalsDto {
	target: string;
	raised: string;
	allocated: string;
	disbursed: string;
	available: string;
	beneficiariesApproved: number;
	beneficiariesPaid: number;
}

export interface CampaignDto {
	id: string;
	reference: string;
	title: string;
	description: string;
	organization: { id: string; name: string; website: string };
	category: "water" | "food" | "education" | "health";
	featured: boolean;
	adminWallet: string;
	target: string;
	maxAllocation: string;
	beneficiaryTarget: number;
	eligibility: string[];
	startsAt: string;
	endsAt: string;
	status: "draft" | "active" | "funded" | "closed" | "cancelled";
	contractCampaignId: string | null;
	createdAt: string;
	totals: CampaignTotalsDto;
}

export type PublicCampaignDto = Omit<CampaignDto, "adminWallet" | "maxAllocation" | "contractCampaignId" | "createdAt">;

export interface PublicStatsDto {
	campaigns: number;
	activeCampaigns: number;
	target: string;
	raised: string;
	disbursed: string;
	beneficiariesApproved: number;
	beneficiariesPaid: number;
}

export interface EvidenceDto {
	id: string;
	name: string;
	contentType: string;
	size: number;
	uploadedAt: string;
}

export interface AllocationDto {
	id: string;
	beneficiaryId: string;
	campaignId: string;
	amount: string;
	status: "pending_allocation" | "allocated" | "ready" | "processing" | "confirmed" | "failed" | "cancelled";
	txHash: string | null;
	failureReason: string | null;
	updatedAt: string;
}

export interface BeneficiaryDto {
	id: string;
	reference: string;
	campaignId: string;
	name: string;
	wallet: string | null;
	eligibilityNotes: string;
	evidence: EvidenceDto[];
	status: "registered" | "under_review" | "approved" | "rejected" | "allocated" | "paid";
	reviewedBy: string | null;
	reviewedAt: string | null;
	rejectionReason: string | null;
	allocation: AllocationDto | null;
	createdAt: string;
}

export interface LedgerEntryDto {
	id: string;
	campaignReference: string;
	type: "funding" | "disbursement";
	amount: string;
	status: "pending" | "processing" | "confirmed" | "failed";
	counterpartyRef: string;
	txHash: string;
	timestamp: string;
}

export interface ReconciliationRowDto {
	beneficiaryReference: string;
	allocated: string;
	paid: string;
	txHash: string | null;
	matched: boolean;
}

export interface NotificationDto {
	id: string;
	event: string;
	message: string;
	campaignId: string | null;
	campaignReference: string | null;
	readAt: string | null;
	createdAt: string;
}

export interface WalletBalancesDto {
	address: string;
	funded: boolean;
	balances: { code: string; issuer?: string; balance: string }[];
}

/** An unsigned transaction the backend prepared for the admin wallet to sign (fund, allocate, payout). */
export interface PreparedTxDto {
	xdr: string;
	networkPassphrase: string;
	/** Backend id to report the submitted hash against (`/sync`). */
	intentId: string;
}
