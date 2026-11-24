import type { AxiosInstance } from "axios";
import {
	toAllocation,
	toBeneficiary,
	toBeneficiaryRecord,
	toCampaign,
	toLedgerEntry,
	toNotification,
	toOrganization,
	toPage,
	toPublicCampaign,
	toPublicStats,
	toUnreadCount,
} from "./adapters";
import type {
	AllocationDto,
	ApplicationStatusResponseDto,
	BeneficiaryDetailDto,
	BeneficiaryDto,
	CampaignDto,
	ChainActionDto,
	Envelope,
	LedgerEntryDto,
	MeDto,
	NotificationDto,
	OrganizationDto,
	Paginated,
	PublicCampaignDto,
	PublicStatsDto,
	UnreadCountDto,
	WalletDto,
} from "./dto";

/**
 * Every read, as plain functions of an axios instance (so scripts and tests can call them with their own client).
 * Public reads use `publicApi`; administrator reads use `api`. Campaign routes are keyed by the public reference.
 */

export interface PageParams {
	limit?: number;
	offset?: number;
}

const ref = (reference: string) => encodeURIComponent(reference);

/** The API caps `limit` at 100. */
const MAX = 100;

/** Reads every page of a list (for joins the API doesn't do, like beneficiaries × allocations). */
async function all<D>(load: (page: PageParams) => Promise<Paginated<D>>, cap = 1000): Promise<D[]> {
	const out: D[] = [];
	for (let offset = 0; offset < cap; offset += MAX) {
		const page = await load({ limit: MAX, offset });
		out.push(...page.result);
		if (!page.paginationMeta.nextPage || page.result.length < MAX) break;
	}
	return out;
}

// --- Public (no session) -----------------------------------------------------------------------------------------

export async function getPublicStats(http: AxiosInstance) {
	const { data } = await http.get<Envelope<PublicStatsDto>>("/public/stats");
	return toPublicStats(data.data);
}

/** Published campaigns, featured first. `status` filters by display status. */
export async function listPublicCampaigns(
	http: AxiosInstance,
	params: PageParams & { status?: "active" | "funded" | "closed"; search?: string; category?: string; featured?: boolean } = {},
) {
	const { data } = await http.get<Envelope<Paginated<PublicCampaignDto>>>("/public/campaigns", { params });
	return toPage(data.data, toPublicCampaign);
}

export async function getPublicCampaign(http: AxiosInstance, reference: string) {
	const { data } = await http.get<Envelope<PublicCampaignDto>>(`/public/campaigns/${ref(reference)}`);
	return toPublicCampaign(data.data);
}

export interface LedgerFilters extends PageParams {
	/** Campaign reference: reads that campaign's ledger. */
	campaign?: string;
	type?: "funding" | "disbursement" | "recovery";
	/** `pending` / `failed`: attempts submitted to Stellar (a failed one moved no funds). */
	status?: "confirmed" | "pending" | "failed";
	/** Transaction hash, campaign reference, recipient reference or campaign title. */
	search?: string;
	/** ISO 8601. A plain date in `to` covers that whole day. */
	from?: string;
	to?: string;
}

export async function listLedger(http: AxiosInstance, { campaign, ...params }: LedgerFilters = {}) {
	const path = campaign ? `/public/campaigns/${ref(campaign)}/ledger` : "/public/ledger";
	const { data } = await http.get<Envelope<Paginated<LedgerEntryDto>>>(path, { params });
	return toPage(data.data, toLedgerEntry);
}

/** The application form's private status page: the token rides in a header, never a URL. */
export async function getApplicationStatus(http: AxiosInstance, token: string) {
	const { data } = await http.get<Envelope<ApplicationStatusResponseDto>>("/applications/me", {
		headers: { "x-application-token": token },
	});
	return data.data;
}

// --- Administrator session ----------------------------------------------------------------------------------------

export async function getMe(http: AxiosInstance) {
	const { data } = await http.get<Envelope<MeDto>>("/auth/me");
	return data.data;
}

/** The signed-in wallet's organization, or null when it hasn't registered one (404). */
export async function getMyOrganization(http: AxiosInstance) {
	try {
		const { data } = await http.get<Envelope<OrganizationDto>>("/organizations/me");
		return toOrganization(data.data);
	} catch (error) {
		if ((error as { response?: { status?: number } }).response?.status === 404) return null;
		throw error;
	}
}

export async function listCampaigns(http: AxiosInstance, params: PageParams = {}) {
	const { data } = await http.get<Envelope<Paginated<CampaignDto>>>("/campaigns", { params: { limit: MAX, ...params } });
	return toPage(data.data, toCampaign);
}

export async function getCampaign(http: AxiosInstance, reference: string) {
	const { data } = await http.get<Envelope<CampaignDto>>(`/campaigns/${ref(reference)}`);
	return toCampaign(data.data);
}

export async function listBeneficiaries(http: AxiosInstance, reference: string, params: PageParams & { status?: string } = {}) {
	const { data } = await http.get<Envelope<Paginated<BeneficiaryDto>>>(`/campaigns/${ref(reference)}/beneficiaries`, { params });
	return toPage(data.data, toBeneficiary);
}

/** Every approved beneficiary of a campaign (Fund allocation). */
export async function listAllBeneficiaries(http: AxiosInstance, reference: string, status?: string) {
	const rows = await all(
		async (page) =>
			(
				await http.get<Envelope<Paginated<BeneficiaryDto>>>(`/campaigns/${ref(reference)}/beneficiaries`, {
					params: { ...page, status },
				})
			).data.data,
	);
	return rows.map(toBeneficiary);
}

/** The full protected record. The backend writes an access-log entry for every call, so load it only on request. */
export async function getBeneficiaryRecord(http: AxiosInstance, reference: string, id: string) {
	const { data } = await http.get<Envelope<BeneficiaryDetailDto>>(
		`/campaigns/${ref(reference)}/beneficiaries/${encodeURIComponent(id)}`,
	);
	return toBeneficiaryRecord(data.data);
}

/** Every allocation of a campaign, newest first as the API returns them. */
export async function listAllocations(http: AxiosInstance, reference: string) {
	const rows = await all(
		async (page) =>
			(await http.get<Envelope<Paginated<AllocationDto>>>(`/campaigns/${ref(reference)}/allocations`, { params: page })).data
				.data,
	);
	return rows.map(toAllocation);
}

export async function getAction(http: AxiosInstance, reference: string, actionId: string) {
	const { data } = await http.get<Envelope<ChainActionDto>>(
		`/campaigns/${ref(reference)}/actions/${encodeURIComponent(actionId)}`,
	);
	return data.data;
}

export async function listNotifications(http: AxiosInstance) {
	const { data } = await http.get<Envelope<Paginated<NotificationDto>>>("/notifications", { params: { limit: 20 } });
	return data.data.result.map(toNotification);
}

export async function getUnreadCount(http: AxiosInstance) {
	const { data } = await http.get<Envelope<UnreadCountDto>>("/notifications/unread");
	return toUnreadCount(data.data);
}

/** The signed-in wallet, live from the network. */
export async function getWallet(http: AxiosInstance) {
	const { data } = await http.get<Envelope<WalletDto>>("/wallet");
	return data.data;
}
