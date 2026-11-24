import type { Metadata } from "next";
import { Beneficiaries } from "@/features/money/components/Lists";

export const metadata: Metadata = { title: "Beneficiaries" };

export default function Page() {
	return <Beneficiaries />;
}
