import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** The public screens. Campaign pages are added once the live backend can list them at build time. */
export default function sitemap(): MetadataRoute.Sitemap {
	const url = (path: string) => new URL(path.replace(/^\//, ""), SITE_URL).href;
	return [
		{ url: url("/overview"), changeFrequency: "daily", priority: 1 },
		{ url: url("/campaigns"), changeFrequency: "daily", priority: 0.9 },
		{ url: url("/ledger"), changeFrequency: "hourly", priority: 0.8 },
	];
}
