"use client";

import { useState } from "react";
import { APP_LINKS } from "@/lib/site";

const COLUMNS = [
	{
		title: "Explore",
		links: [
			{ label: "Our work", href: "#our-work" },
			{ label: "Campaigns", href: APP_LINKS.campaigns },
			{ label: "Public ledger", href: APP_LINKS.ledger },
			{ label: "Impact stories", href: "#campaigns" },
		],
	},
	{
		title: "Get involved",
		links: [
			{ label: "Start a campaign", href: APP_LINKS.createCampaign },
			{ label: "Donate", href: APP_LINKS.campaigns },
			{ label: "For organizations", href: APP_LINKS.overview },
			{ label: "For communities", href: APP_LINKS.campaigns },
		],
	},
	{
		title: "Company",
		links: [
			{ label: "About AidTrace", href: "#our-work" },
			{ label: "Contact", href: "#contact" },
			{ label: "Privacy", href: "#privacy" },
			{ label: "Terms", href: "#privacy" },
		],
	},
];

/** Footer (Figma: black ground, three link columns, newsletter with pollen "Subscribe", the giant wordmark). */
export function Footer() {
	const [email, setEmail] = useState("");
	const [state, setState] = useState<"idle" | "invalid" | "done">("idle");

	return (
		<footer id="contact" className="overflow-hidden bg-night text-white">
			<div className="landing-container pt-16 lg:pt-[110px]">
				<div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
					<nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3">
						{COLUMNS.map((col) => (
							<div key={col.title}>
								<p className="text-[17px]">{col.title}</p>
								<ul className="mt-5 flex flex-col gap-4 text-base text-graphite-active">
									{col.links.map((l) => (
										<li key={l.label}>
											<a href={l.href} className="transition-colors hover:text-white">
												{l.label}
											</a>
										</li>
									))}
								</ul>
							</div>
						))}
					</nav>
					<div>
						<p className="text-2xl tracking-[-0.02em]">Get updates from the field</p>
						<p className="mt-3 text-base text-graphite-active">Stories of impact and transparent aid. Delivered with purpose.</p>
						{state === "done" ? (
							<p role="status" className="animate-pop mt-8 rounded-full bg-brand-dark px-5 py-3 text-sm">
								Thanks. You&apos;re on the list.
							</p>
						) : (
							<form
								noValidate
								className="mt-8 flex h-12 items-center rounded-full bg-white p-1 pl-5"
								onSubmit={(e) => {
									e.preventDefault();
									setState(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "done" : "invalid");
								}}
							>
								<label htmlFor="newsletter" className="sr-only">
									Email address
								</label>
								<input
									id="newsletter"
									type="email"
									value={email}
									onChange={(e) => {
										setEmail(e.target.value);
										setState("idle");
									}}
									placeholder="Enter your email"
									aria-invalid={state === "invalid" || undefined}
									className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink/70"
								/>
								<button type="submit" className="h-10 shrink-0 cursor-pointer rounded-full bg-pollen px-6 text-sm text-brand-dark transition-colors hover:bg-[#ffd666]">
									Subscribe
								</button>
							</form>
						)}
						{state === "invalid" && (
							<p role="alert" className="mt-2 text-sm text-pollen">
								Enter a valid email address.
							</p>
						)}
					</div>
				</div>
			</div>
			<p aria-hidden className="mt-16 text-center text-[24vw] leading-[0.8] font-medium tracking-[-0.05em] text-white/[0.06] select-none lg:mt-24 lg:text-[247px]">
				AidTrace
			</p>
			<p id="privacy" className="landing-container pt-6 pb-8 text-xs text-graphite-active">
				Stellar Testnet · Example data · No real funds are moved. Beneficiary names and documents are never published; Stellar transactions and wallet addresses are
				publicly observable.
			</p>
		</footer>
	);
}
