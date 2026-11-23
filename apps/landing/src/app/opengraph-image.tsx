import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@repo/ui/og-card";

export const alt = "AidTrace: One source. Every gift. A clear impact.";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The landing page's social card: the hero headline on Verdigris with the transparency band. */
export default function Image() {
	return new ImageResponse(
		<OgCard
			title="One source. Every gift. A clear impact."
			subtitle="AidTrace connects generosity to real change. Fund communities. Follow every USDC."
			stats={[
				{ label: "Payments", value: "On Stellar" },
				{ label: "Ledger", value: "Public" },
				{ label: "Recipients", value: "Privacy-safe" },
			]}
		/>,
		size,
	);
}
