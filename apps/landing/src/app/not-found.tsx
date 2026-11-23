import type { Metadata } from "next";
import Link from "next/link";
import { AidTraceWordmark } from "@repo/ui/brand";
import { APP_LINKS } from "@/lib/site";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** 404 in the landing style: the Verdigris panel, a trail that runs out, and the useful ways back. */
export default function NotFound() {
	return (
		<div className="flex min-h-dvh flex-col p-2 sm:p-[15px]">
			<main className="flex flex-1 flex-col rounded-panel bg-brand-dark px-5 py-6 text-white sm:px-10 lg:px-[61px]">
				<Link href="/" aria-label="AidTrace home" className="w-fit">
					<AidTraceWordmark />
				</Link>
				<div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
					<p className="text-[96px] leading-none font-medium tracking-[-0.04em] text-pollen sm:text-[160px]">404</p>
					<h1 className="h-landing mt-6">This trail runs out here.</h1>
					<p className="mt-4 max-w-[460px] text-base opacity-90 sm:text-lg">The page you&apos;re looking for doesn&apos;t exist, or the link is mistyped. Every gift is still accounted for.</p>
					<div className="mt-10 flex flex-wrap justify-center gap-3">
						<Link href="/" className="inline-flex h-12 items-center rounded-full bg-pollen px-6 text-brand-dark">
							Back to home
						</Link>
						<a href={APP_LINKS.campaigns} className="inline-flex h-12 items-center rounded-full bg-brand-deep px-6">
							Explore campaigns
						</a>
					</div>
				</div>
			</main>
		</div>
	);
}
