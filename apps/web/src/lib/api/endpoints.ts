import type { AxiosInstance } from "axios";
import {
	toBeneficiary,
	toCampaign,
	toLedgerEntry,
	toPublicCampaign,
	toPublicStats,
	toReconciliationRow,
} from "./adapters";
import type {
	BeneficiaryDto,
	CampaignDto,
	Envelope,
	LedgerEntryDto,
	MeDto,
	NotificationDto,
	OrganizationDto,
	Paginated,
	PublicCampaignDto,
	PublicStatsDto,
	ReconciliationRowDto,
	WalletBalancesDto,
} from "./dto";

/**
 * Every read, as plain functions of an axios instance (so scripts and tests can call them with their own client).
 * PROVISIONAL paths until the backend publishes its OpenAPI. Public reads use `publicApi`; console reads use `api`.
 */

export interface Page {
	limit?: number;
	offset?: number;
}

// --- Public (no session) -----------------------------------------------------------------------------------------

export async function getPublicStats(http: AxiosInstance) {
	const { data } = await http.get<Envelope<PublicStatsDto>>("/public/stats");
	return toPublicStats(data.data);
}

export async function listPublicCampaigns(http: AxiosInstance, params: Page & { featured?: boolean; status?: string; q?: string } = {}) {
	const { data } = await http.get<Envelope<Paginated<PublicCampaignDto>>>("/public/campaigns", { params });
	return { ...data.data.paginationMeta, results: data.data.results.map(toPublicCampaign) };
}

export async function getPublicCampaign(http: AxiosInstance, reference: string) {
	const { data } = await http.get<Envelope<PublicCampaignDto>>(`/public/campaigns/${encodeURIComponent(reference)}`);
	return toPublicCampaign(data.data);
}

export interface LedgerFilters extends Page {
	/** Campaign reference. */
	campaign?: string;
	type?: string;
	status?: string;
	/** Free text: transaction hash or campaign / beneficiary reference. */
	q?: string;
	/** ISO timestamps bounding the period. */
	from?: string;
	to?: string;
}

export async function listLedger(http: AxiosInstance, filters: LedgerFilters = {}) {
	const { data } = await http.get<Envelope<Paginated<LedgerEntryDto>>>("/public/ledger", { params: filters });
	return { ...data.data.paginationMeta, results: data.data.results.map(toLedgerEntry) };
}

// --- Console (organization administrator session) ----------------------------------------------------------------

export async function getMe(http: AxiosInstance) {
	const { data } = await http.get<Envelope<MeDto>>("/auth/me");
	return data.data;
}

export async function getMyOrganization(http: AxiosInstance) {
	const { data } = await http.get<Envelope<OrganizationDto | null>>("/organizations/me");
	return data.data;
}

export async function listCampaigns(http: AxiosInstance, params: Page & { status?: string } = {}) {
	const { data } = await http.get<Envelope<Paginated<CampaignDto>>>("/campaigns", { params });
	return { ...data.data.paginationMeta, results: data.data.results.map(toCampaign) };
}

export async function getCampaign(http: AxiosInstance, id: string) {
	const { data } = await http.get<Envelope<CampaignDto>>(`/campaigns/${id}`);
	return toCampaign(data.data);
}

export async function listBeneficiaries(http: AxiosInstance, campaignId: string, params: Page & { status?: string; q?: string } = {}) {
	const { data } = await http.get<Envelope<Paginated<BeneficiaryDto>>>(`/campaigns/${campaignId}/beneficiaries`, { params });
	return { ...data.data.paginationMeta, results: data.data.results.map(toBeneficiary) };
}

export async function getBeneficiary(http: AxiosInstance, campaignId: string, beneficiaryId: string) {
	const { data } = await http.get<Envelope<BeneficiaryDto>>(`/campaigns/${campaignId}/beneficiaries/${beneficiaryId}`);
	return toBeneficiary(data.data);
}

export async function getReconciliation(http: AxiosInstance, campaignId: string) {
	const { data } = await http.get<Envelope<ReconciliationRowDto[]>>(`/campaigns/${campaignId}/reconciliation`);
	return data.data.map(toReconciliationRow);
}

export async function listNotifications(http: AxiosInstance) {
	const { data } = await http.get<Envelope<Paginated<NotificationDto>>>("/notifications", { params: { limit: 20 } });
	return data.data.results;
}

export async function getUnreadCount(http: AxiosInstance) {
	const { data } = await http.get<Envelope<{ count: number }>>("/notifications/unread-count");
	return data.data.count;
}

export async function getWalletBalances(http: AxiosInstance) {
	const { data } = await http.get<Envelope<WalletBalancesDto>>("/stellar/balances");
	return data.data;
}
