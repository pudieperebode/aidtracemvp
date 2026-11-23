"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Field, Textarea } from "@repo/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";
import { Chip, DetailRow, Notice } from "@repo/ui/surface";
import type { BeneficiaryRecord } from "@repo/stellar/campaign";
import { fileSize, utcDateTime } from "@/lib/format";
import { IS_MOCK } from "@/lib/mode";
import { BENEFICIARY_STATUS } from "@/features/beneficiaries/status";
import { rejectionSchema } from "@/features/beneficiaries/schema";

/** "View document": the protected application (eligibility details + evidence). Administrators only. */
export function EvidenceDialog({ beneficiary, onOpenChange }: { beneficiary: BeneficiaryRecord | null; onOpenChange: (open: boolean) => void }) {
	const b = beneficiary;
	return (
		<Dialog open={!!b} onOpenChange={onOpenChange}>
			<DialogContent className="gap-0 rounded-panel border-0 bg-white p-5 sm:max-w-[520px] sm:p-7">
				{b && (
					<>
						<div className="flex items-center gap-3">
							<DialogTitle className="text-lg font-normal tracking-[-0.02em]">{b.reference}</DialogTitle>
							<Chip tone={BENEFICIARY_STATUS[b.status].tone}>{BENEFICIARY_STATUS[b.status].label}</Chip>
						</div>
						<DialogDescription className="mt-1 text-xs text-muted">Protected record · visible to campaign administrators only</DialogDescription>
						<dl className="mt-5 flex flex-col gap-2.5">
							<DetailRow label="Name or ID" value={b.name} />
							<DetailRow label="Wallet" value={<span className="font-mono text-[11px] break-all">{b.wallet}</span>} />
							<DetailRow label="Submitted" value={utcDateTime(b.created_at)} />
							{b.reviewed_at && <DetailRow label="Reviewed" value={utcDateTime(b.reviewed_at)} />}
						</dl>
						<div className="mt-5">
							<p className="text-xs">Eligibility details</p>
							<p className="mt-1.5 rounded-control bg-page p-3 text-xs leading-5">{b.eligibility_notes}</p>
						</div>
						{b.rejection_reason && (
							<Notice tone="warning" title="Rejection reason" className="mt-4">
								{b.rejection_reason}
							</Notice>
						)}
						<div className="mt-5">
							<p className="text-xs">Supporting evidence</p>
							{b.evidence.length === 0 ? (
								<p className="caption mt-1.5">No documents were uploaded.</p>
							) : (
								<ul className="mt-1.5 flex flex-col gap-1.5">
									{b.evidence.map((e) => (
										<li key={e.id} className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-xs">
											<FileText className="size-4 shrink-0 text-muted" aria-hidden />
											<span className="min-w-0 flex-1 truncate">{e.name}</span>
											<span className="caption">{fileSize(e.size)}</span>
										</li>
									))}
								</ul>
							)}
							{IS_MOCK && <p className="caption mt-2">Demo data: document previews open from protected storage once the backend is connected.</p>}
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}

/** Reject with a reason (sent to the applicant; never public). */
export function RejectDialog({
	beneficiary,
	onOpenChange,
	onConfirm,
	pending,
}: {
	beneficiary: BeneficiaryRecord | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: (reason: string) => void;
	pending: boolean;
}) {
	const [reason, setReason] = useState("");
	const [error, setError] = useState<string | undefined>();
	return (
		<Dialog
			open={!!beneficiary}
			onOpenChange={(open) => {
				if (!open) {
					setReason("");
					setError(undefined);
				}
				onOpenChange(open);
			}}
		>
			<DialogContent className="gap-0 rounded-panel border-0 bg-white p-5 sm:max-w-[460px] sm:p-7">
				<DialogTitle className="text-lg font-normal tracking-[-0.02em]">Reject {beneficiary?.reference}?</DialogTitle>
				<DialogDescription className="mt-2 text-xs leading-5 text-muted">The applicant can&apos;t receive funds from this campaign. The reason stays private.</DialogDescription>
				<form
					noValidate
					className="mt-5"
					onSubmit={(e) => {
						e.preventDefault();
						const parsed = rejectionSchema.safeParse({ reason });
						if (!parsed.success) return setError(parsed.error.issues[0]?.message);
						onConfirm(parsed.data.reason);
					}}
				>
					<Field label="Reason" htmlFor="reject-reason" error={error}>
						<Textarea id="reject-reason" rows={3} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Outside the campaign's service area." invalid={!!error} />
					</Field>
					<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" variant="reject" size="lg" isLoading={pending} loadingText="Rejecting…">
							Reject application
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
