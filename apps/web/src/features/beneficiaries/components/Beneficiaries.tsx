"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, RotateCcw, SearchCheck } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Chip } from "@repo/ui/surface";
import { shortKey } from "@repo/stellar/format";
import type { Beneficiary } from "@repo/stellar/campaign";
import { routes } from "@/lib/routes";
import { errorMessage } from "@/lib/api/errors";
import type { ReviewDecision } from "@/lib/api/flows";
import { utcDate } from "@/lib/format";
import { useToast } from "@/lib/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, FilterSelect, Pagination, type Column } from "@/components/DataTable";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/states";
import { useAllocations, useBeneficiaries, useRegisterBeneficiary, useReviewBeneficiary } from "@/features/beneficiaries/hooks";
import {
	BENEFICIARY_FILTERS,
	BENEFICIARY_STATUS,
	currentAllocation,
	reviewActions,
	stageOf,
} from "@/features/beneficiaries/status";
import { BeneficiaryForm } from "@/features/beneficiaries/components/BeneficiaryForm";
import { RecordDialog, RejectDialog } from "@/features/beneficiaries/components/ReviewDialogs";
import { CampaignPicker, useSelectedCampaign } from "@/features/campaigns/components/CampaignPicker";

const PAGE = 8;

const DONE: Record<ReviewDecision, string> = {
	start_review: "is under review",
	approve: "approved",
	reject: "rejected",
	reopen: "reopened for review",
};

/**
 * Screen 3 (Figma "Beneficiary registration"): register a beneficiary for the selected campaign, then review the
 * records: status, the protected record and evidence, Start review → Approve / Reject, Reopen. Eligibility is decided
 * here, off-chain, by the administrator.
 */
