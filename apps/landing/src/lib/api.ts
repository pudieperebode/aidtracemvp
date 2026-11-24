import "server-only";
import { campaignTotals, createSeed, platformStats } from "@repo/mock/seed";
import { decimalToStroops } from "@repo/stellar/format";
import { API_URL } from "@/lib/site";

/**
 * Server-side reads for the landing page. Mock mode (the default until the backend is live) reads the same seed as
 * the app's mock backend; live mode (NEXT_PUBLIC_DATA_MODE=live) fetches the backend, revalidating every 5 minutes.
 * Neither throws: when the backend is unreachable the page still renders with its sections in an empty state.
 */
const LIVE = process.env.NEXT_PUBLIC_DATA_MODE === "live";
const REVALIDATE = 300;

export interface FeaturedCampaign {
	reference: string;
	title: string;
	description: string;
	/** Free text ("Food security"), or null. */
	category: string | null;
	organization: string;
	/** Stroops. */
	target: string;
	raised: string;
	disbursed: string;
}

export interface LandingStats {
	target: string;
	raised: string;
	disbursed: string;
	beneficiariesApproved: number;
	beneficiariesPaid: number;
}

async function get<T>(path: string): Promise<T | null> {
	try {
		const res = await fetch(`${API_URL}${path}`, { next: { revalidate: REVALIDATE } });
		if (!res.ok) return null;
		return ((await res.json()) as { data: T }).data;
	} catch {
		return null;
	}
}

export async function getFeaturedCampaigns(): Promise<FeaturedCampaign[]> {
	if (!LIVE) {
		const db = createSeed();
		return db.campaigns
			.filter((c) => c.featured)
			.map((c) => {
				const t = campaignTotals(db, c.reference);
				return {
					reference: c.reference,
					title: c.title,
					description: c.description,
					category: c.category,
					organization: db.orgs.find((o) => o.id === c.organizationId)?.name ?? "",
					target: c.target,
					raised: t.raised.toString(),
					disbursed: t.disbursed.toString(),
				};
			});
	}
	// The public list is featured-first; `featured=true` keeps only the campaigns a platform admin featured.
	type Dto = {
		reference: string;
		title: string;
		description: string;
		category: string | null;
		targetAmount: string;
		organization: { name: string };
		totals: { raised: string; disbursed: string };
	};
	const page =
		(await get<{ result: Dto[] }>("/public/campaigns?featured=true&limit=3")) ??
		(await get<{ result: Dto[] }>("/public/campaigns?limit=3"));
	return (page?.result ?? []).map((c) => ({
		reference: c.reference,
		title: c.title,
		description: c.description,
		category: c.category ?? null,
		organization: c.organization.name,
		target: decimalToStroops(c.targetAmount),
		raised: decimalToStroops(c.totals.raised),
		disbursed: decimalToStroops(c.totals.disbursed),
	}));
}

export async function getStats(): Promise<LandingStats | null> {
	if (!LIVE) {
		const s = platformStats(createSeed());
		return {
			target: s.target.toString(),
			raised: s.raised.toString(),
			disbursed: s.disbursed.toString(),
			beneficiariesApproved: s.beneficiariesApproved,
			beneficiariesPaid: s.beneficiariesPaid,
		};
	}
	const s = await get<{
		totalTarget: string;
		totalRaised: string;
		totalDisbursed: string;
		beneficiariesApproved: number;
		beneficiariesPaid: number;
	}>("/public/stats");
	return (
		s && {
			target: decimalToStroops(s.totalTarget),
			raised: decimalToStroops(s.totalRaised),
			disbursed: decimalToStroops(s.totalDisbursed),
			beneficiariesApproved: s.beneficiariesApproved,
			beneficiariesPaid: s.beneficiariesPaid,
		}
	);
}
