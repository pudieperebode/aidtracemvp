import type { Metadata } from "next";
import { Logs } from "@/features/logs/components/Logs";

export const metadata: Metadata = { title: "Logs" };

export default function Page() {
	return <Logs />;
}
