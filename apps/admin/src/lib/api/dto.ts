/**
 * Backend response shapes for the console. The envelope, pagination and auth shapes are documented
 * (`docs/FRONTEND_INTEGRATION (2).md` §3, §5). The `/admin/*` bodies are not: OpenAPI types them as `object` and the
 * guide lists routes only. The Admin*Dto interfaces below are PROVISIONAL: every field is optional, screens read
 * them through `pick()` with fallbacks, and every record also opens in full (`RecordView`), so a field named
 * differently still shows. Confirm against real responses and tighten.
 */

export interface Envelope<T> {
	statusCode: number;
	message: string;
	data: T;
}

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

export interface Paginated<T> {
	result: T[];
	paginationMeta: PaginationMeta;
}

// --- Auth (documented) ---------------------------------------------------------------------------------------------

export interface ChallengeDto {
	challengeId: string;
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

// --- Admin (PROVISIONAL) -------------------------------------------------------------------------------------------

/** Any admin record. Known fields are listed per resource; anything else is shown by `RecordView`. */
export type AdminRecord = Record<string, unknown>;

export interface AdminUserDto extends AdminRecord {
	id: string;
	walletAddress?: string;
	status?: "active" | "suspended";
	roles?: { organizationAdmin?: boolean; platformAdmin?: boolean };
	organization?: { id: string; name: string } | null;
	suspendedReason?: string | null;
	createdAt?: string;
}

export interface AdminCampaignDto extends AdminRecord {
	reference: string;
	title?: string;
	status?: "draft" | "active" | "closed" | "cancelled";
	featured?: boolean;
	organization?: { id?: string; name?: string } | null;
}

export interface AdminTransactionDto extends AdminRecord {
	id: string;
	kind?: "fund" | "lock_allocations" | "payout" | "cancel_allocation" | "recover";
	status?: "prepared" | "pending" | "confirmed" | "failed" | "expired";
}

export interface AdminIssueDto extends AdminRecord {
	id: string;
	type?: string;
	status?: "open" | "resolved";
}

/** `GET /admin/integrity`: the guide only promises `healthy`. */
export interface IntegrityDto extends AdminRecord {
	healthy: boolean;
}
