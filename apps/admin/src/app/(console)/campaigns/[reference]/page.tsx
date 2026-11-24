import type { Metadata } from "next";
import { CampaignRecord } from "@/features/campaigns/components/CampaignRecord";

export async function generateMetadata({ params }: PageProps<"/campaigns/[reference]">): Promise<Metadata> {
	const { reference } = await params;
	return { title: decodeURIComponent(reference) };
}

export default async function Page({ params }: PageProps<"/campaigns/[reference]">) {
	const { reference } = await params;
	return <CampaignRecord reference={decodeURIComponent(reference)} />;
}
