import type { Metadata, Viewport } from "next";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/dm-mono/400.css";
import { Toaster } from "@repo/ui/sonner";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TAGLINE, SITE_URL, THEME_COLOR, TWITTER_HANDLE } from "@/lib/site";
import "./globals.css";

const TITLE = `${SITE_NAME} · ${SITE_TAGLINE}`;
const SHARE = "Fund communities and follow every USDC: verified campaigns, approved beneficiaries and payouts you can check on Stellar.";

/**
 * App metadata. Icons, social cards and the manifest come from file conventions in this folder (icon.svg,
 * apple-icon.tsx, opengraph-image.tsx, twitter-image.tsx, manifest.ts, robots.ts, sitemap.ts). Pages set `title` and
 * get "%s | AidTrace". Public pages (overview, campaigns, ledger) are indexable; administrator screens opt out.
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
	// Amounts, dates and wallet addresses must not turn into tap-to-call or map links.
	formatDetection: { telephone: false, email: false, address: false, date: false },
	robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
	appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
	openGraph: { type: "website", locale: "en_US", siteName: SITE_NAME, title: TITLE, description: SHARE, url: "/" },
	twitter: { card: "summary_large_image", site: TWITTER_HANDLE, creator: TWITTER_HANDLE, title: TITLE, description: SHARE },
};

export const viewport: Viewport = {
	themeColor: THEME_COLOR,
	colorScheme: "light",
	width: "device-width",
	initialScale: 1,
	// Shrink the layout viewport when the keyboard opens instead of covering inputs.
	interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en">
			{/* Extensions like Grammarly add attributes to <body> before React loads; ignore those (this element only). */}
			<body suppressHydrationWarning>
				<ReactQueryProvider>
					{children}
					<Toaster position="top-right" richColors={false} closeButton offset={{ top: 76 }} mobileOffset={{ bottom: 64 }} />
				</ReactQueryProvider>
			</body>
		</html>
	);
}
