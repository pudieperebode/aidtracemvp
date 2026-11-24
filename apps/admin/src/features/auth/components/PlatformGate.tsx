"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@repo/ui/button";
import { useHydrated } from "@/lib/hydrated";
import { CardSkeleton, ErrorState } from "@/components/states";
import { useAccess, useSignOut } from "@/features/auth/hooks";
import { useSignInDialog } from "@/features/auth/dialog";
import { APP_URL } from "@/lib/site";

/**
 * Console access (backend guide §14): signed out → sign in; signed in without `roles.platformAdmin` (or a 403) → no
 * access, with a way out; otherwise the screen.
 */
export function PlatformGate({ children }: { children: React.ReactNode }) {
	const hydrated = useHydrated();
	const access = useAccess();
	const openSignIn = useSignInDialog((s) => s.setOpen);
	const signOut = useSignOut();

	if (!hydrated || access.state === "checking") return <CardSkeleton className="min-h-[320px]" lines={6} />;
	if (access.state === "error")
		return (
			<div className="rounded-card bg-white">
				<ErrorState error={access.error} onRetry={access.retry} />
			</div>
		);
	if (access.state === "granted") return <>{children}</>;

	const denied = access.state === "denied";
	return (
		<section className="animate-rise mx-auto mt-8 flex max-w-[480px] flex-col items-center rounded-card bg-white px-6 py-10 text-center">
			<span className="flex size-11 items-center justify-center rounded-card bg-field">
				{denied ? (
					<ShieldAlert className="size-5 text-accent-deep" aria-hidden />
				) : (
					<ShieldCheck className="size-5" aria-hidden />
				)}
			</span>
			<h1 className="mt-5 text-base">{denied ? "No platform access" : "Platform administrators only"}</h1>
			<p className="caption mt-2 max-w-[360px]">
				{denied
					? "This wallet isn't a platform administrator. Organization administrators manage their campaigns in the organization app."
					: "Sign in with a wallet the backend lists as a platform administrator. Signing proves ownership; it can't move funds."}
			</p>
			<div className="mt-6 flex flex-col gap-2 sm:flex-row">
				{denied ? (
					<>
						<Button variant="outline" onClick={() => void signOut()}>
							Use another wallet
						</Button>
						<Button asChild>
							<a href={APP_URL}>Open the organization app</a>
						</Button>
					</>
				) : (
					<Button onClick={() => openSignIn(true)}>Sign in</Button>
				)}
			</div>
		</section>
	);
}
