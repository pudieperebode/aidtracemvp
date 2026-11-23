"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@repo/ui/button";
import { SearchInput } from "@repo/ui/field";
import { Chip } from "@repo/ui/surface";
import { shortKey } from "@repo/stellar/format";
import type { BeneficiaryRecord } from "@repo/stellar/campaign";
import { routes } from "@/lib/routes";
import { errorMessage } from "@/lib/api/errors";
import { utcDate } from "@/lib/format";
import { useToast } from "@/lib/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, FilterSelect, Pagination, type Column } from "@/components/DataTable";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/states";
import { useBeneficiaries, useRegisterBeneficiary, useReviewBeneficiary } from "@/features/beneficiaries/hooks";
import { BENEFICIARY_FILTERS, BENEFICIARY_STATUS, canReview } from "@/features/beneficiaries/status";
import { BeneficiaryForm } from "@/features/beneficiaries/components/BeneficiaryForm";
import { EvidenceDialog, RejectDialog } from "@/features/beneficiaries/components/ReviewDialogs";
import { CampaignPicker, useSelectedCampaign } from "@/features/campaigns/components/CampaignPicker";

const PAGE = 8;

/**
 * Screen 3 (Figma "Beneficiary registration"): register a beneficiary for the selected campaign, then review the
 * records: status, evidence, Approve / Reject. Eligibility is decided here, off-chain, by the administrator.
 */
export function Beneficiaries({ reference }: { reference?: string }) {
	const toast = useToast();
	const campaigns = useSelectedCampaign(reference);
	const campaign = campaigns.selected;
	const [status, setStatus] = useState("");
	const [q, setQ] = useState("");
	const [offset, setOffset] = useState(0);
	const list = useBeneficiaries(campaign?.id, { status: status || undefined, q: q || undefined, limit: PAGE, offset });
	const register = useRegisterBeneficiary(campaign?.id ?? "");
	const review = useReviewBeneficiary(campaign?.id ?? "");
	const [viewing, setViewing] = useState<BeneficiaryRecord | null>(null);
	const [rejecting, setRejecting] = useState<BeneficiaryRecord | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	const approve = (b: BeneficiaryRecord) => {
		setBusyId(b.id);
		review.mutate(
			{ id: b.id, review: { decision: "approved" } },
			{
				onSuccess: () => toast.success(`${b.reference} approved`, { description: "Ready for a funding allocation." }),
				onError: (e) => toast.error(`Couldn't approve ${b.reference}`, { description: errorMessage(e) }),
				onSettled: () => setBusyId(null),
			},
		);
	};

	const reject = (b: BeneficiaryRecord, reason: string) => {
		setBusyId(b.id);
		review.mutate(
			{ id: b.id, review: { decision: "rejected", reason } },
			{
				onSuccess: () => {
					setRejecting(null);
					toast.info(`${b.reference} rejected`);
				},
				onError: (e) => toast.error(`Couldn't reject ${b.reference}`, { description: errorMessage(e) }),
				onSettled: () => setBusyId(null),
			},
		);
	};

	const columns: Column<BeneficiaryRecord>[] = [
		{ key: "ref", header: "Reference", cell: (b) => b.reference, mobile: "title", className: "whitespace-nowrap" },
		{ key: "name", header: "Name", cell: (b) => b.name },
		{ key: "wallet", header: "Wallet address", cell: (b) => <span className="font-mono text-[11px]">{b.wallet ? shortKey(b.wallet, 6, 4) : "—"}</span> },
		{
			key: "status",
			header: "Status",
			cell: (b) => (
				<Chip key={b.status} tone={BENEFICIARY_STATUS[b.status].tone} className="animate-pop">
					{BENEFICIARY_STATUS[b.status].label}
				</Chip>
			),
		},
		{
			key: "evidence",
			header: "Evidence",
			cell: (b) => (
				<button type="button" onClick={() => setViewing(b)} className="cursor-pointer text-ink underline-offset-2 hover:underline">
					View document
				</button>
			),
		},
		{
			key: "actions",
			header: "Actions",
			mobile: "label",
			className: "w-[270px]",
			cell: (b) =>
				canReview(b.status) ? (
					<div className="flex gap-2 md:gap-8">
						<Button variant="approve" size="sm" className="h-8 flex-1 md:w-[100px] md:flex-none" onClick={() => approve(b)} isLoading={busyId === b.id && !rejecting} loadingText="Approving">
							<Check /> Approve
						</Button>
						<Button variant="reject" size="sm" className="h-8 flex-1 md:w-[126px] md:flex-none" onClick={() => setRejecting(b)} disabled={busyId === b.id}>
							Reject
						</Button>
					</div>
				) : (
					<span className="caption">{b.reviewed_at ? `Reviewed ${utcDate(b.reviewed_at)}` : "—"}</span>
				),
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
							onSubmit={(values) => register.mutateAsync(values)}
							header={
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<h2 className="h-section">Register a beneficiary</h2>
										<p className="caption mt-2">Campaign: {campaign.title}</p>
									</div>
									{campaigns.list.length > 1 && <CampaignPicker list={campaigns.list} selected={campaign} className="sm:w-[300px]" />}
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
								<p className="caption mt-2">Review evidence before approving a beneficiary.</p>
							</div>
							<form
								role="search"
								className="flex flex-col gap-2 sm:flex-row"
								onSubmit={(e) => {
									e.preventDefault();
									setQ(new FormData(e.currentTarget).get("q")?.toString().trim() ?? "");
									setOffset(0);
								}}
							>
								<SearchInput name="q" placeholder="Search reference, name or wallet" aria-label="Search beneficiaries" className="sm:w-[260px]" />
								<FilterSelect
									label="Status"
									value={status}
									onChange={(v) => {
										setStatus(v);
										setOffset(0);
									}}
									options={BENEFICIARY_FILTERS}
									className="sm:w-[160px]"
								/>
							</form>
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
								<EmptyState title={status || q ? "No beneficiaries match" : "No beneficiaries registered"} icon={status || q ? "search" : "inbox"}>
									{status || q ? "Try another status or search." : "Register a beneficiary above, or share the campaign's application link."}
								</EmptyState>
							}
						/>
						{list.data && <Pagination total={list.data.total} limit={PAGE} offset={offset} onPage={setOffset} />}
					</section>
				</>
			)}

			<EvidenceDialog beneficiary={viewing} onOpenChange={(open) => !open && setViewing(null)} />
			<RejectDialog beneficiary={rejecting} onOpenChange={(open) => !open && setRejecting(null)} onConfirm={(reason) => rejecting && reject(rejecting, reason)} pending={review.isPending} />
		</>
	);
}
