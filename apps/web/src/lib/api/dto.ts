/**
 * Backend shapes (camelCase, decimal amount strings, ISO dates), from the AidTrace API (`/docs` on the API host) and
 * the backend's frontend integration guide (`docs/FRONTEND_INTEGRATION (2).md`). Request bodies are typed in the
 * OpenAPI document; most response bodies are only typed in the guide. Shapes the guide doesn't spell out either are
 * marked PROVISIONAL: check them against real responses and fix them here and in `adapters.ts` only.
 */

/** Every success: `{ statusCode, message, data }`. */
export interface Envelope<T> {
	statusCode: number;
	message: string;
	data: T;
}

/** Every error. `fields` per the guide; the OpenAPI document calls the same list `details`. */
export interface ErrorEnvelope {
	statusCode: number;
	message: string;
	data: null;
	error: {
		code: string;
		fields?: { field: string; message: string }[];
		details?: unknown;
		retryAfterSeconds?: number;
		requestId?: string;
		traceId?: string;
		timestamp?: string;
		path?: string;
	};
}

export interface PaginationMeta {
	nextPage: boolean;
	previousPage: boolean;
	currentPage: number;
	totalPage: number;
	totalCount: number;
	pageCount: number;
}

/** Lists: `{ result, paginationMeta }`, queried with `?limit=&offset=` (limit ≤ 100). */
export interface Paginated<T> {
	result: T[];
	paginationMeta: PaginationMeta;
}

// --- Auth and wallet -------------------------------------------------------------------------------------------------

export interface ChallengeDto {
	challengeId: string;
	/** Transaction XDR to sign. Sequence number 0: it can never be submitted and moves nothing. */
	transaction: string;
	networkPassphrase: string;
	expiresAt: string;
}

export interface AuthTokensDto {
	accessToken: string;
	refreshToken: string;
	tokenType: "Bearer";
	expiresIn: number;
}

export interface SignInDto extends AuthTokensDto {
	/** True the first time this wallet signs in. */
	newAccount: boolean;
}

export interface MeDto {
	id: string;
	walletAddress: string;
	shortAddress: string;
	roles: { organizationAdmin: boolean; platformAdmin: boolean };
	organization: { id: string; name: string } | null;
	createdAt: string;
}

export interface WalletAssetDto {
	/** `XLM`, or `CODE:ISSUER`. */
	id: string;
	code: string;
	issuer: string | null;
	native: boolean;
	/** Issued assets: a trustline exists. */
	trusted: boolean;
	balance: string | null;
	spendable: string;
}

export interface WalletDto {
	address: string;
	shortAddress: string;
	/** False until the account is funded on the network (`POST /wallet/fund`). */
	exists: boolean;
	explorerUrl: string;
	assets: WalletAssetDto[];
}

export interface WalletTransactionDto {
	xdr: string;
	networkPassphrase: string;
	expiresAt: string;
}

// --- Organizations and campaigns -------------------------------------------------------------------------------------

/** PROVISIONAL beyond `name`, `description`, `websiteUrl` (the request fields). */
export interface OrganizationDto {
	id: string;
	name: string;
	description?: string | null;
	websiteUrl?: string | null;
	adminWallet?: string | null;
}

export type CampaignStatusDto = "draft" | "active" | "closed" | "cancelled";

export interface CampaignTotalsDto {
	raised: string;
	allocated: string;
	disbursed: string;
	recovered: string;
	availableBalance: string;
	remainingToTarget: string;
	fundingProgressPercent: number;
	beneficiariesApproved: number;
	beneficiariesPaid: number;
}

export interface CampaignDto {
	/** "AT-1001" */
	reference: string;
	title: string;
	description: string;
	eligibilityRequirements: string;
	category: string | null;
	featured: boolean;
	organization: { name: string; websiteUrl: string | null };
	adminWallet: string;
	asset: string;
	network: string;
	targetAmount: string;
	maxAllocation: string;
	beneficiaryTarget: number;
	startsAt: string;
	endsAt: string;
	status: CampaignStatusDto;
	/** What to show: `funded` means still active and the target is reached. */
	displayStatus: CampaignStatusDto | "funded";
	totals: CampaignTotalsDto;
	createdAt: string;
	updatedAt: string;
}

/** PROVISIONAL: the guide types one `Campaign`; public responses may omit the admin-only fields. */
export type PublicCampaignDto = Omit<CampaignDto, "adminWallet" | "createdAt" | "updatedAt"> &
	Partial<Pick<CampaignDto, "adminWallet" | "createdAt" | "updatedAt">>;

