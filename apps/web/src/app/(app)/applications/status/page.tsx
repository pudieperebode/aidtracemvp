import type { Metadata } from "next";
import { ApplicationStatus } from "@/features/beneficiaries/components/ApplicationStatus";

/** Private: never indexed, and no referrer leaves this page. */
export const metadata: Metadata = { title: "Your application", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** The applicant's private status page (the emailed link, `#token=…`). */
export default function Page() {
	return <ApplicationStatus />;
}
