import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, THEME_COLOR, withBasePath } from "@/lib/site";

/** Installable app: opens on the Overview. Paths carry the preview base path by hand. */
export default function manifest(): MetadataRoute.Manifest {
	return {
		id: withBasePath("/"),
		name: `${SITE_NAME} · Transparent aid distribution`,
		short_name: SITE_NAME,
		description: SITE_DESCRIPTION,
		start_url: withBasePath("/overview"),
		scope: withBasePath("/"),
		display: "standalone",
		background_color: "#f6f6f6",
		theme_color: THEME_COLOR,
		categories: ["finance", "productivity", "utilities"],
		icons: [
			{ src: withBasePath("/icon.svg"), sizes: "any", type: "image/svg+xml" },
			{ src: withBasePath("/apple-icon"), sizes: "180x180", type: "image/png" },
		],
	};
}
