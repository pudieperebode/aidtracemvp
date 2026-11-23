import "server-only";
import { campaignTotals, createSeed, platformStats } from "@repo/mock/seed";
import { decimalToStroops } from "@repo/stellar/format";
import type { CampaignCategory } from "@repo/stellar/campaign";
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
	category: CampaignCategory;
	organization: string;
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
				const t = campaignTotals(db, c.id);
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
	type Dto = { reference: string; title: string; description: string; category: CampaignCategory; organization: { name: string }; totals: { target: string; raised: string; disbursed: string } };
	const page = await get<{ results: Dto[] }>("/public/campaigns?featured=true&limit=3");
	return (page?.results ?? []).map((c) => ({
		reference: c.reference,
		title: c.title,
		description: c.description,
		category: c.category,
		organization: c.organization.name,
		target: decimalToStroops(c.totals.target),
		raised: decimalToStroops(c.totals.raised),
		disbursed: decimalToStroops(c.totals.disbursed),
	}));
}

export async function getStats(): Promise<LandingStats | null> {
	if (!LIVE) {
		const s = platformStats(createSeed());
		return { target: s.target.toString(), raised: s.raised.toString(), disbursed: s.disbursed.toString(), beneficiariesApproved: s.beneficiariesApproved, beneficiariesPaid: s.beneficiariesPaid };
	}
	const s = await get<{ target: string; raised: string; disbursed: string; beneficiariesApproved: number; beneficiariesPaid: number }>("/public/stats");
	return s && { target: decimalToStroops(s.target), raised: decimalToStroops(s.raised), disbursed: decimalToStroops(s.disbursed), beneficiariesApproved: s.beneficiariesApproved, beneficiariesPaid: s.beneficiariesPaid };
}
