"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AidTraceWordmark } from "@repo/ui/brand";
import { cn } from "@repo/ui/lib/utils";
import { APP_LINKS } from "@/lib/site";

const LINKS = [
	{ label: "Our work", href: "#our-work" },
	{ label: "Campaigns", href: "#campaigns" },
	{ label: "Why us", href: "#why-us" },
	{ label: "Contact", href: "#contact" },
];

/**
 * Hero navigation (Figma: wordmark · Our work · Campaigns · Why us · Contact · "Start a campaign" pollen pill), fixed to
 * the top of the viewport. At the top of the page it sits transparently on the teal hero, as designed; once the page
 * scrolls it condenses into a solid teal bar so it stays legible over the white sections.
 */
export function Nav() {
	const [open, setOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 24);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<>
			{/* Keeps the hero's layout where the bar used to sit in the flow. */}
			<div aria-hidden className="h-10 sm:h-[41px]" />
			<div className={cn("fixed inset-x-0 top-0 z-50 px-2 transition-[padding] duration-300 ease-(--ease-settle) sm:px-[15px]", scrolled ? "pt-2" : "pt-2 sm:pt-[18px]")}>
				<header
					className={cn(
						"relative mx-auto flex max-w-[1274px] items-center justify-between gap-4 rounded-panel px-5 transition-[padding,background-color,box-shadow] duration-300 ease-(--ease-settle) sm:px-10 lg:px-[61px]",
						scrolled ? "bg-brand-dark/95 py-3 shadow-[0_18px_40px_-22px_rgba(5,56,54,0.7)] backdrop-blur-md sm:py-3.5" : "bg-transparent py-5 sm:py-8",
					)}
				>
					<a href="#top" className="rounded-control text-white" aria-label="AidTrace home">
						<AidTraceWordmark />
					</a>
					<nav aria-label="Main" className="hidden items-center gap-10 lg:flex">
						<ul className="flex items-center gap-12 text-sm text-white">
							{LINKS.map((l) => (
								<li key={l.href}>
									<a
										href={l.href}
										className="relative py-1 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform hover:after:scale-x-100"
									>
										{l.label}
									</a>
								</li>
							))}
						</ul>
						<a href={APP_LINKS.createCampaign} className="inline-flex h-[41px] items-center rounded-full bg-pollen px-6 text-sm text-brand-dark transition-transform hover:-translate-y-0.5">
							Start a campaign
						</a>
					</nav>
					<button
						type="button"
						onClick={() => setOpen((o) => !o)}
						aria-expanded={open}
						aria-controls="mobile-nav"
						className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white lg:hidden"
					>
						{open ? <X className="size-5" /> : <Menu className="size-5" />}
						<span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
					</button>
					<div
						id="mobile-nav"
						className={cn(
							"absolute inset-x-0 top-[calc(100%+8px)] origin-top rounded-panel bg-brand-deep p-5 shadow-xl transition-[opacity,transform] duration-300 ease-(--ease-settle) lg:hidden",
							open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
						)}
					>
						<ul className="flex flex-col gap-1 text-white">
							{LINKS.map((l) => (
								<li key={l.href}>
									<a href={l.href} onClick={() => setOpen(false)} className="block rounded-control px-3 py-3 text-base hover:bg-white/10">
										{l.label}
									</a>
								</li>
							))}
						</ul>
						<a href={APP_LINKS.createCampaign} className="mt-3 flex h-12 items-center justify-center rounded-full bg-pollen text-brand-dark">
							Start a campaign
						</a>
					</div>
				</header>
			</div>
		</>
	);
}
