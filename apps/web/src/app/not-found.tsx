import type { Metadata } from "next";
import Link from "next/link";
import { AidTraceLogo } from "@repo/ui/brand";
import { Button } from "@repo/ui/button";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** 404: a trail that runs out. Offers the places people most often mean. */
export default function NotFound() {
	return (
		<div className="flex min-h-dvh flex-col bg-page">
			<header className="flex h-16 items-center border-b border-line bg-white px-5">
				<Link href={routes.OVERVIEW} aria-label="AidTrace overview">
					<AidTraceLogo />
				</Link>
			</header>
			<main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
				<div className="animate-pop flex max-w-[520px] flex-col items-center text-center">
					<svg viewBox="0 0 260 90" className="h-[90px] w-[260px]" fill="none" aria-hidden>
						<path
							d="M10 60 C60 60 70 20 120 20 S180 60 200 60"
							stroke="var(--color-brand)"
							strokeWidth="2"
							strokeLinecap="round"
							pathLength={100}
							strokeDasharray="70 100"
						/>
						<path d="M200 60h40" stroke="var(--color-line-strong)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 6" />
						<circle cx="10" cy="60" r="6" fill="var(--color-brand)" />
						<text
							x="130"
							y="82"
							textAnchor="middle"
							fill="var(--color-ink)"
							fontSize="22"
							fontFamily="var(--font-sans)"
							letterSpacing="-0.5"
						>
							404
						</text>
						<circle cx="246" cy="60" r="7" fill="white" stroke="var(--color-line-strong)" strokeWidth="2" />
					</svg>
					<h1 className="h-page mt-6">We couldn&apos;t trace this page</h1>
					<p className="mt-3 text-[13px] leading-6 text-muted">
						The link may be mistyped, or the campaign may have moved. Every confirmed transaction is still on the public ledger.
					</p>
					<div className="mt-8 flex flex-wrap justify-center gap-2">
						<Button asChild size="lg">
							<Link href={routes.OVERVIEW}>Go to overview</Link>
						</Button>
						<Button asChild size="lg" variant="outline" className="bg-white">
							<Link href={routes.CAMPAIGNS()}>Browse campaigns</Link>
						</Button>
						<Button asChild size="lg" variant="ghost">
							<Link href={routes.LEDGER()}>Public ledger</Link>
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}
