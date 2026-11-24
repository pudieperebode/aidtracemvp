"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { AidTraceLogo } from "@repo/ui/brand";
import { Button } from "@repo/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@repo/ui/sheet";
import { shortKey } from "@repo/stellar/format";
import { routes } from "@/lib/routes";
import { useHydrated } from "@/lib/hydrated";
import { useSession } from "@/features/auth/store";
import { useIsSignedIn, useSignOut } from "@/features/auth/hooks";
import { useSignInDialog } from "@/features/auth/dialog";
import { SignInDialog } from "@/features/auth/components/SignInDialog";
import { PlatformGate } from "@/features/auth/components/PlatformGate";
import { sectionOf, SidebarNav } from "@/components/layouts/Sidebar";

/**
 * The console frame, the organization app's shell pattern: 64px header (logo, "Admin console" badge, breadcrumb,
 * account) and a 208px sidebar from `lg` (drawer below). Every screen sits behind the platform-admin gate.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const hydrated = useHydrated();
	const isSignedIn = useIsSignedIn();
	const address = useSession((s) => s.address);
	const signOut = useSignOut();
	const signInOpen = useSignInDialog((s) => s.open);
	const setSignInOpen = useSignInDialog((s) => s.setOpen);
	const [menuOpen, setMenuOpen] = useState(false);
	const signedIn = hydrated && isSignedIn;

	// The live wallet modal finishes by connecting the wallet; close the dialog once the session exists.
	useEffect(() => {
		if (signedIn && signInOpen) setSignInOpen(false);
	}, [signedIn, signInOpen, setSignInOpen]);

	const account = signedIn ? (
		<div className="flex items-center gap-2">
			<span
				className="hidden rounded-control bg-field px-2.5 py-1.5 font-mono text-[11px] sm:inline"
				title={address ?? undefined}
			>
				{address ? shortKey(address, 4, 4) : ""}
			</span>
			<Button variant="ghost" size="sm" onClick={() => void signOut()}>
				<LogOut /> Sign out
			</Button>
		</div>
	) : (
		<Button size="sm" className="h-[29px] px-4" onClick={() => setSignInOpen(true)} disabled={!hydrated}>
			Sign in
		</Button>
	);

	return (
		<div className="min-h-dvh bg-page">
			<a
				href="#main"
				className="sr-only z-[100] rounded-control bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
			>
				Skip to content
			</a>
			<header className="sticky top-0 z-40 flex h-16 items-center border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
				<div className="flex h-full w-full items-center gap-3 px-4 lg:px-5">
					<Link
						href={routes.OVERVIEW}
						aria-label="Admin console overview"
						className="flex shrink-0 items-center gap-2 lg:w-[194px]"
					>
						<AidTraceLogo />
						<span className="flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[10px] text-white">
							<ShieldCheck className="size-3" aria-hidden /> Admin
						</span>
					</Link>
					<nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 truncate text-xs lg:block">
						<ol className="flex items-center gap-1.5">
							<li className="text-ink/80">Console</li>
							<li aria-hidden>/</li>
							<li aria-current="page">{sectionOf(pathname)}</li>
						</ol>
					</nav>
					<div className="ml-auto flex items-center gap-2 sm:gap-4">
						<div className="hidden sm:block">{account}</div>
						<Sheet open={menuOpen} onOpenChange={setMenuOpen}>
							<SheetTrigger
								className="flex size-9 cursor-pointer items-center justify-center rounded-control hover:bg-field lg:hidden"
								aria-label="Open menu"
							>
								<Menu className="size-5" strokeWidth={1.5} />
							</SheetTrigger>
							<SheetContent>
								<SheetTitle className="flex h-16 shrink-0 items-center border-b border-line px-5">
									<AidTraceLogo />
								</SheetTitle>
								<div className="border-b border-line px-5 py-4 sm:hidden">{account}</div>
								<div className="min-h-0 flex-1 overflow-y-auto">
									<SidebarNav onNavigate={() => setMenuOpen(false)} />
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</header>
			<div className="flex">
				<aside className="sticky top-16 hidden h-[calc(100dvh-64px)] w-[208px] shrink-0 overflow-y-auto border-r border-line bg-white lg:block">
					<SidebarNav />
				</aside>
				<main id="main" className="min-w-0 flex-1 px-4 pt-6 pb-24 sm:px-6 sm:pt-7 lg:px-7">
					<div className="mx-auto w-full max-w-[1400px]">
						<PlatformGate>{children}</PlatformGate>
					</div>
				</main>
			</div>
			<SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
		</div>
	);
}
