/** Every console route: one screen per area of the backend's `/admin` API (backend guide §14). */
export const routes = {
	OVERVIEW: "/",
	USERS: "/users",
	ORGANIZATIONS: "/organizations",
	CAMPAIGNS: "/campaigns",
	CAMPAIGN: (reference: string) => `/campaigns/${encodeURIComponent(reference)}`,
	BENEFICIARIES: "/beneficiaries",
	ALLOCATIONS: "/allocations",
	TRANSACTIONS: "/transactions",
	ESCROW: "/escrow",
	RECONCILIATION: "/reconciliation",
	LOGS: "/logs",
};
