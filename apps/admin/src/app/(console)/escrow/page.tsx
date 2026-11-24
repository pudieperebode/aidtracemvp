import type { Metadata } from "next";
import { Escrow } from "@/features/money/components/Lists";

export const metadata: Metadata = { title: "Escrow balances" };

export default function Page() {
	return <Escrow />;
}
