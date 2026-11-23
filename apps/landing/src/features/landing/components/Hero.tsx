import Image from "next/image";
import { ArrowBadge } from "@repo/ui/button";
import { formatAmount } from "@repo/stellar/format";
import type { LandingStats } from "@/lib/api";
import { APP_LINKS } from "@/lib/site";
import { Nav } from "@/features/landing/components/Nav";

/**
 * Hero (Figma "Hero and navigation" + "Public transparency stat"): the Verdigris panel with the display headline,
 * "Explore campaigns", the delivery photo and the cream stat band overlapping its bottom edge.
 */
export function Hero({ stats }: { stats: LandingStats | null }) {
	const items = [
		{ label: "Funding target", value: stats ? `${formatAmount(stats.target, 0)} USDC` : "—" },
		{ label: "Funds raised", value: stats ? `${formatAmount(stats.raised, 0)} USDC` : "—" },
		{ label: "Funds disbursed", value: stats ? `${formatAmount(stats.disbursed, 0)} USDC` : "—" },
		{ label: "Beneficiaries paid", value: stats ? `${stats.beneficiariesPaid.toLocaleString("en-US")} / ${stats.beneficiariesApproved.toLocaleString("en-US")}` : "—" },
	];

	return (
		<section id="top" className="px-2 pt-2 sm:px-[15px] sm:pt-[18px]">
			<div className="mx-auto max-w-[1274px] rounded-panel bg-brand-dark px-5 pt-5 pb-28 sm:px-10 sm:pt-8 sm:pb-32 lg:px-[61px] lg:pb-[150px]">
				<Nav />
				<div className="mt-12 grid items-center gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_451px]">
					<div className="text-white">
						<h1 className="display">
							<span className="animate-rise block">One source.</span>
							<span className="animate-rise block" style={{ ["--i" as string]: 1 }}>
								Every gift.
							</span>
							<span className="animate-rise block" style={{ ["--i" as string]: 2 }}>
								A clear impact.
							</span>
						</h1>
						<p className="animate-rise mt-6 max-w-[520px] text-lg leading-snug sm:text-[23px]" style={{ ["--i" as string]: 3 }}>
							AidTrace connects generosity to real change. Fund communities. Follow every USDC.
						</p>
						<a
							href={APP_LINKS.campaigns}
							className="animate-rise group mt-10 inline-flex h-[56px] items-center gap-4 rounded-full bg-brand-deep pr-2 pl-6 text-base text-white transition-colors hover:bg-night sm:h-[63px] sm:pl-7 sm:text-lg"
							style={{ ["--i" as string]: 4 }}
						>
							Explore campaigns
							<ArrowBadge />
						</a>
						<p className="mt-14 text-xs tracking-[0.08em] uppercase sm:text-sm lg:mt-24">Built on Stellar · Powered by purpose</p>
					</div>
					<div className="animate-rise relative mx-auto w-full max-w-[451px]" style={{ ["--i" as string]: 2 }}>
						<Image
							src="/images/hero-donation-delivery.jpg"
							alt="Two volunteers in an aid distribution centre sharing a box of supplies"
							width={902}
							height={1080}
							priority
							className="aspect-[451/540] w-full rounded-panel object-cover"
						/>
					</div>
				</div>
			</div>

			<dl className="relative z-10 mx-auto -mt-20 grid max-w-[981px] grid-cols-2 gap-x-4 gap-y-6 rounded-panel bg-pollen-soft px-5 py-6 shadow-[0_24px_60px_-30px_rgba(5,56,54,0.45)] sm:-mt-24 sm:px-8 lg:grid-cols-4 lg:gap-0 lg:px-5 lg:py-9">
				{items.map((item, i) => (
					<div key={item.label} className={i > 0 ? "lg:border-l lg:border-line-strong lg:pl-5" : "lg:pl-3"}>
						<dt className="text-sm sm:text-[17px]">{item.label}</dt>
						<dd className="mt-3 text-[20px] leading-none font-medium tracking-[-0.02em] whitespace-nowrap text-brand-dark tabular-nums sm:text-[26px] lg:text-[26px] xl:text-[30px]">{item.value}</dd>
					</div>
				))}
			</dl>
		</section>
	);
}
