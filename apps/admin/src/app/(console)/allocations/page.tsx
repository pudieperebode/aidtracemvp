import type { Metadata } from "next";
import { Allocations } from "@/features/money/components/Lists";

export const metadata: Metadata = { title: "Allocations" };

export default function Page() {
	return <Allocations />;
}