/** `GET /public/stats`, as the live API returns it. */
export interface PublicStatsDto {
	campaigns: number;
	activeCampaigns: number;
	organizations: number;
	totalTarget: string;
	totalRaised: string;
	totalDisbursed: string;
	beneficiariesApproved: number;
	beneficiariesPaid: number;
	verifiedTransactions: number;
}

// --- Beneficiaries ---------------------------------------------------------------------------------------------------

export type ApplicationStatusDto = "registered" | "under_review" | "approved" | "rejected";

export interface BeneficiaryDto {
	id: string;
	/** "BNF-…" */
	reference: string;
	walletAddress: string;
	/** In the organization list only. Each name shown is logged. */
	fullName?: string;
	status: ApplicationStatusDto;
	eligibilityStatus: "pending" | "eligible" | "ineligible";
	reviewedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface EvidenceDto {
	id: string;
	contentType: string;
	sizeBytes: number;
	sha256: string;
	createdAt: string;
}

export interface BeneficiaryDetailDto extends BeneficiaryDto {
	profile: {
		fullName: string;
		email: string | null;
		phone: string | null;
		eligibilityDetails: string;
		reviewNote: string | null;
	};
	evidence: EvidenceDto[];
}

/** `GET /applications/me` (applicant's private status link). PROVISIONAL: the guide names status, note, `canAddEvidence`. */
export interface ApplicationStatusResponseDto {
	reference?: string;
	status: ApplicationStatusDto;
	note?: string | null;
	reviewNote?: string | null;
	canAddEvidence: boolean;
	campaign?: { reference: string; title: string } | null;
	evidenceCount?: number;
	createdAt?: string;
}

// --- Allocations and on-chain actions --------------------------------------------------------------------------------

export type AllocationStatusDto = "allocated" | "ready" | "processing" | "confirmed" | "failed" | "cancelled";

export interface AllocationDto {
	id: string;
	/** "ALC-…", shown publicly. */
	reference: string;
	beneficiaryId: string;
	beneficiaryReference: string;
	walletAddress: string;
	amount: string;
	status: AllocationStatusDto;
	payoutTxHash: string | null;
	explorerUrl: string | null;
	paidAt: string | null;
	cancelledAt: string | null;
	createdAt: string;
}

export type ActionKind = "fund" | "lock_allocations" | "payout" | "cancel_allocation" | "recover";
export type ActionStatus = "prepared" | "pending" | "confirmed" | "failed" | "expired";

/** A money action: prepared by the backend, signed by the admin wallet, submitted back to the backend. */
export interface ChainActionDto {
	id: string;
	kind: ActionKind;
	status: ActionStatus;
	hash: string;
	amount: string | null;
	/** XDR to sign; only while `prepared`. */
	transaction: string | null;
	networkPassphrase: string;
	expiresAt: string;
	ledger: number | null;
	explorerUrl: string | null;
	statusMessage: string;
	failureCode: string | null;
	failureCodes: string[] | null;
}

/** `POST …/allocations/{id}/cancel`: done at once, or a transaction to sign (the allocation was locked). */
export type CancelAllocationDto = { status: "cancelled"; action: null } | { status: "needs_signature"; action: ChainActionDto };

// --- Ledger, reports, notifications ----------------------------------------------------------------------------------

export interface LedgerEntryDto {
	id: string;
	campaignReference: string;
	type: "funding" | "disbursement" | "recovery";
	amount: string;
	status: "confirmed" | "pending" | "failed";
	recipientReference: string | null;
	timestamp: string;
	ledger: number | null;
	transactionHash: string;
	/** Null for an attempt Stellar rejected before it reached a ledger. */
	explorerUrl: string | null;
	/** Set when `status` is `failed`. */
	failureCode: string | null;
}

/** `POST /campaigns/{reference}/reconciliation`. PROVISIONAL beyond `reconciled` and `payouts.items[].matched`. */
export interface ReconciliationDto {
	reconciled: boolean;
	checkedAt?: string;
	payouts: {
		items: {
			allocationReference: string;
			amount: string;
			transactionHash?: string | null;
			matched: boolean;
			issue?: string | null;
		}[];
	};
}

/** PROVISIONAL: the guide lists the routes only. */
export interface NotificationDto {
	id: string;
	type?: string;
	event?: string;
	title?: string;
	message?: string;
	body?: string;
	campaignReference?: string | null;
	readAt: string | null;
	createdAt: string;
}

/** `GET /notifications/unread`. PROVISIONAL: `{ count }` or a bare number. */
export type UnreadCountDto = { count: number } | { unread: number } | number;
