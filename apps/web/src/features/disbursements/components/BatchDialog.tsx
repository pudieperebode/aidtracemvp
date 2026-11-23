"use client";

import { Check, CircleSlash, X } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";
import { Notice, ProgressBar } from "@repo/ui/surface";
import { Spinner } from "@repo/ui/spinner";
import { cn } from "@repo/ui/lib/utils";
import { toStroops } from "@repo/stellar/format";
import { fixed2 } from "@/lib/format";
import { HashLink } from "@/components/ExplorerButton";
import type { ItemState, PayoutItem } from "@/features/disbursements/hooks";

const LABEL: Record<ItemState["status"], string> = {
	queued: "Waiting",
	allocating: "Authorizing allocation…",
	signing: "Approve in wallet…",
	submitting: "Recording on Stellar…",
	confirmed: "Paid",
	failed: "Failed",
	rejected: "Declined in wallet",
	skipped: "Not sent",
};

/**
 * The batch payout run (Deliverable 2 "Batch processing"): one row per beneficiary with its live state, the overall
 * progress, then a summary. Funds move only for rows marked Paid; failures deduct nothing.
 */
export function BatchDialog({
	open,
	onOpenChange,
	items,
	states,
	running,
	summary,
	onStop,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: PayoutItem[];
	states: Record<string, ItemState>;
	running: boolean;
	summary: { confirmed: number; failed: number; skipped: number };
	onStop: () => void;
}) {
	const done = items.filter((i) => ["confirmed", "failed", "rejected", "skipped"].includes(states[i.beneficiaryId]?.status ?? "")).length;
	const paidTotal = items.filter((i) => states[i.beneficiaryId]?.status === "confirmed").reduce((s, i) => s + toStroops(i.amount), 0n);

	return (
		<Dialog open={open} onOpenChange={(next) => !running && onOpenChange(next)}>
			<DialogContent showCloseButton={!running} onPointerDownOutside={(e) => running && e.preventDefault()} className="gap-0 rounded-panel border-0 bg-white p-5 sm:max-w-[560px] sm:p-7">
				<DialogTitle className="text-lg font-normal tracking-[-0.02em]">{running ? "Executing payments" : "Payment run complete"}</DialogTitle>
				<DialogDescription className="mt-2 text-xs leading-5 text-muted">
					Each payout is signed by your administrator wallet and confirmed by the AidTrace contract, one beneficiary at a time.
				</DialogDescription>

				<ProgressBar value={items.length ? (done / items.length) * 100 : 0} tone="brand" className="mt-5" label="Batch progress" />
				<p className="caption mt-2">
					{done} of {items.length} processed
				</p>

				<ul className="mt-4 flex max-h-[320px] flex-col overflow-y-auto rounded-card border border-line">
					{items.map((item) => {
						const s = states[item.beneficiaryId] ?? { status: "queued" };
						const live = s.status === "allocating" || s.status === "signing" || s.status === "submitting";
						return (
							<li key={item.beneficiaryId} className={cn("flex items-center gap-3 border-b border-line px-3 py-2.5 text-xs last:border-0", live && "bg-page")}>
								<span
									className={cn(
										"flex size-6 shrink-0 items-center justify-center rounded-full",
										s.status === "confirmed" ? "bg-brand text-white" : s.status === "failed" ? "bg-danger-bg text-danger" : live ? "bg-brand-soft text-brand-dark" : "bg-field text-muted",
									)}
								>
									{s.status === "confirmed" ? (
										<Check className="animate-pop size-3.5" />
									) : s.status === "failed" ? (
										<X className="size-3.5" />
									) : s.status === "rejected" || s.status === "skipped" ? (
										<CircleSlash className="size-3.5" />
									) : live ? (
										<Spinner className="size-3" />
									) : null}
								</span>
								<span className="w-[78px] shrink-0">{item.reference}</span>
								<span className="w-[70px] shrink-0 text-right tabular-nums">{fixed2(toStroops(item.amount))}</span>
								<span className="min-w-0 flex-1 text-right">
									{s.status === "confirmed" ? (
										<HashLink hash={s.hash} head={6} />
									) : (
										<span className={cn(s.status === "failed" ? "text-danger" : "text-muted")} title={s.status === "failed" ? s.message : undefined}>
											{LABEL[s.status]}
										</span>
									)}
								</span>
							</li>
						);
					})}
				</ul>

				{!running && (
					<div className="animate-pop mt-5 flex flex-col gap-2">
						{summary.confirmed > 0 && (
							<Notice tone="success" title={`${summary.confirmed} payment${summary.confirmed === 1 ? "" : "s"} confirmed · ${fixed2(paidTotal)} USDC`}>
								Recorded on Stellar and on the public ledger.
							</Notice>
						)}
						{summary.failed > 0 && (
							<Notice tone="error" title={`${summary.failed} payment${summary.failed === 1 ? "" : "s"} failed`}>
								{items.map((i) => states[i.beneficiaryId]).find((s): s is Extract<ItemState, { status: "failed" }> => s?.status === "failed")?.message} No funds were deducted
								for failed payments; you can retry them.
							</Notice>
						)}
						{summary.skipped > 0 && (
							<Notice tone="warning" title={`${summary.skipped} not sent`}>
								The batch stopped when a signature was declined. Nothing was submitted for these beneficiaries.
							</Notice>
						)}
					</div>
				)}

				<div className="mt-6 flex justify-end gap-2">
					{running ? (
						<Button variant="outline" size="lg" onClick={onStop}>
							Stop after current
						</Button>
					) : (
						<Button size="lg" onClick={() => onOpenChange(false)}>
							Done
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
