"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@repo/ui/button";
import { routes } from "@/lib/routes";

/**
 * The full error treatment (route and app error boundaries): a broken trace line, what happened, that funds are safe,
 * what to do next and a reference to quote.
 */
export function ErrorScreen({ retry, digest, inline = false }: { retry: () => void; digest?: string; inline?: boolean }) {
	return (
		<div
			className={
				inline
					? "flex min-h-[60vh] items-center justify-center py-10"
					: "flex min-h-dvh items-center justify-center bg-page px-4 py-10"
			}
		>
			<div className="animate-pop flex max-w-[480px] flex-col items-center text-center">
				<BrokenTrace />
				<h1 className="h-page mt-8">Something interrupted the trace</h1>
				<p className="mt-3 text-[13px] leading-6 text-muted">
					This screen hit an unexpected problem. Campaign funds are held in escrow on Stellar and are not affected, and nothing was
					sent on your behalf.
				</p>
				{digest && <p className="caption mt-2 font-mono">Reference {digest}</p>}
				<div className="mt-8 flex flex-wrap justify-center gap-2">
					<Button size="lg" onClick={retry}>
						<RotateCcw /> Try again
					</Button>
					<Button asChild variant="outline" size="lg" className="bg-white">
						<Link href={routes.OVERVIEW}>Back to overview</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}

/** Donor → escrow → beneficiary, with the line broken before the last stop. */
function BrokenTrace() {
	return (
		<svg viewBox="0 0 220 60" className="h-[60px] w-[220px]" fill="none" aria-hidden>
			<path d="M20 30h70" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" />
			<path d="M130 30h22" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" />
			<path d="M164 30h14" stroke="var(--color-line-strong)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" />
			<circle cx="16" cy="30" r="8" fill="var(--color-brand-soft)" stroke="var(--color-brand)" strokeWidth="2" />
			<rect x="94" y="14" width="32" height="32" rx="6" fill="var(--color-ink)" />
			<path d="M110 22v16M102 30h16" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
			<circle cx="196" cy="30" r="9" fill="var(--color-accent-soft)" stroke="var(--color-accent)" strokeWidth="2" />
			<path d="m192.5 26.5 7 7m0-7-7 7" stroke="var(--color-accent-dark)" strokeWidth="1.8" strokeLinecap="round" />
		</svg>
	);
}
