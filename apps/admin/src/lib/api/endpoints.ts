import type { AxiosInstance } from "axios";
import type { AdminRecord, Envelope, IntegrityDto, MeDto, Paginated } from "./dto";

/**
 * Every `/admin/*` route (backend guide §14). All need a wallet in the backend's ADMIN_WALLETS; a 403 means no access.
 * Platform admins can't sign, move funds, approve beneficiaries or read beneficiary names, contacts or evidence:
 * nothing here does. Lists are paged (≤100 per request; screens use 20).
 */

export type ListParams = Record<string, string | number | undefined>;
export interface Page<T> {
	results: T[];
	total: number;
}

const clean = (params: ListParams) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));

export async function getMe(http: AxiosInstance) {
	const { data } = await http.get<Envelope<MeDto>>("/auth/me");
	return data.data;
}

/** `/admin/me`: confirms access (403 otherwise). */
export async function confirmAdmin(http: AxiosInstance) {
	const { data } = await http.get<Envelope<AdminRecord>>("/admin/me");
	return data.data;
}

/** A single admin document: overview, system, a user, a campaign, a transaction. */
export async function getAdmin<T = AdminRecord>(http: AxiosInstance, path: string) {
	const { data } = await http.get<Envelope<T>>(`/admin${path}`);
	return data.data;
}

export const getIntegrity = (http: AxiosInstance) => getAdmin<IntegrityDto>(http, "/integrity");

/** One page of an admin list (`users`, `campaigns`, `transactions`, …). */
export async function listAdmin<T = AdminRecord>(
	http: AxiosInstance,
	resource: string,
	params: ListParams = {},
): Promise<Page<T>> {
	const { data } = await http.get<Envelope<Paginated<T>>>(`/admin/${resource}`, { params: clean(params) });
	return { results: data.data.result, total: data.data.paginationMeta.totalCount };
}

/** Admin writes: suspend / reactivate, feature, reconcile, recheck, resolve, sweep. None moves funds. */
export async function postAdmin<T = AdminRecord>(http: AxiosInstance, path: string, body?: unknown) {
	const { data } = await http.post<Envelope<T>>(`/admin${path}`, body ?? {});
	return { data: data.data, message: data.message };
}
