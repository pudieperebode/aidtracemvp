"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { AidTraceLogo } from "@repo/ui/brand";
import { Button } from "@repo/ui/button";
import { SearchInput } from "@repo/ui/field";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@repo/ui/sheet";
import { routes } from "@/lib/routes";
import { useHydrated } from "@/lib/hydrated";
import { IS_MOCK } from "@/lib/mode";
import { useIsAdmin } from "@/features/auth/hooks";
import { useSignInDialog } from "@/features/auth/dialog";
import { SignInDialog } from "@/features/auth/components/SignInDialog";
import { SidebarNav } from "@/components/layouts/Sidebar";
import { WalletMenu } from "@/components/layouts/WalletMenu";
import { NotificationsBell } from "@/components/layouts/NotificationsBell";
import { Notifier } from "@/components/providers/Notifier";
import { DemoPanel } from "@/mock/DemoPanel";

/** Breadcrumb labels by first path segment (Figma: "Home / Campaigns / Overview"). */
function crumbs(pathname: string): string[] {
	const [first, second, third] = pathname.split("/").filter(Boolean);
	const name: Record<string, string> = {
		overview: "Overview",
		beneficiaries: "Beneficiaries",
		allocation: "Fund allocation",
		ledger: "Public ledger",
		reports: "Reports",
	};
	if (first === "campaigns") {
		if (!second) return ["Home", "Campaigns"];
		if (second === "new") return ["Home", "Campaigns", "Create campaign"];
		return third === "apply" ? ["Home", "Campaigns", decodeURIComponent(second), "Apply"] : ["Home", "Campaigns", decodeURIComponent(second)];
	}
	return ["Home", "Campaigns", name[first ?? ""] ?? "Overview"];
}

/**
 * The app frame from every Figma screen: 64px header (mark + name, breadcrumb, search, bell, Admin) and a 208px
 * sidebar from `lg`. Below `lg` the header keeps the mark, bell and a menu button that slides the sidebar in.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const hydrated = useHydrated();
	const isAdmin = useIsAdmin();
	const signInOpen = useSignInDialog((s) => s.open);
	const setSignInOpen = useSignInDialog((s) => s.setOpen);
	const [menuOpen, setMenuOpen] = useState(false);
	const signedIn = hydrated && isAdmin;

	// The live wallet modal finishes by connecting the wallet; close the dialog once the session exists.
	useEffect(() => {
		if (signedIn && signInOpen) setSignInOpen(false);
	}, [signedIn, signInOpen, setSignInOpen]);

	const search = (
		<form
			role="search"
			onSubmit={(e) => {
				e.preventDefault();
				const q = new FormData(e.currentTarget).get("q")?.toString().trim();
				router.push(routes.LEDGER(q ? { q } : {}));
			}}
		>
			<SearchInput name="q" tone="field" placeholder="Search campaigns or transactions" aria-label="Search campaigns or transactions" className="h-[30px] w-[246px]" />
		</form>
	);

	const account = signedIn ? (
		<WalletMenu />
	) : (
		<Button size="sm" className="h-[29px] px-4" onClick={() => setSignInOpen(true)} disabled={!hydrated}>
			Admin
		</Button>
	);

	const trail = crumbs(pathname);

	return (
		<div className="min-h-dvh bg-page">
			<a href="#main" className="sr-only z-[100] rounded-control bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
				Skip to content
			</a>
			<header className="sticky top-0 z-40 flex h-16 items-center border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
				<div className="flex h-full w-full items-center gap-3 px-4 lg:px-5">
					<Link href={routes.OVERVIEW} aria-label="AidTrace overview" className="shrink-0 rounded-control lg:w-[194px]">
						<AidTraceLogo />
					</Link>
					<nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 truncate text-xs lg:block">
						<ol className="flex items-center gap-1.5">
							{trail.map((c, i) => (
								<li key={`${c}-${i}`} className="flex items-center gap-1.5">
									{i > 0 && <span aria-hidden>/</span>}
									<span aria-current={i === trail.length - 1 ? "page" : undefined} className={i === trail.length - 1 ? "text-ink" : "text-ink/80"}>
										{c}
									</span>
								</li>
							))}
						</ol>
					</nav>
					<div className="ml-auto flex items-center gap-2 sm:gap-4">
						<div className="hidden md:block">{search}</div>
						{signedIn ? (
							<NotificationsBell />
						) : (
							<span className="hidden size-9 items-center justify-center text-ink/40 sm:flex" title="Sign in to see notifications">
								<Bell className="size-4" strokeWidth={1.5} aria-hidden />
							</span>
						)}
						<div className="hidden sm:block">{account}</div>
						<Sheet open={menuOpen} onOpenChange={setMenuOpen}>
							<SheetTrigger className="flex size-9 cursor-pointer items-center justify-center rounded-control hover:bg-field lg:hidden" aria-label="Open menu">
								<Menu className="size-5" strokeWidth={1.5} />
							</SheetTrigger>
							<SheetContent>
								<SheetTitle className="flex h-16 shrink-0 items-center border-b border-line px-5">
									<AidTraceLogo />
								</SheetTitle>
								<div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:hidden">
									{account}
								</div>
								<div className="border-b border-line px-5 py-4 md:hidden">{search}</div>
								<div className="min-h-0 flex-1 overflow-y-auto">
									<SidebarNav onNavigate={() => setMenuOpen(false)} />
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</header>

			<div className="flex">
				<aside className="sticky top-16 hidden h-[calc(100dvh-64px)] w-[208px] shrink-0 border-r border-line bg-white lg:block">
					<SidebarNav />
				</aside>
				<main id="main" className="min-w-0 flex-1 px-4 pt-6 pb-24 sm:px-6 sm:pt-7 lg:px-7">
					<div className="mx-auto w-full max-w-[1400px]">{children}</div>
				</main>
			</div>

			<SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
			{signedIn && <Notifier />}
			{IS_MOCK && <DemoPanel />}
		</div>
	);
}
