import type { Metadata } from "next";
import { ApplyForm } from "@/features/beneficiaries/components/ApplyForm";

export const metadata: Metadata = { title: "Apply for support", robots: { index: false } };

/** Screen 3 (public half): beneficiary application. */
export default async function Page({ params }: PageProps<"/campaigns/[reference]/apply">) {
	const { reference } = await params;
	return <ApplyForm reference={decodeURIComponent(reference)} />;
}
