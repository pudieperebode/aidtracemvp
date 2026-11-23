import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Public pages are crawlable; administrator screens are excluded (they also set noindex). */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: { userAgent: "*", allow: "/", disallow: ["/campaigns/new", "/beneficiaries", "/allocation", "/reports", "/api/"] },
		sitemap: new URL("sitemap.xml", SITE_URL).href,
	};
}
