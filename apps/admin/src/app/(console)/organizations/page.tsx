import type { Metadata } from "next";
import { Organizations } from "@/features/organizations/components/Organizations";

export const metadata: Metadata = { title: "Organizations" };

export default function Page() {
	return <Organizations />;
}
