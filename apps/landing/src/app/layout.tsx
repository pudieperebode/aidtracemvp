import type { Metadata, Viewport } from "next";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/dm-mono/400.css";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TAGLINE, SITE_URL, THEME_COLOR, TWITTER_HANDLE } from "@/lib/site";
import "./globals.css";

const TITLE = `${SITE_NAME} · ${SITE_TAGLINE}`;
const SHARE = "Fund communities. Follow every USDC. Transparent aid distribution with a public, privacy-safe ledger on Stellar.";

/**
 * Icons and link previews come from file conventions in this folder: icon.svg, apple-icon.tsx, opengraph-image.tsx
 * and twitter-image.tsx (1200×630). sitemap.ts and robots.ts describe the site for crawlers; page.tsx adds JSON-LD.
 */
export const metadata: Metadata = {
	metadataBase: SITE_URL,
	title: { default: TITLE, template: `%s | ${SITE_NAME}` },
	description: SITE_DESCRIPTION,
	applicationName: SITE_NAME,
	keywords: SITE_KEYWORDS,
	authors: [{ name: SITE_NAME }],
	creator: SITE_NAME,
	publisher: SITE_NAME,
	category: "nonprofit",
	alternates: { canonical: "/" },
	formatDetection: { telephone: false, email: false, address: false },
	openGraph: { type: "website", locale: "en_US", url: "/", siteName: SITE_NAME, title: TITLE, description: SHARE },
	twitter: { card: "summary_large_image", site: TWITTER_HANDLE, creator: TWITTER_HANDLE, title: TITLE, description: SHARE },
	robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
};

export const viewport: Viewport = { themeColor: THEME_COLOR, colorScheme: "light", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en">
			{/* Extensions like Grammarly add attributes to <body> before React loads; ignore those (this element only). */}
			<body className="bg-white" suppressHydrationWarning>
				{children}
			</body>
		</html>
	);
}
