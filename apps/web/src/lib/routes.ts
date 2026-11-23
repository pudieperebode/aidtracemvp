/**
 * Every app route, matching the design's sidebar (Figma "Sidebar / …"). PRD §4 screen numbers in comments; Screen 1's
 * marketing page lives in apps/landing, and the app's Overview is its in-app counterpart.
 *
 * Public (no wallet): Overview, campaigns, campaign dashboard, apply, public ledger.
 * Administrator (wallet sign-in): create campaign, beneficiaries, fund allocation, reports.
 * Admin screens take the campaign by public reference in `?campaign=` (the picker on each screen).
 */

type Query = Record<string, string | number | undefined>;

const qs = (params: Query) => {
	const search = new URLSearchParams(
		Object.entries(params)
			.filter(([, v]) => v !== undefined && v !== "")
			.map(([k, v]) => [k, String(v)]),
	).toString();
	return search ? `?${search}` : "";
};

export const routes = {
	/** Screen 1 (in-app): stats + featured campaigns. */
	OVERVIEW: "/overview",
	/** All public campaigns. */
	CAMPAIGNS: (filters: Query = {}) => `/campaigns${qs(filters)}`,
	/** Screen 2 */
	CREATE_CAMPAIGN: "/campaigns/new",
	/** Screen 5: campaign dashboard, by public reference. */
	CAMPAIGN: (reference: string) => `/campaigns/${encodeURIComponent(reference)}`,
	/** Beneficiary application (public half of Screen 3). */
	APPLY: (reference: string) => `/campaigns/${encodeURIComponent(reference)}/apply`,
	/** Screen 3 */
	BENEFICIARIES: (filters: Query = {}) => `/beneficiaries${qs(filters)}`,
	/** Screen 4 */
	ALLOCATION: (filters: Query = {}) => `/allocation${qs(filters)}`,
	/** Screen 6 */
	LEDGER: (filters: Query = {}) => `/ledger${qs(filters)}`,
	/** Screen 7 */
	REPORTS: (filters: Query = {}) => `/reports${qs(filters)}`,
};
