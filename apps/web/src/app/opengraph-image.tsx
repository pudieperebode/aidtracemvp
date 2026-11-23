import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@repo/ui/og-card";

export const alt = "AidTrace: transparent aid distribution on Stellar";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The app's social card (link previews for the overview, campaigns and ledger). */
export default function Image() {
	return new ImageResponse(
		<OgCard
			title="Every gift. A clear impact."
			subtitle="Verified campaigns, approved beneficiaries and USDC payouts anyone can check on Stellar."
			stats={[
				{ label: "Public ledger", value: "Every payment" },
				{ label: "Recipients", value: "Privacy-safe" },
				{ label: "Payouts", value: "USDC on Stellar" },
			]}
		/>,
		size,
	);
}
