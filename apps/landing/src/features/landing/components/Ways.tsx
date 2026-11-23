import Image from "next/image";
import { formatAmount } from "@repo/stellar/format";
import { fundingProgress } from "@repo/stellar/money";
import { cn } from "@repo/ui/lib/utils";
import type { FeaturedCampaign } from "@/lib/api";
import { APP_LINKS } from "@/lib/site";
import { Reveal } from "@/features/landing/components/Reveal";

function ArrowCircle({ className }: { className?: string }) {
	return (
		<span aria-hidden className={cn("flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-dark text-white transition-transform duration-300 ease-(--ease-settle) group-hover:rotate-45 sm:size-[71px]", className)}>
			<svg viewBox="0 0 16 16" className="size-5" fill="none">
				<path d="M5 11 11 5M6 5h5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</span>
	);
}

/** "Help another way": three ways in (start, fund, follow), each a large tinted card with the arrow button. */
export function Ways() {
	const ways = [
		{ n: "01", title: "Start a campaign", body: "Create a campaign, review eligibility, and send support where it matters.", href: APP_LINKS.createCampaign, tone: "bg-brand-tint lg:col-span-2" },
		{ n: "02", title: "Fund a future", body: "Support a campaign with USDC and help a community move forward.", href: APP_LINKS.campaigns, tone: "bg-pollen-tint" },
		{ n: "03", title: "Follow the impact", body: "See confirmed funding and payouts on the public ledger.", href: APP_LINKS.ledger, tone: "bg-accent-tint" },
	];
	return (
		<section className="landing-container py-20 lg:py-32">
			<Reveal className="text-center">
				<h2 className="h-landing text-brand-dark">Help another way</h2>
				<p className="mx-auto mt-6 max-w-[520px] text-base sm:text-[21px]">A simpler path from generosity to lasting impact. For organizations, donors, and communities.</p>
			</Reveal>
			<ul className="mt-12 grid gap-3 md:grid-cols-2 lg:mt-20 lg:grid-cols-4">
				{ways.map((w, i) => (
					<Reveal as="li" key={w.n} delay={i} className={cn("rounded-panel", w.tone)}>
						<a href={w.href} className="group flex h-full min-h-[260px] flex-col p-6 sm:min-h-[320px]">
							<div className="flex items-start justify-between">
								<span className="text-2xl font-medium sm:text-[30px]">{w.n}</span>
								<ArrowCircle />
							</div>
							<h3 className="h-landing-card mt-auto text-brand-deep">{w.title}</h3>
							<p className="mt-3 text-base leading-snug sm:text-xl">{w.body}</p>
						</a>
					</Reveal>
				))}
			</ul>
		</section>
	);
}

const PHOTO: Record<string, string> = {
	water: "/images/campaign-water.jpg",
	food: "/images/campaign-food.jpg",
	education: "/images/campaign-education.jpg",
	health: "/images/campaign-food.jpg",
};
const LABEL: Record<string, string> = { water: "Water", food: "Food", education: "Education", health: "Health" };

/** "Where your generosity goes": campaign cards with photo, teal title band, % funded, raised / disbursed. */
export function Campaigns({ campaigns }: { campaigns: FeaturedCampaign[] }) {
	return (
		<section id="campaigns" className="landing-container scroll-mt-6 pb-20 lg:pb-32">
			<Reveal className="flex items-end justify-between gap-6">
				<div>
					<h2 className="h-landing text-brand-dark">
						Where your <br />
						generosity goes
					</h2>
					<p className="mt-4 text-xs tracking-[0.08em] uppercase sm:text-sm">Live campaigns · Stellar Testnet</p>
				</div>
				<a href={APP_LINKS.campaigns} className="group" aria-label="View all campaigns">
					<ArrowCircle className="size-12 sm:size-[52px]" />
				</a>
			</Reveal>

			{campaigns.length === 0 ? (
				<p className="mt-10 rounded-panel bg-page p-8 text-center">Campaigns will appear here once organizations publish them.</p>
			) : (
				<ul className="mt-10 grid gap-5 md:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-[43px]">
					{campaigns.slice(0, 3).map((c, i) => {
						const pct = fundingProgress({ raised: c.raised, target: c.target });
						return (
							<Reveal as="li" key={c.reference} delay={i} className="group flex flex-col overflow-hidden rounded-panel bg-white shadow-[0_1px_0_0_var(--color-line)] ring-1 ring-line">
								<div className="relative overflow-hidden">
									<Image src={PHOTO[c.category] ?? PHOTO.water!} alt="" width={710} height={384} className="aspect-[355/192] w-full object-cover transition-transform duration-700 ease-(--ease-settle) group-hover:scale-105" />
									<span className="absolute inset-x-0 bottom-0 bg-brand-dark px-4 py-1.5 text-[34px] leading-tight font-medium text-white sm:text-[44px]">{LABEL[c.category]}</span>
								</div>
								<div className="flex flex-1 flex-col p-5 sm:p-6">
									<p className="text-sm text-muted">{c.title}</p>
									<p className="mt-2 line-clamp-2 text-base leading-snug sm:text-[17px]">{c.description}</p>
									<p className="mt-6 text-base text-brand-dark">{Math.round(pct)}% funded</p>
									<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
										<div className="animate-fill h-full rounded-full bg-brand-dark" style={{ width: `${pct}%` }} />
									</div>
									<p className="mt-5 text-base tabular-nums">
										{formatAmount(c.raised, 0)} / {formatAmount(c.target, 0)} USDC raised
									</p>
									<p className="mt-1 text-base tabular-nums">{formatAmount(c.disbursed, 0)} USDC disbursed</p>
									<a
										href={APP_LINKS.campaign(c.reference)}
										className={cn(
											"mx-auto mt-8 flex h-[43px] w-[185px] items-center justify-center rounded-full text-[17px] transition-colors",
											i === 1 ? "bg-brand-dark text-white hover:bg-brand-deep" : "bg-brand-soft text-brand-dark hover:bg-brand-tint",
										)}
									>
										View campaign
									</a>
								</div>
							</Reveal>
						);
					})}
				</ul>
			)}
		</section>
	);
}

/** "Somewhere right now, a family is waiting on a little hope." */
export function CallToAction() {
	return (
		<section className="landing-container pb-24 lg:pb-[140px]">
			<Reveal className="flex flex-col items-center rounded-[23px] bg-brand-tint px-6 py-16 text-center sm:py-20 lg:py-[85px]">
				<h2 className="h-landing max-w-[900px] text-brand-dark">Somewhere right now, a family is waiting on a little hope.</h2>
				<p className="mt-8 max-w-[520px] text-base sm:text-[21px]">Your generosity can go further. Start a campaign, support a community, and see the difference.</p>
				<a href={APP_LINKS.createCampaign} className="group mt-12 inline-flex h-[56px] items-center gap-4 rounded-full bg-brand-dark pr-2 pl-6 text-base text-white transition-colors hover:bg-brand-deep sm:h-[63px] sm:text-lg">
					Start a campaign
					<span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-pollen text-brand-deep transition-transform duration-300 group-hover:rotate-45 sm:size-11">
						<svg viewBox="0 0 16 16" className="size-4" fill="none">
							<path d="M5 11 11 5M6 5h5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</span>
				</a>
			</Reveal>
		</section>
	);
}
