"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BarChart3, BookOpen, FileText, LayoutGrid, LineChart, Plus, Users, Wallet } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { routes } from "@/lib/routes";
import { LANDING_URL } from "@/lib/site";

type Item = { label: string; href: string; icon: typeof LayoutGrid; match: (path: string) => boolean };

/** Figma "Sidebar / …": WORKSPACE items, PUBLIC PLATFORM, then help + network at the bottom. */
export const WORKSPACE: Item[] = [
	{ label: "Overview", href: routes.OVERVIEW, icon: LayoutGrid, match: (p) => p === "/overview" || p === "/campaigns" },
	{ label: "Create campaign", href: routes.CREATE_CAMPAIGN, icon: Plus, match: (p) => p === "/campaigns/new" },
	{ label: "Beneficiaries", href: routes.BENEFICIARIES(), icon: Users, match: (p) => p.startsWith("/beneficiaries") || p.endsWith("/apply") },
	{ label: "Fund allocation", href: routes.ALLOCATION(), icon: Wallet, match: (p) => p.startsWith("/allocation") },
	{ label: "Campaign dashboard", href: routes.CAMPAIGN("CMP-2026-001"), icon: BarChart3, match: (p) => /^\/campaigns\/(?!new$)[^/]+$/.test(p) },
	{ label: "Public ledger", href: routes.LEDGER(), icon: FileText, match: (p) => p.startsWith("/ledger") },
	{ label: "Reports", href: routes.REPORTS(), icon: LineChart, match: (p) => p.startsWith("/reports") },
];

export function SidebarNav({ onNavigate, campaignHref }: { onNavigate?: () => void; campaignHref?: string }) {
	const pathname = usePathname();
	return (
		<div className="flex h-full flex-col">
			<nav aria-label="Workspace" className="px-3 pt-6">
				<p className="label px-2.5 text-ink">Workspace</p>
				<ul className="mt-4 flex flex-col gap-2">
					{WORKSPACE.map((item) => {
						const active = item.match(pathname);
						const href = item.label === "Campaign dashboard" && campaignHref ? campaignHref : item.href;
						return (
							<li key={item.label}>
								<Link
									href={href}
									onClick={onNavigate}
									aria-current={active ? "page" : undefined}
									className={cn(
										"relative flex h-9 items-center gap-3 rounded-control px-2.5 text-xs transition-colors duration-200",
										active ? "bg-accent-soft text-accent-deep" : "text-ink hover:bg-field",
									)}
								>
									<item.icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
									{item.label}
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>
			<nav aria-label="Public platform" className="mt-10 px-3">
				<p className="label px-2.5 text-ink">Public platform</p>
				<a href={LANDING_URL} className="mt-4 flex h-9 items-center gap-3 rounded-control px-2.5 text-xs hover:bg-field">
					<ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
					View public site
				</a>
			</nav>
			<div className="mt-auto px-4 pb-5">
				<div className="mb-4 h-px bg-line" />
				<a href={`${LANDING_URL}#why-us`} className="flex items-center gap-2 px-1.5 text-xs hover:text-brand-dark">
					<BookOpen className="size-3.5" strokeWidth={1.5} aria-hidden /> Help &amp; documentation
				</a>
				<p className="mt-4 flex items-center gap-2 px-1.5 text-xs">
					<span className="size-1.5 rounded-full bg-brand" aria-hidden />
					USDC · Stellar Testnet
				</p>
			</div>
		</div>
	);
}
