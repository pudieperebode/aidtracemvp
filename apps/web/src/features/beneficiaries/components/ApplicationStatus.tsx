"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Chip, DetailRow, Notice } from "@repo/ui/surface";
import { routes } from "@/lib/routes";
import { errorCode, errorMessage } from "@/lib/api/errors";
import { utcDate } from "@/lib/format";
import { useToast } from "@/lib/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { CardSkeleton } from "@/components/states";
import { useApplicationStatus, useUploadApplicationEvidence } from "@/features/beneficiaries/hooks";
import { BENEFICIARY_STATUS } from "@/features/beneficiaries/status";
import { EVIDENCE_MAX_FILES } from "@/features/beneficiaries/schema";
import { EvidenceDropzone } from "@/features/beneficiaries/components/EvidenceDropzone";

/**
 * The token arrives in the URL fragment (`#token=…`), so it never reaches a server. Read it once, strip it from the
 * address bar, and keep it in memory only (this module), never in storage, logs or a URL.
 */
let captured: string | null = null;

/** A missing token isn't cached: on client navigation Next renders the page before it updates the address bar. */
function readToken() {
	if (captured || typeof window === "undefined") return captured;
	captured = new URLSearchParams(window.location.hash.slice(1)).get("token");
	return captured;
}

/** Strip the fragment after render: replaceState notifies Next's router, which must not happen during render. */
function stripToken() {
	if (captured && window.location.hash.includes("token="))
		window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

/** Re-read once after mount, when the URL (with its fragment) is final. */
const subscribe = (onChange: () => void) => {
	const id = window.setTimeout(onChange);
	return () => window.clearTimeout(id);
};

const MEANING: Record<string, string> = {
	registered: "Your application was received and is waiting for review.",
	under_review: "The organization is assessing your eligibility.",
	approved: "You're approved. If funds are allocated to you, they are paid in USDC to the wallet you gave.",
	rejected: "Your application didn't meet this campaign's requirements.",
};

/** The applicant's private status page (emailed link): status, the reviewer's note, and evidence upload until a decision. */
export function ApplicationStatus() {
	const toast = useToast();
	const token = useSyncExternalStore(subscribe, readToken, () => null);
	useEffect(stripToken, [token]);
	const status = useApplicationStatus(token);
	const upload = useUploadApplicationEvidence(token);
	const [files, setFiles] = useState<File[]>([]);
	const [uploading, setUploading] = useState(false);
	const s = status.data;
	const note = s?.note ?? s?.reviewNote;

	const send = async () => {
		setUploading(true);
		let sent = 0;
		for (const file of files) {
			try {
				await upload.mutateAsync(file);
				sent++;
			} catch (error) {
				toast.error(`${file.name} wasn't uploaded`, { description: errorMessage(error) });
				break;
			}
		}
		setUploading(false);
		setFiles([]);
		if (sent)
			toast.success(`${sent} document${sent === 1 ? "" : "s"} added`, {
				description: "Only the campaign's administrators can see them.",
			});
	};

	return (
		<>
			<PageHeader title="Your application" subtitle="Private status page. Don't share this link." />
			{!token ? (
				<Notice tone="warning" title="Open the link from your email">
					This page needs the private link we emailed you when you applied. If you can&apos;t find it, ask the organization to
					send a new one.
				</Notice>
			) : status.isPending ? (
				<CardSkeleton className="mx-auto min-h-[260px] max-w-[560px]" lines={5} />
			) : status.error ? (
				<Notice
					tone="error"
					title={
						errorCode(status.error) === "INVALID_STATUS_LINK" ? "This link no longer works" : "We couldn't load your application"
					}
				>
					{errorCode(status.error) === "INVALID_STATUS_LINK"
						? "It's invalid or was replaced by a newer link. Use the most recent email, or ask the organization for a new link."
						: errorMessage(status.error)}
				</Notice>
			) : s ? (
				<div className="mx-auto flex max-w-[560px] flex-col gap-3">
					<section className="animate-rise rounded-card bg-white p-4 sm:p-5">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<h2 className="h-section">{s.campaign?.title ?? "Application"}</h2>
							<Chip tone={BENEFICIARY_STATUS[s.status].tone}>{BENEFICIARY_STATUS[s.status].label}</Chip>
						</div>
						<p className="caption mt-2">{MEANING[s.status]}</p>
						<dl className="mt-5 flex flex-col gap-2.5">
							{s.reference && <DetailRow label="Your reference" value={<span className="font-mono">{s.reference}</span>} />}
							{s.campaign && <DetailRow label="Campaign" value={s.campaign.reference} />}
							{s.createdAt && <DetailRow label="Submitted" value={utcDate(s.createdAt)} />}
						</dl>
						{note && (
							<Notice tone={s.status === "rejected" ? "warning" : "info"} title="Note from the reviewer" className="mt-4">
								{note}
							</Notice>
						)}
						{s.campaign && (
							<Button asChild variant="outline" size="sm" className="mt-5">
								<Link href={routes.CAMPAIGN(s.campaign.reference)}>View the campaign</Link>
							</Button>
						)}
					</section>

					{s.canAddEvidence && (
						<section className="animate-rise rounded-card bg-white p-4 sm:p-5" style={{ ["--i" as string]: 1 }}>
							<h2 className="h-section">Add supporting documents</h2>
							<p className="caption mt-2">
								PDF, PNG or JPEG, up to 5 MB each and {EVIDENCE_MAX_FILES} per application
								{s.evidenceCount !== undefined ? ` (${s.evidenceCount} added so far)` : ""}. Documents can&apos;t change after a
								decision.
							</p>
							<div className="mt-4">
								<EvidenceDropzone files={files} onChange={setFiles} />
							</div>
							<Button
								className="mt-4 w-full"
								disabled={!files.length}
								isLoading={uploading}
								loadingText="Uploading…"
								onClick={() => void send()}
							>
								<Upload /> Upload {files.length ? `${files.length} file${files.length === 1 ? "" : "s"}` : "documents"}
							</Button>
						</section>
					)}

					<Notice tone="info" title="Your privacy">
						Your name, contact details and documents are seen only by the campaign&apos;s administrators. Payments appear on the
						public ledger under a random reference, but Stellar payments and wallet addresses are publicly visible.
					</Notice>
				</div>
			) : null}
		</>
	);
}
