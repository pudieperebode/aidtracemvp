"use client";

import { X } from "lucide-react";
import { Spinner } from "@repo/ui/spinner";
import { cn } from "@repo/ui/lib/utils";
import type { TxStage } from "@/lib/tx";

const STEPS = [
	{ key: "signing", label: "Approve in your wallet", hint: "Check the campaign, amount and Testnet network before signing." },
	{ key: "submitting", label: "Recording on Stellar", hint: "Waiting for the ledger to close and the contract to confirm (about 5 seconds)." },
	{ key: "confirmed", label: "Confirmed on chain", hint: "Verified on Stellar. Balances and the public ledger are updated." },
] as const;

/**
 * The pending → confirmed treatment shared by every wallet-signed action: three steps with the current one live,
 * a drawn tick when done, a cross where it stopped. A UI status is never proof of payment, so "Confirmed" only
 * appears after the backend verified the transaction.
 */
export function TxProgress({ stage, failureText, className }: { stage: TxStage; failureText?: string; className?: string }) {
	const index = stage === "signing" || stage === "rejected" ? 0 : stage === "submitting" || stage === "failed" ? 1 : stage === "confirmed" ? 2 : -1;
	const stopped = stage === "rejected" || stage === "failed";

	return (
		<ol className={cn("relative flex flex-col gap-4", className)} aria-live="polite">
			{STEPS.map((step, i) => {
				const done = i < index || stage === "confirmed";
				const current = i === index && !done;
				return (
					<li key={step.key} className={cn("relative flex gap-3 transition-opacity duration-300", i > index && "opacity-40")}>
						{i < STEPS.length - 1 && (
							<span aria-hidden className={cn("absolute top-7 left-[13px] h-[calc(100%-12px)] w-px", done ? "bg-brand" : "bg-line")} />
						)}
						<span
							className={cn(
								"relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
								done ? "bg-brand text-white" : current && stopped ? "bg-accent-soft text-accent-deep" : current ? "bg-brand-soft text-brand-dark" : "bg-field text-muted",
							)}
						>
							{done ? (
								<svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
									<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="animate-check" />
								</svg>
							) : current && stopped ? (
								<X className="size-4" aria-hidden />
							) : current ? (
								<Spinner className="size-3.5" />
							) : (
								<span className="text-xs">{i + 1}</span>
							)}
						</span>
						<span className="min-w-0 pb-1">
							<span className="block text-[13px]">{step.label}</span>
							{(current || (done && i === 2)) && (
								<span className="caption mt-0.5 block">
									{current && stopped ? (stage === "rejected" ? "Declined in your wallet. Nothing was submitted." : (failureText ?? "This step didn't complete. No funds moved.")) : step.hint}
								</span>
							)}
						</span>
					</li>
				);
			})}
		</ol>
	);
}
