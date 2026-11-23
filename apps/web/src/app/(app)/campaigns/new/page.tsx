import type { Metadata } from "next";
import { AdminGate } from "@/features/auth/components/AdminGate";
import { CreateCampaign } from "@/features/campaigns/components/CreateCampaign";

export const metadata: Metadata = { title: "Create campaign", robots: { index: false } };

/** Screen 2: Create Campaign (administrators). */
export default function Page() {
	return (
		<AdminGate title="Create campaign" subtitle="Set up a transparent campaign and start making an impact.">
			<CreateCampaign />
		</AdminGate>
	);
}
