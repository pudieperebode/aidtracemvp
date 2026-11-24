"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { AidTraceMark } from "@repo/ui/brand";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";
import { Notice } from "@repo/ui/surface";
import { shortKey } from "@repo/stellar/format";
import { DEMO_ADMIN_WALLET } from "@repo/mock/seed";
import { IS_MOCK } from "@/lib/mode";
import { useToast } from "@/lib/use-toast";
import { useDemoSignIn } from "@/features/auth/hooks";
import { ConnectModal } from "@/features/wallet/components/ConnectModal";
import type { WalletId } from "@/features/wallet/kit";
import { useWalletStore } from "@/features/wallet/store";

/**
 * Administrator sign-in, opened from the header's "Admin" button or an admin-only screen. Live mode: the wallet modal
 * (Varial extension, Varial Mobile, xBull; connect, then sign the backend's challenge transaction, which can never be
 * submitted). Mock mode: the demo administrator wallet runs the same challenge → sign → verify sequence, simulated.
 */
export function SignInDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
	const address = useWalletStore((s) => s.address);
	const walletId = useWalletStore((s) => s.walletId);
	if (!IS_MOCK) {
		return (
			<ConnectModal
				open={open}
				onOpenChange={onOpenChange}
				resume={address && walletId && walletId !== "demo" ? { address, walletId: walletId as WalletId } : undefined}
			/>
		);
	}
	return <DemoSignIn open={open} onOpenChange={onOpenChange} />;
}

function DemoSignIn({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
	const { signIn, status, error } = useDemoSignIn();
	const toast = useToast();
	const signing = status === "signing";

	return (
		<Dialog open={open} onOpenChange={(next) => !signing && onOpenChange(next)}>
			<DialogContent className="gap-0 rounded-panel border-0 bg-white p-6 sm:max-w-[460px] sm:p-7">
				<AidTraceMark className="size-9" />
				<DialogTitle className="mt-5 text-xl font-normal tracking-[-0.02em]">Sign in as an administrator</DialogTitle>
				<DialogDescription className="mt-2 text-xs leading-5 text-muted">
					Administrators create campaigns, review beneficiaries and authorize USDC payouts. Your wallet is your account: sign once
					to prove you own it. It cannot move any funds.
				</DialogDescription>

				<div className="mt-5 flex items-center gap-3 rounded-card border border-line p-3.5">
					<span className="flex size-9 items-center justify-center rounded-control bg-brand-soft text-brand-dark">
						<ShieldCheck className="size-4" aria-hidden />
					</span>
					<div className="min-w-0 flex-1">
						<p className="text-[13px]">Demo administrator wallet</p>
						<p className="caption font-mono">{shortKey(DEMO_ADMIN_WALLET, 6, 6)} · Stellar Testnet</p>
					</div>
				</div>

				{status === "error" && (
					<Notice tone="error" title="Sign-in didn't complete" className="mt-4">
						{error}
					</Notice>
				)}

				<Notice tone="info" title="You're using simulated data" className="mt-4">
					Signatures and transactions are simulated until the backend is connected. Use the Demo panel (bottom left) to slow the
					network down or make the next transaction fail.
				</Notice>

				<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={signing}>
						Cancel
					</Button>
					<Button
						size="lg"
						isLoading={signing}
						loadingText="Approve in wallet…"
						onClick={async () => {
							if (await signIn()) {
								onOpenChange(false);
								toast.success("Signed in as administrator", {
									description: "You can now manage campaigns, beneficiaries and payouts.",
								});
							}
						}}
					>
						<KeyRound /> Sign in with demo wallet
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
