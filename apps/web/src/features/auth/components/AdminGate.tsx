"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { routes } from "@/lib/routes";
import { useHydrated } from "@/lib/hydrated";
import { useIsSignedIn, useMe } from "@/features/auth/hooks";
import { useSignInDialog } from "@/features/auth/dialog";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/states";
import { RegisterOrganization } from "@/features/auth/components/RegisterOrganization";

/**
 * Administrator-only screens (create campaign, beneficiaries, fund allocation, reports). Signed-out visitors keep the
 * page title and see why they need to connect a wallet. A signed-in wallet without an organization registers one first
 * (`roles.organizationAdmin` from `GET /auth/me`). Protected beneficiary data never loads without a session.
 */
export function AdminGate({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
	const hydrated = useHydrated();
	const signedIn = useIsSignedIn();
	const me = useMe();
	const openSignIn = useSignInDialog((s) => s.setOpen);

	if (!hydrated || (signedIn && me.isPending)) {
		return (
			<div aria-busy aria-label="Loading">
				<Skeleton className="h-6 w-56" />
				<Skeleton className="mt-4 h-3 w-80 max-w-full" />
				<Skeleton className="mt-8 h-[300px] w-full rounded-card" />
			</div>
		);
	}
	if (signedIn && me.error) {
		return (
			<>
				<PageHeader title={title} subtitle={subtitle} />
				<div className="rounded-card bg-white">
					<ErrorState error={me.error} onRetry={() => me.refetch()} />
				</div>
			</>
		);
	}
	if (signedIn && me.data?.roles.organizationAdmin) return <>{children}</>;
	if (signedIn) {
		return (
			<>
				<PageHeader title={title} subtitle={subtitle} />
				<RegisterOrganization />
			</>
		);
	}

	return (
		<>
			<PageHeader title={title} subtitle={subtitle} />
			<section className="animate-pop flex flex-col items-center rounded-card bg-white px-5 py-14 text-center sm:py-20">
				<span className="flex size-11 items-center justify-center rounded-card bg-field">
					<LockKeyhole className="size-5" aria-hidden />
				</span>
				<h2 className="mt-5 text-base">Administrator access</h2>
				<p className="caption mt-2 max-w-[420px]">
					Connect your organization&apos;s administrator wallet to manage campaigns, review beneficiaries and authorize payouts.
					Your wallet is your account; beneficiary records stay private to administrators.
				</p>
				<div className="mt-6 flex flex-wrap justify-center gap-2">
					<Button onClick={() => openSignIn(true)}>Connect wallet</Button>
					<Button asChild variant="outline">
						<Link href={routes.LEDGER()}>View the public ledger</Link>
					</Button>
				</div>
			</section>
		</>
	);
}
