"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	ArrowLeftRight,
	ArrowUpRight,
	Building2,
	FileClock,
	FolderKanban,
	HandCoins,
	LayoutGrid,
	ScanSearch,
	UserRound,
	Users,
	Vault,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { routes } from "@/lib/routes";
import { APP_URL, LANDING_URL } from "@/lib/site";

type Item = { label: string; href: string; icon: typeof LayoutGrid };

/** The console's areas, grouped like the backend guide §14 table. Same sidebar pattern as the organization app. */
export const NAV: { title: string; items: Item[] }[] = [
	{ title: "Platform", items: [{ label: "Overview", href: routes.OVERVIEW, icon: LayoutGrid }] },
	{
		title: "Accounts",
		items: [
			{ label: "Users", href: routes.USERS, icon: UserRound },
			{ label: "Organizations", href: routes.ORGANIZATIONS, icon: Building2 },
		],
	},
	{
		title: "Campaigns",
		items: [
			{ label: "Campaigns", href: routes.CAMPAIGNS, icon: FolderKanban },
			{ label: "Beneficiaries", href: routes.BENEFICIARIES, icon: Users },
			{ label: "Allocations", href: routes.ALLOCATIONS, icon: HandCoins },
		],
	},
	{
		title: "Money",
		items: [
			{ label: "Transactions", href: routes.TRANSACTIONS, icon: ArrowLeftRight },
			{ label: "Escrow", href: routes.ESCROW, icon: Vault },
			{ label: "Reconciliation", href: routes.RECONCILIATION, icon: ScanSearch },
		],
	},
	{ title: "Audit", items: [{ label: "Logs", href: routes.LOGS, icon: FileClock }] },
];

const isActive = (href: string, path: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
	const pathname = usePathname();
	return (
		<div className="flex h-full flex-col">
			<div className="flex flex-col gap-6 px-3 pt-6">
				{NAV.map((group) => (
					<nav key={group.title} aria-label={group.title}>
						<p className="label px-2.5 text-ink">{group.title}</p>
						<ul className="mt-2 flex flex-col gap-1">
							{group.items.map((item) => {
								const active = isActive(item.href, pathname);
								return (
									<li key={item.href}>
										<Link
											href={item.href}
											onClick={onNavigate}
											aria-current={active ? "page" : undefined}
											className={cn(
												"flex h-9 items-center gap-3 rounded-control px-2.5 text-xs transition-colors duration-200",
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
				))}
			</div>
			<div className="mt-auto px-4 pt-6 pb-5">
				<div className="mb-4 h-px bg-line" />
				<a href={APP_URL} className="flex items-center gap-2 px-1.5 text-xs hover:text-brand-dark">
					<ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden /> Organization app
				</a>
				<a href={LANDING_URL} className="mt-3 flex items-center gap-2 px-1.5 text-xs hover:text-brand-dark">
					<ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden /> Public site
				</a>
				<p className="mt-4 flex items-center gap-2 px-1.5 text-xs">
					<span className="size-1.5 rounded-full bg-brand" aria-hidden />
					USDC · Stellar Testnet
				</p>
			</div>
		</div>
	);
}

/** Breadcrumb label for the current path. */
export function sectionOf(pathname: string) {
	for (const group of NAV) for (const item of group.items) if (isActive(item.href, pathname)) return item.label;
	return "Overview";
}
