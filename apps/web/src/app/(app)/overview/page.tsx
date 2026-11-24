import type { Metadata } from "next";
import { Overview } from "@/features/campaigns/components/Overview";

export const metadata: Metadata = {
	title: "Overview",
	description:
		"Funds raised and disbursed across verified aid campaigns on Stellar, and the campaigns making an impact right now.",
	alternates: { canonical: "/overview" },
};

/** Screen 1 (in-app): platform statistics and featured campaigns. */
export default function Page() {
	return <Overview />;
}
