import type { Metadata, Viewport } from "next";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/dm-mono/400.css";
import { Toaster } from "@repo/ui/sonner";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";

/** The platform-admin console. Never indexed: it is for wallets in the backend's ADMIN_WALLETS only. */
export const metadata: Metadata = {
	title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
	description: "AidTrace platform administration.",
	robots: { index: false, follow: false, nocache: true },
	referrer: "same-origin",
	formatDetection: { telephone: false, email: false, address: false, date: false },
};

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en">
			<body suppressHydrationWarning>
				<ReactQueryProvider>
					{children}
					<Toaster position="top-right" richColors={false} closeButton offset={{ top: 76 }} mobileOffset={{ bottom: 64 }} />
				</ReactQueryProvider>
			</body>
		</html>
	);
}
