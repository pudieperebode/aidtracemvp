import type { Metadata } from "next";
import { one } from "@/lib/params";
import { AdminGate } from "@/features/auth/components/AdminGate";
import { Beneficiaries } from "@/features/beneficiaries/components/Beneficiaries";

export const metadata: Metadata = { title: "Beneficiary registration", robots: { index: false } };

/** Screen 3: Beneficiary Registration & Approval (administrators). `?campaign=` picks the campaign. */
export default async function Page({ searchParams }: PageProps<"/beneficiaries">) {
	const params = await searchParams;
	return (
		<AdminGate title="Beneficiary registration" subtitle="Register beneficiaries and review their eligibility for support.">
			<Beneficiaries reference={one(params, "campaign")} />
		</AdminGate>
	);
}
