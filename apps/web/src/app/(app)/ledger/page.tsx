import type { Metadata } from "next";
import { one } from "@/lib/params";
import { PublicLedger } from "@/features/ledger/components/PublicLedger";

export const metadata: Metadata = {
	title: "Public ledger",
	description: "An open record of every contribution and beneficiary payment on AidTrace, with Stellar transaction hashes and privacy-safe references.",
	alternates: { canonical: "/ledger" },
};

/** Screen 6: Public Transaction Ledger. Filters live in the URL. */
export default async function Page({ searchParams }: PageProps<"/ledger">) {
	const p = await searchParams;
	return (
		<PublicLedger
			query={{ campaign: one(p, "campaign"), type: one(p, "type"), status: one(p, "status"), q: one(p, "q"), period: one(p, "period"), page: Number(one(p, "page") ?? 1) || 1 }}
		/>
	);
}
