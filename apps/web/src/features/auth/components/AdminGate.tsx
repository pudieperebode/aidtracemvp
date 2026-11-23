"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { routes } from "@/lib/routes";
import { useHydrated } from "@/lib/hydrated";
import { useIsAdmin } from "@/features/auth/hooks";
import { useSignInDialog } from "@/features/auth/dialog";
import { PageHeader } from "@/components/PageHeader";

/**
 * Administrator-only screens (create campaign, beneficiaries, fund allocation, reports). Signed-out visitors keep the
 * page title and see why they need to sign in, with a way to the public views instead. Protected beneficiary data
 * never loads without a session (PRD test 16).
 */
export function AdminGate({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
	const hydrated = useHydrated();
	const isAdmin = useIsAdmin();
	const openSignIn = useSignInDialog((s) => s.setOpen);

	if (!hydrated) {
		return (
			<div aria-busy aria-label="Loading">
				<Skeleton className="h-6 w-56" />
				<Skeleton className="mt-4 h-3 w-80 max-w-full" />
				<Skeleton className="mt-8 h-[300px] w-full rounded-card" />
			</div>
		);
	}
	if (isAdmin) return <>{children}</>;

	return (
		<>
			<PageHeader title={title} subtitle={subtitle} />
			<section className="animate-pop flex flex-col items-center rounded-card bg-white px-5 py-14 text-center sm:py-20">
				<span className="flex size-11 items-center justify-center rounded-card bg-field">
					<LockKeyhole className="size-5" aria-hidden />
				</span>
				<h2 className="mt-5 text-base">Administrator access</h2>
				<p className="caption mt-2 max-w-[420px]">
					Sign in with your organization&apos;s administrator wallet to manage campaigns, review beneficiaries and authorize payouts. Beneficiary records stay
					private to administrators.
				</p>
				<div className="mt-6 flex flex-wrap justify-center gap-2">
					<Button onClick={() => openSignIn(true)}>Sign in as admin</Button>
					<Button asChild variant="outline">
						<Link href={routes.LEDGER()}>View the public ledger</Link>
					</Button>
				</div>
			</section>
		</>
	);
}
