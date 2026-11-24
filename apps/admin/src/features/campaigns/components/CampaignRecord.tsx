"use client";

import Link from "next/link";
import { ArrowLeft, ScanSearch, Star, StarOff } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Notice, Panel, PanelHeader } from "@repo/ui/surface";
import type { AdminCampaignDto } from "@/lib/api/dto";
import { errorMessage, httpStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { useToast } from "@/lib/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/states";
import { useAdminAction, useAdminDoc } from "@/features/admin/hooks";
import { RecordView } from "@/features/admin/components/RecordView";
import { StatusChip, text } from "@/features/admin/values";

/**
 * `/admin/campaigns/{reference}`: the full record, featuring on the landing page (`{ featured }`) and an on-chain
 * reconciliation. Platform admins can't edit, fund or pay out a campaign.
 */
export function CampaignRecord({ reference }: { reference: string }) {
	const toast = useToast();
	const path = `/campaigns/${encodeURIComponent(reference)}`;
	const campaign = useAdminDoc<AdminCampaignDto>(path);
	const feature = useAdminAction<boolean>(
		() => `${path}/feature`,
		(featured) => ({ featured }),
	);
	const reconcile = useAdminAction(() => `${path}/reconcile`);
	const c = campaign.data;

	const back = (
		<Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
			<Link href={routes.CAMPAIGNS}>
				<ArrowLeft /> All campaigns
			</Link>
		</Button>
	);

	if (campaign.isPending)
		return (
			<>
				{back}
				<CardSkeleton className="min-h-[400px]" lines={10} />
			</>
		);
	if (campaign.error)
		return (
			<>
				{back}
				<div className="rounded-card bg-white">
					{httpStatus(campaign.error) === 404 ? (
						<EmptyState title="Campaign not found" icon="search">
							No campaign has the reference {reference}.
						</EmptyState>
					) : (
						<ErrorState error={campaign.error} onRetry={() => campaign.refetch()} />
					)}
				</div>
			</>
		);

	const featured = c?.featured === true;
	const result = reconcile.data?.data;

	return (
		<>
			{back}
			<PageHeader
				title={text(c, "title") ?? reference}
				subtitle={
					<span className="flex flex-wrap items-center gap-2">
						<span className="font-mono">{reference}</span>
						{text(c, "status") && <StatusChip status={text(c, "status")!} />}
						{featured && <StatusChip status="featured" />}
					</span>
				}
				action={
					<>
						<Button
							variant="outline"
							className="h-10 bg-white"
							isLoading={feature.isPending}
							loadingText="Saving…"
							onClick={() =>
								feature.mutate(!featured, {
									onSuccess: () =>
										toast.success(featured ? "Removed from the landing page" : "Featured on the landing page", {
											description: reference,
										}),
									onError: (e) => toast.error("The campaign wasn't updated", { description: errorMessage(e) }),
								})
							}
						>
							{featured ? <StarOff /> : <Star />} {featured ? "Unfeature" : "Feature on landing"}
						</Button>
						<Button
							className="h-10"
							isLoading={reconcile.isPending}
							loadingText="Checking Stellar…"
							onClick={() =>
								reconcile.mutate(undefined, {
									onError: (e) => toast.error("Reconciliation didn't run", { description: errorMessage(e) }),
								})
							}
						>
							<ScanSearch /> Reconcile on chain
						</Button>
					</>
				}
			/>
			{result && (
				<Notice
					tone={result.reconciled === false ? "error" : "success"}
					title={result.reconciled === false ? "Reconciliation found problems" : "Reconciled with Stellar"}
					className="animate-rise mb-4"
				>
					<RecordView record={result} />
				</Notice>
			)}
			<Panel className="animate-rise">
				<PanelHeader
					title="Full record"
					description="As the backend stores it. Beneficiary names and evidence are never included."
				/>
				<div className="mt-5">{c && <RecordView record={c} />}</div>
			</Panel>
		</>
	);
}
