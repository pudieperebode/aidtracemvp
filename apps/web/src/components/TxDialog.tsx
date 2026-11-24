"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";
import { Button } from "@repo/ui/button";
import { Notice } from "@repo/ui/surface";
import type { TxStage } from "@/lib/tx";
import { errorMessage } from "@/lib/api/errors";
import { TxProgress } from "@/components/TxProgress";
import { HashBox } from "@/components/ExplorerButton";
import { failureHint } from "@/components/FailureHint";

/**
 * The modal for one wallet-signed action: a form while idle, then the TxProgress steps, then the result (confirmed
 * hash, or what failed and that no funds moved). It can't be dismissed while the wallet or the chain is working.
 */
export function TxDialog({
	open,
	onOpenChange,
	title,
	description,
	stage,
	error,
	hash,
	explorerUrl,
	children,
	successTitle = "Confirmed on Stellar",
	successBody,
	onRetry,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: React.ReactNode;
	stage: TxStage;
	error?: unknown;
	hash?: string | null;
	/** The explorer link the backend returned for `hash`. */
	explorerUrl?: string | null;
	/** The form shown while idle. */
	children: React.ReactNode;
	successTitle?: string;
	successBody?: React.ReactNode;
	onRetry?: () => void;
}) {
	const busy = stage === "signing" || stage === "submitting";
	return (
		<Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
			<DialogContent
				showCloseButton={!busy}
				className="gap-0 rounded-panel border-0 bg-white p-5 sm:max-w-[480px] sm:p-7"
				onPointerDownOutside={(e) => busy && e.preventDefault()}
			>
				<DialogTitle className="text-lg font-normal tracking-[-0.02em]">{title}</DialogTitle>
				{description && <DialogDescription className="mt-2 text-xs leading-5 text-muted">{description}</DialogDescription>}

				{stage === "idle" ? (
					<div className="mt-5">{children}</div>
				) : (
					<div className="mt-6">
						<TxProgress stage={stage} failureText={stage === "failed" ? errorMessage(error) : undefined} />
						{stage === "confirmed" && (
							<div className="animate-pop mt-6">
								<Notice tone="success" title={successTitle}>
									{successBody}
								</Notice>
								{hash && (
									<div className="mt-3">
										<p className="caption mb-1.5">Transaction hash</p>
										<HashBox hash={hash} href={explorerUrl} />
									</div>
								)}
							</div>
						)}
						{stage === "failed" && (
							<Notice tone="error" title="Transaction failed" className="animate-pop mt-6">
								{errorMessage(error)}
								{failureHint(error)}
							</Notice>
						)}
						{stage === "pending" && (
							<Notice tone="warning" title="Still confirming" className="animate-pop mt-6">
								The outcome isn&apos;t known yet. AidTrace keeps checking Stellar and updates balances once it settles. Don&apos;t
								send it again.
							</Notice>
						)}
						<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
							{(stage === "failed" || stage === "rejected") && onRetry && (
								<Button variant="outline" size="lg" onClick={onRetry}>
									Try again
								</Button>
							)}
							{!busy && (
								<Button size="lg" onClick={() => onOpenChange(false)}>
									{stage === "confirmed" ? "Done" : "Close"}
								</Button>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
