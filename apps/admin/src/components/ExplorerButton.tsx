"use client";

import { ArrowUpRight, Copy } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { explorer } from "@repo/stellar/network";
import { shortHash } from "@/lib/format";
import { IS_MOCK } from "@/lib/mode";
import { useToast } from "@/lib/use-toast";

/**
 * Transaction hash with a Stellar Expert link (Figma ledger: "0x7f8a…91c0 ↗"). Pass the `href` the backend returned
 * (`explorerUrl`); the guide asks clients not to build explorer links themselves. In mock mode the hashes aren't on
 * chain, so the link explains that instead of opening a page that would 404.
 */
export function HashLink({
	hash,
	href,
	className,
	head = 8,
}: {
	hash: string;
	href?: string | null;
	className?: string;
	head?: number;
}) {
	const toast = useToast();
	const label = <span className="font-mono text-[11px] tracking-normal sm:text-xs">{shortHash(hash, head, 4)}</span>;
	if (IS_MOCK) {
		return (
			<button
				type="button"
				onClick={() =>
					toast.info("Simulated transaction", {
						description: "Mock data isn't on Stellar Testnet. In live mode this opens the transaction on Stellar Expert.",
					})
				}
				className={cn("group inline-flex cursor-pointer items-center gap-2 text-ink hover:text-brand-dark", className)}
				title={hash}
			>
				{label}
				<ArrowUpRight
					className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
					aria-hidden
				/>
			</button>
		);
	}
	return (
		<a
			href={href || explorer.tx(hash)}
			target="_blank"
			rel="noreferrer"
			title={hash}
			className={cn("group inline-flex items-center gap-2 text-ink hover:text-brand-dark", className)}
		>
			{label}
			<ArrowUpRight
				className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
				aria-hidden
			/>
			<span className="sr-only">View on Stellar Expert (opens in a new tab)</span>
		</a>
	);
}

/** The grey hash box with an arrow (Figma "Latest payment confirmation · Transaction hash"). */
export function HashBox({ hash, href }: { hash: string; href?: string | null }) {
	const toast = useToast();
	return (
		<div className="flex h-9 items-center justify-between gap-2 rounded-control bg-line px-3">
			<HashLink hash={hash} href={href} head={10} className="min-w-0" />
			<button
				type="button"
				className="cursor-pointer text-muted hover:text-ink"
				onClick={async () => {
					await navigator.clipboard.writeText(hash);
					toast.success("Transaction hash copied");
				}}
				aria-label="Copy transaction hash"
			>
				<Copy className="size-3.5" />
			</button>
		</div>
	);
}

/** A toast action that opens a real Testnet transaction. */
export function explorerAction(hash: string | null | undefined, href?: string | null) {
	if (!hash || IS_MOCK) return undefined;
	return { label: "View on Explorer", onClick: () => window.open(href || explorer.tx(hash), "_blank", "noopener") };
}
