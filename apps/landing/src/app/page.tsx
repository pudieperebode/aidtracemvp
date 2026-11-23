import { Hero } from "@/features/landing/components/Hero";
import { Impact, Story } from "@/features/landing/components/Story";
import { CallToAction, Campaigns, Ways } from "@/features/landing/components/Ways";
import { Footer } from "@/features/landing/components/Footer";
import { getFeaturedCampaigns, getStats } from "@/lib/api";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/** Revalidate the featured campaigns and statistics every 5 minutes. */
export const revalidate = 300;

/** Screen 1: Landing & Public Campaigns (Figma "AidTrace Desktop" / "AidTrace Mobile"). */
export default async function Home() {
	const [campaigns, stats] = await Promise.all([getFeaturedCampaigns(), getStats()]);
	const jsonLd = [
		{
			"@context": "https://schema.org",
			"@type": "WebApplication",
			name: SITE_NAME,
			url: SITE_URL.href,
			description: SITE_DESCRIPTION,
			applicationCategory: "FinanceApplication",
			operatingSystem: "Web",
			offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
		},
		{
			"@context": "https://schema.org",
			"@type": "ItemList",
			name: "Featured AidTrace campaigns",
			itemListElement: campaigns.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.title, description: c.description })),
		},
	];

	return (
		<>
			<a href="#main" className="sr-only z-[100] rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
				Skip to content
			</a>
			<Hero stats={stats} />
			<main id="main">
				<Story />
				<Impact />
				<Ways />
				<Campaigns campaigns={campaigns} />
				<CallToAction />
			</main>
			<Footer />
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
		</>
	);
}
