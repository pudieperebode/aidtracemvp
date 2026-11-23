import Image from "next/image";
import { ArrowBadge } from "@repo/ui/button";
import { APP_LINKS } from "@/lib/site";
import { Reveal } from "@/features/landing/components/Reveal";

/** "We started with aid. We didn't stop there." with the mission quote card over the photo. */
export function Story() {
	return (
		<section id="our-work" className="landing-container scroll-mt-6 py-20 lg:py-32">
			<div className="grid items-center gap-10 lg:grid-cols-[minmax(0,557fr)_minmax(0,560fr)] lg:gap-12">
				<Reveal className="relative">
					<Image
						src="/images/mission-family-support.jpg"
						alt="A volunteer smiling with an older woman and a child at a food distribution"
						width={1114}
						height={1034}
						className="aspect-[557/517] w-full rounded-panel object-cover"
					/>
					<figure className="absolute inset-x-0 bottom-0 rounded-b-panel bg-brand-deep p-4 text-white sm:p-7">
						<blockquote className="text-base leading-snug sm:text-[26px]">“A clearer path from generosity to the people who need it.”</blockquote>
						<figcaption className="mt-3 text-xs opacity-90 sm:mt-5 sm:text-sm">AidTrace · Our mission</figcaption>
					</figure>
				</Reveal>
				<Reveal delay={1}>
					<h2 className="text-[34px] leading-[1.04] font-medium tracking-[-0.02em] text-brand-dark sm:text-[46px] xl:text-[57px]">
						We started with aid. <br className="hidden sm:block" />
						We didn&apos;t stop there.
					</h2>
					<p className="mt-8 max-w-[560px] text-base leading-relaxed sm:text-xl">
						Good intentions deserve a clear trail. AidTrace helps organizations fund campaigns, approve beneficiaries, and send USDC on Stellar. Every
						confirmed payment tells a story of real support, with private details kept off-chain.
					</p>
					<a href={APP_LINKS.ledger} className="group mt-10 inline-flex h-[56px] items-center gap-4 rounded-full bg-brand-dark pr-2 pl-6 text-base text-white transition-colors hover:bg-brand-deep sm:h-[63px] sm:text-lg">
						Our full story
						<ArrowBadge />
					</a>
				</Reveal>
			</div>
		</section>
	);
}

/** "Our aid platform is impactful." The grey panel with three offset principle cards. */
export function Impact() {
	const cards = [
		{ n: "01", title: "Built for communities", body: "Create campaigns, review eligibility, and support the people who need it most.", tone: "bg-brand-tint", offset: "lg:ml-auto" },
		{ n: "02", title: "Radical transparency", body: "Follow confirmed funding and payouts through a privacy-conscious public ledger.", tone: "bg-pollen-tint", offset: "lg:-mt-2 lg:mr-[74px] lg:ml-auto" },
		{ n: "03", title: "Accountable, always", body: "Authorized USDC payouts. Verified on Stellar. No duplicate disbursements.", tone: "bg-accent-tint", offset: "lg:-mt-2 lg:ml-auto" },
	];
	return (
		<section id="why-us" className="landing-container scroll-mt-6">
			<div className="grid gap-10 rounded-[20px] bg-line px-5 py-12 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:px-[26px] lg:py-[45px]">
				<Reveal className="flex flex-col justify-between gap-10 lg:pt-10 lg:pl-[26px]">
					<h2 className="h-landing text-brand-dark">
						Our aid platform <br className="hidden sm:block" />
						is impactful.
					</h2>
					<Image
						src="/images/platform-volunteers.jpg"
						alt="Volunteers packing boxes of aid supplies"
						width={636}
						height={400}
						className="aspect-[318/200] w-full max-w-[318px] rounded-panel object-cover"
					/>
				</Reveal>
				<ul className="flex flex-col gap-3 lg:gap-0">
					{cards.map((c, i) => (
						<Reveal as="li" key={c.n} delay={i} className={`w-full rounded-panel p-6 lg:w-[407px] ${c.tone} ${c.offset}`}>
							<span className="text-xl sm:text-[26px]">{c.n}</span>
							<h3 className="h-landing-card mt-8 text-brand-deep sm:mt-10">{c.title}</h3>
							<p className="mt-3 text-sm leading-snug sm:text-[17px]">{c.body}</p>
						</Reveal>
					))}
				</ul>
			</div>
		</section>
	);
}
