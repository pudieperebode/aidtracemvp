import type { Metadata } from "next";
import { CampaignDashboard } from "@/features/campaigns/components/CampaignDashboard";

export async function generateMetadata({ params }: PageProps<"/campaigns/[reference]">): Promise<Metadata> {
	const { reference } = await params;
	const ref = decodeURIComponent(reference);
	return {
		title: `Campaign ${ref}`,
		description: `Funding target, funds raised, payouts and verified Stellar transactions for campaign ${ref} on AidTrace.`,
		alternates: { canonical: `/campaigns/${reference}` },
		openGraph: { title: `Campaign ${ref} · AidTrace`, description: "Follow every USDC from donation to delivery." },
	};
}

/** Screen 5: Public Campaign Dashboard. */
export default async function Page({ params }: PageProps<"/campaigns/[reference]">) {
	const { reference } = await params;
	return <CampaignDashboard reference={decodeURIComponent(reference)} />;
}