export function Beneficiaries({ reference }: { reference?: string }) {
	const toast = useToast();
	const campaigns = useSelectedCampaign(reference);
	const campaign = campaigns.selected;
	const ref = campaign?.reference ?? "";
	const [status, setStatus] = useState("");
	const [offset, setOffset] = useState(0);
	const list = useBeneficiaries(campaign?.reference, { status: status || undefined, limit: PAGE, offset });
	const allocations = useAllocations(campaign?.reference);
	const register = useRegisterBeneficiary(ref);
	const review = useReviewBeneficiary(ref);
	const [viewing, setViewing] = useState<Beneficiary | null>(null);
	const [rejecting, setRejecting] = useState<Beneficiary | null>(null);
	const [busy, setBusy] = useState<{ id: string; decision: ReviewDecision } | null>(null);

	const allocationOf = (b: Beneficiary) => currentAllocation(allocations.data, b.id);

	const decide = (b: Beneficiary, decision: ReviewDecision, note?: string) => {
		setBusy({ id: b.id, decision });
		review.mutate(
			{ id: b.id, decision, note },
			{
				onSuccess: () => {
					if (decision === "reject") setRejecting(null);
					toast.success(
						`${b.reference} ${DONE[decision]}`,
						decision === "approve" ? { description: "Ready for a funding allocation." } : undefined,
					);
				},
				onError: (e) => toast.error(`Couldn't update ${b.reference}`, { description: errorMessage(e) }),
				onSettled: () => setBusy(null),
			},
		);
	};

	const isBusy = (b: Beneficiary, decision?: ReviewDecision) => busy?.id === b.id && (!decision || busy.decision === decision);

	const columns: Column<Beneficiary>[] = [
		{ key: "ref", header: "Reference", cell: (b) => b.reference, mobile: "title", className: "whitespace-nowrap" },
		{ key: "name", header: "Name", cell: (b) => b.full_name ?? <span className="caption">Hidden</span> },
		{
			key: "wallet",
			header: "Wallet address",
			cell: (b) => <span className="font-mono text-[11px]">{shortKey(b.wallet, 6, 4)}</span>,
		},
		{
			key: "status",
			header: "Status",
			cell: (b) => {
				const stage = stageOf(b, allocationOf(b));
				return (
					<Chip key={stage} tone={BENEFICIARY_STATUS[stage].tone} className="animate-pop">
						{BENEFICIARY_STATUS[stage].label}
					</Chip>
				);
			},
		},
		{
			key: "record",
			header: "Record",
			cell: (b) => (
				<button
					type="button"
					onClick={() => setViewing(b)}
					className="cursor-pointer text-ink underline-offset-2 hover:underline"
				>
					View record
				</button>
			),
		},
		{
			key: "actions",
			header: "Actions",
			mobile: "label",
			className: "w-[270px]",
			cell: (b) => {
				const can = reviewActions(b, allocationOf(b));
				if (can.startReview)
					return (
						<Button
							variant="outline"
							size="sm"
							className="h-8 w-full md:w-[160px]"
							onClick={() => decide(b, "start_review")}
							isLoading={isBusy(b, "start_review")}
							loadingText="Starting"
						>
							<SearchCheck /> Start review
						</Button>
					);
				if (can.decide)
					return (
						<div className="flex gap-2 md:gap-8">
							<Button
								variant="approve"
								size="sm"
								className="h-8 flex-1 md:w-[100px] md:flex-none"
								onClick={() => decide(b, "approve")}
								isLoading={isBusy(b, "approve")}
								loadingText="Approving"
								disabled={isBusy(b)}
							>
								<Check /> Approve
							</Button>
							<Button
								variant="reject"
								size="sm"
								className="h-8 flex-1 md:w-[126px] md:flex-none"
								onClick={() => setRejecting(b)}
								disabled={isBusy(b)}
							>
								Reject
							</Button>
						</div>
					);
				return (
					<div className="flex items-center justify-end gap-3 md:justify-start">
						<span className="caption">{b.reviewed_at ? `Reviewed ${utcDate(b.reviewed_at)}` : "—"}</span>
						{can.reopen && (
							<Button
								variant="ghost"
								size="sm"
								className="h-8"
								onClick={() => decide(b, "reopen")}
								isLoading={isBusy(b, "reopen")}
								loadingText="Reopening"
							>
								<RotateCcw /> Reopen
							</Button>
						)}
					</div>
				);
			},
		},
	];

	if (campaigns.error) {
		return (
			<>
				<PageHeader title="Beneficiary registration" />
				<div className="rounded-card bg-white">
					<ErrorState error={campaigns.error} onRetry={() => campaigns.refetch()} />
				</div>
			</>
		);
	}

	return (
		<>
			<PageHeader title="Beneficiary registration" subtitle="Register beneficiaries and review their eligibility for support." />

			{campaigns.isPending ? (
				<CardSkeleton className="min-h-[240px]" />
			) : !campaign ? (
				<div className="rounded-card bg-white">
					<EmptyState
						title="No campaigns yet"
						action={
							<Button asChild size="sm">
								<Link href={routes.CREATE_CAMPAIGN}>Create campaign</Link>
							</Button>
						}
					>
						Create a campaign first, then register the people it will support.
					</EmptyState>
				</div>
			) : (
				<>
					<section className="animate-rise rounded-card bg-white p-4 sm:p-5">
						<BeneficiaryForm
							onSubmit={async ({ evidence, ...input }) => {
								const result = await register.mutateAsync({ input, evidence });
								if (result.failedFiles.length)
									toast.warning(
										`${result.reference} registered, but ${result.failedFiles.length} file${result.failedFiles.length === 1 ? "" : "s"} didn't upload`,
										{
											description: result.failedFiles[0]!.message,
										},
									);
								return { title: `${result.reference} registered`, description: "The application is waiting for review." };
							}}
							header={
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<h2 className="h-section">Register a beneficiary</h2>
										<p className="caption mt-2">Campaign: {campaign.title}</p>
									</div>
									{campaigns.list.length > 1 && (
										<CampaignPicker list={campaigns.list} selected={campaign} className="sm:w-[300px]" />
									)}
								</div>
							}
						/>
					</section>

					<section aria-labelledby="records" className="mt-8">
						<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
							<div>
								<h2 id="records" className="h-section">
									Beneficiary records
								</h2>
								<p className="caption mt-2">
									Start a review, check the record and evidence, then approve or reject. Each name shown is access-logged.
								</p>
							</div>
							<FilterSelect
								label="Status"
								value={status}
								onChange={(v) => {
									setStatus(v);
									setOffset(0);
								}}
								options={BENEFICIARY_FILTERS}
								className="sm:w-[180px]"
							/>
						</div>
						<DataTable
							className="mt-4"
							caption="Beneficiary records"
							columns={columns}
							rows={list.data?.results}
							rowKey={(b) => b.id}
							isLoading={list.isFetching}
							error={list.error}
							onRetry={() => list.refetch()}
							empty={
								<EmptyState
									title={status ? "No beneficiaries match" : "No beneficiaries registered"}
									icon={status ? "search" : "inbox"}
								>
									{status ? "Try another status." : "Register a beneficiary above, or share the campaign's application link."}
								</EmptyState>
							}
						/>
						{list.data && <Pagination total={list.data.total} limit={PAGE} offset={offset} onPage={setOffset} />}
					</section>
				</>
			)}

			<RecordDialog
				campaign={ref}
				beneficiary={viewing}
				stage={viewing ? stageOf(viewing, allocationOf(viewing)) : undefined}
				onOpenChange={(open) => !open && setViewing(null)}
			/>
			<RejectDialog
				beneficiary={rejecting}
				onOpenChange={(open) => !open && setRejecting(null)}
				onConfirm={(note) => rejecting && decide(rejecting, "reject", note)}
				pending={review.isPending}
			/>
		</>
	);
}
