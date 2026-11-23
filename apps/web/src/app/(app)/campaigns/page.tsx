import type { Metadata } from "next";
import { one } from "@/lib/params";
import { CampaignList } from "@/features/campaigns/components/CampaignList";

export const metadata: Metadata = {
	title: "Campaigns",
	description: "Every public AidTrace campaign with its funding target, funds raised and funds disbursed, verifiable on Stellar.",
	alternates: { canonical: "/campaigns" },
};

export default async function Page({ searchParams }: PageProps<"/campaigns">) {
	const params = await searchParams;
	return <CampaignList q={one(params, "q")} status={one(params, "status")} />;
}
