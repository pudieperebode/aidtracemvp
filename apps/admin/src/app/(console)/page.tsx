import type { Metadata } from "next";
import { Overview } from "@/features/overview/components/Overview";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
	return <Overview />;
}
