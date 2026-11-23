import type { Metadata } from "next";
import { one } from "@/lib/params";
import { AdminGate } from "@/features/auth/components/AdminGate";
import { Reports } from "@/features/reports/components/Reports";

export const metadata: Metadata = { title: "Reports", robots: { index: false } };

/** Screen 7: Reports & Financial Reconciliation (administrators). */
export default async function Page({ searchParams }: PageProps<"/reports">) {
	const p = await searchParams;
	return (
		<AdminGate title="Reports" subtitle="Monitor campaign inflows, outflows and beneficiary payments.">
			<Reports query={{ campaign: one(p, "campaign"), period: one(p, "period"), type: one(p, "type"), page: Number(one(p, "page") ?? 1) || 1 }} />
		</AdminGate>
	);
}
