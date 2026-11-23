import type { Metadata } from "next";
import { one } from "@/lib/params";
import { AdminGate } from "@/features/auth/components/AdminGate";
import { FundAllocation } from "@/features/disbursements/components/FundAllocation";

export const metadata: Metadata = { title: "Fund allocation", robots: { index: false } };

/** Screen 4: Fund Allocation & Disbursement (administrators). */
export default async function Page({ searchParams }: PageProps<"/allocation">) {
	const params = await searchParams;
	return (
		<AdminGate title="Fund allocation" subtitle="Allocate USDC to approved beneficiaries and review payments.">
			<FundAllocation reference={one(params, "campaign")} />
		</AdminGate>
	);
}
