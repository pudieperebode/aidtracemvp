import type { Metadata } from "next";
import { Campaigns } from "@/features/campaigns/components/Campaigns";

export const metadata: Metadata = { title: "Campaigns" };

export default function Page() {
	return <Campaigns />;
}
