"use client";

import { Check, Droplets, ExternalLink, Plus } from "lucide-react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { fixed2 } from "@/lib/format";
import { useToast } from "@/lib/use-toast";
import { useEnableUsdc, useFundXlm, useWalletBalances } from "@/features/wallet/hooks";

const FAUCET = "https://faucet.circle.com";

/**
 * The backend guide's administrator onboarding, after connecting: get test XLM (the account must exist), enable USDC
 * (trustline), get test USDC (Circle faucet). Without these the administrator can't fund a campaign.
 */
export function WalletSetup({ className, compact = false }: { className?: string; compact?: boolean }) {
	const toast = useToast();
	const wallet = useWalletBalances();
	const xlm = useFundXlm();
	const usdc = useEnableUsdc();
	const w = wallet.data;

	const steps = [
		{
			done: !!w?.funded,
			title: "Get test XLM",
			body: "Pays network fees. Friendbot sends 10,000 test XLM (no real value).",
			action: (
				<Button
					size="sm"
					variant="outline"
					isLoading={xlm.isPending}
					loadingText="Asking Friendbot…"
					onClick={() =>
						xlm.mutate(undefined, {
							onSuccess: () => toast.success("Test XLM added", { description: "Your wallet is active on Stellar Testnet." }),
							onError: (e) => toast.error("Friendbot didn't respond", { description: errorMessage(e) }),
						})
					}
				>
					<Droplets /> Get test XLM
				</Button>
			),
		},
		{
			done: w?.usdc != null,
			title: "Enable USDC",
			body: "Lets the wallet hold Circle's test USDC. Sets aside 0.5 XLM; you sign once.",
			action: (
				<Button
					size="sm"
					variant="outline"
					disabled={!w?.funded}
					isLoading={usdc.isPending}
					loadingText="Approve in wallet…"
					onClick={() =>
						usdc.mutate(undefined, {
							onSuccess: () => toast.success("USDC enabled", { description: "Now get test USDC from the Circle faucet." }),
							onError: (e) => toast.error("USDC wasn't enabled", { description: errorMessage(e) }),
						})
					}
				>
					<Plus /> Enable USDC
				</Button>
			),
		},
		{
			done: !!w?.usdc && BigInt(w.usdc) > 0n,
			title: "Get test USDC",
			body:
				w?.usdc != null
					? `Balance: ${fixed2(w.usdc)} USDC. Choose Stellar Testnet on the faucet and paste your address.`
					: "Choose Stellar Testnet on the faucet and paste your address.",
			action: (
				<Button asChild size="sm" variant="outline">
					<a href={FAUCET} target="_blank" rel="noreferrer">
						<ExternalLink /> Circle faucet
					</a>
				</Button>
			),
		},
	];

	if (compact && w && steps.every((s) => s.done)) return null;

	return (
		<section className={cn(!compact && "rounded-card bg-white p-4 sm:p-5", className)} aria-labelledby="wallet-setup">
			<h2 id="wallet-setup" className={compact ? "text-xs" : "h-section"}>
				Wallet setup
			</h2>
			{!compact && (
				<p className="caption mt-2">Needed before you can fund a campaign. Stellar Testnet only: nothing here has real value.</p>
			)}
			{wallet.isPending ? (
				<div className="shimmer mt-4 h-24 rounded-card" />
			) : wallet.error ? (
				<p className="caption mt-3 text-danger">{errorMessage(wallet.error)}</p>
			) : (
				<ol className={cn("flex flex-col gap-3", compact ? "mt-2" : "mt-5")}>
					{steps.map((s, i) => (
						<li key={s.title} className="flex gap-3">
							<span
								className={cn(
									"mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px]",
									s.done ? "bg-brand text-white" : "bg-field text-muted",
								)}
							>
								{s.done ? <Check className="size-3.5" aria-hidden /> : i + 1}
							</span>
							<div className="min-w-0 flex-1">
								<p className={cn("text-[13px]", s.done && "text-muted line-through")}>{s.title}</p>
								{!s.done && (
									<>
										<p className="caption mt-0.5">{s.body}</p>
										<div className="mt-2">{s.action}</div>
									</>
								)}
							</div>
						</li>
					))}
				</ol>
			)}
		</section>
	);
}
