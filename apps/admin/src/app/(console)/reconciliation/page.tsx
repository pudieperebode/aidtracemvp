import type { Metadata } from "next";
import { Reconciliation } from "@/features/money/components/Reconciliation";

export const metadata: Metadata = { title: "Reconciliation" };

export default function Page() {
	return <Reconciliation />;
}
