"use client";

import { useState } from "react";
import { Download, FileText, Mail } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Field, Textarea } from "@repo/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";
import { Chip, DetailRow, Notice } from "@repo/ui/surface";
import type { Beneficiary, BeneficiaryStage } from "@repo/stellar/campaign";
import { errorMessage } from "@/lib/api/errors";
import { fileSize, utcDateTime } from "@/lib/format";
import { IS_MOCK } from "@/lib/mode";
import { useToast } from "@/lib/use-toast";
import { ErrorState } from "@/components/states";
import { BENEFICIARY_STATUS } from "@/features/beneficiaries/status";
import { reviewNoteSchema } from "@/features/beneficiaries/schema";
import { useBeneficiaryRecord, useDownloadEvidence, useResendStatusLink } from "@/features/beneficiaries/hooks";

const ext = (contentType: string) =>
	contentType === "application/pdf" ? "pdf" : contentType === "image/png" ? "png" : contentType === "image/jpeg" ? "jpg" : "bin";

/**
 * "View record": the protected application (contact, eligibility details, evidence). Administrators only. The record
 * loads only while this dialog is open, because the backend logs every view.
 */
export function RecordDialog({
	campaign,
	beneficiary,
	stage,
	onOpenChange,
}: {
	campaign: string;
	beneficiary: Beneficiary | null;
	stage?: BeneficiaryStage;
	onOpenChange: (open: boolean) => void;
}) {
	const toast = useToast();
	const record = useBeneficiaryRecord(campaign, beneficiary?.id);
	const download = useDownloadEvidence(campaign);
	const resend = useResendStatusLink(campaign);
	const b = record.data;
	const chip = stage ?? beneficiary?.status;

	return (
		<Dialog open={!!beneficiary} onOpenChange={onOpenChange}>
			<DialogContent className="gap-0 rounded-panel border-0 bg-white p-5 sm:max-w-[520px] sm:p-7">
				{beneficiary && (
					<>
						<div className="flex items-center gap-3">
							<DialogTitle className="text-lg font-normal tracking-[-0.02em]">{beneficiary.reference}</DialogTitle>
							{chip && <Chip tone={BENEFICIARY_STATUS[chip].tone}>{BENEFICIARY_STATUS[chip].label}</Chip>}
						</div>
						<DialogDescription className="mt-1 text-xs text-muted">
							Protected record · visible to campaign administrators only · this view is logged
						</DialogDescription>

						{record.error ? (
							<ErrorState error={record.error} onRetry={() => record.refetch()} />
						) : !b ? (
							<div className="mt-5 flex flex-col gap-2.5" aria-busy aria-label="Loading record">
								{[0, 1, 2, 3].map((i) => (
									<div key={i} className="shimmer h-4 rounded-control" />
								))}
							</div>
						) : (
							<>
								<dl className="mt-5 flex flex-col gap-2.5">
									<DetailRow label="Name or ID" value={b.full_name} />
									{b.email && <DetailRow label="Email" value={b.email} />}
									{b.phone && <DetailRow label="Phone" value={b.phone} />}
									<DetailRow label="Wallet" value={<span className="font-mono text-[11px] break-all">{b.wallet}</span>} />
									<DetailRow label="Submitted" value={utcDateTime(b.created_at)} />
									{b.reviewed_at && <DetailRow label="Reviewed" value={utcDateTime(b.reviewed_at)} />}
								</dl>
								<div className="mt-5">
									<p className="text-xs">Eligibility details</p>
									<p className="mt-1.5 rounded-control bg-page p-3 text-xs leading-5 whitespace-pre-line">
										{b.eligibility_details}
									</p>
								</div>
								{b.review_note && (
									<Notice
										tone={b.status === "rejected" ? "warning" : "info"}
										title="Review note (shown to the applicant)"
										className="mt-4"
									>
										{b.review_note}
									</Notice>
								)}
								<div className="mt-5">
									<p className="text-xs">Supporting evidence</p>
									{b.evidence.length === 0 ? (
										<p className="caption mt-1.5">No documents were uploaded.</p>
									) : (
										<ul className="mt-1.5 flex flex-col gap-1.5">
											{b.evidence.map((e, i) => (
												<li key={e.id} className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-xs">
													<FileText className="size-4 shrink-0 text-muted" aria-hidden />
													<span className="min-w-0 flex-1 truncate" title={`SHA-256 ${e.sha256}`}>
														Document {i + 1} · {ext(e.content_type).toUpperCase()}
													</span>
													<span className="caption">{fileSize(e.size)}</span>
													<button
														type="button"
														className="cursor-pointer text-muted hover:text-ink disabled:opacity-50"
														aria-label={`Download document ${i + 1}`}
														disabled={download.isPending}
														onClick={() =>
															download.mutate(
																{ id: b.id, fileId: e.id, name: `${b.reference}-document-${i + 1}.${ext(e.content_type)}` },
																{
																	onError: (error) =>
																		toast.error("Couldn't download the file", { description: errorMessage(error) }),
																},
															)
														}
													>
														<Download className="size-3.5" />
													</button>
												</li>
											))}
										</ul>
									)}
									{IS_MOCK && (
										<p className="caption mt-2">Demo data: downloads are placeholders until the backend is connected.</p>
									)}
								</div>
								{b.email && (
									<div className="mt-5 flex justify-end">
										<Button
											variant="outline"
											size="sm"
											isLoading={resend.isPending}
											loadingText="Sending…"
											onClick={() =>
												resend.mutate(b.id, {
													onSuccess: () =>
														toast.success("New status link sent", { description: "The previous link no longer works." }),
													onError: (error) => toast.error("Couldn't send the link", { description: errorMessage(error) }),
												})
											}
										>
											<Mail /> Resend status link
										</Button>
									</div>
								)}
							</>
						)}
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}

/** Reject with an optional note. The note is shown to the applicant on their status page; never public. */
export function RejectDialog({
	beneficiary,
	onOpenChange,
	onConfirm,
	pending,
}: {
	beneficiary: Beneficiary | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: (note: string) => void;
	pending: boolean;
}) {
	const [note, setNote] = useState("");
	const [error, setError] = useState<string | undefined>();
	return (
		<Dialog
			open={!!beneficiary}
			onOpenChange={(open) => {
				if (!open) {
					setNote("");
					setError(undefined);
				}
				onOpenChange(open);
			}}
		>
			<DialogContent className="gap-0 rounded-panel border-0 bg-white p-5 sm:max-w-[460px] sm:p-7">
				<DialogTitle className="text-lg font-normal tracking-[-0.02em]">Reject {beneficiary?.reference}?</DialogTitle>
				<DialogDescription className="mt-2 text-xs leading-5 text-muted">
					The applicant can&apos;t receive funds from this campaign. You can reopen the decision later. Your note is shown to the
					applicant, never published.
				</DialogDescription>
				<form
					noValidate
					className="mt-5"
					onSubmit={(e) => {
						e.preventDefault();
						const parsed = reviewNoteSchema.safeParse({ note });
						if (!parsed.success) return setError(parsed.error.issues[0]?.message);
						onConfirm(parsed.data.note);
					}}
				>
					<Field label="Note to the applicant (optional)" htmlFor="reject-note" error={error}>
						<Textarea
							id="reject-note"
							rows={3}
							autoFocus
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder="e.g. Outside the campaign's service area."
							invalid={!!error}
						/>
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
