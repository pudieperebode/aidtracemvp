import type { Metadata } from "next";
import { Transactions } from "@/features/money/components/Lists";

export const metadata: Metadata = { title: "Transactions" };

export default function Page() {
	return <Transactions />;
}
