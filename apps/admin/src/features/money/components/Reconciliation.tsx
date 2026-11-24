"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Notice } from "@repo/ui/surface";
import type { AdminRecord } from "@/lib/api/dto";
import { errorMessage } from "@/lib/api/errors";
import { useToast } from "@/lib/use-toast";
import { useAdminAction, useAdminList } from "@/features/admin/hooks";
import { ResourceScreen } from "@/features/admin/components/ResourceScreen";
import { ReasonDialog } from "@/features/admin/components/ReasonDialog";
import { pick, StatusChip, text, Value } from "@/features/admin/values";
import { useCampaignFilter } from "@/features/campaigns/components/Campaigns";

const STATUS = [
	{ value: "", label: "All issues" },
	{ value: "open", label: "Open" },
	{ value: "resolved", label: "Resolved" },
];

const critical = (i: AdminRecord) => text(i, "type", "kind") === "unexpected_claim";

/**
 * `/admin/reconciliation-issues`. `unexpected_claim` is critical (guide §14): funds left escrow to someone other than
 * the beneficiary. Resolving records a review note only; it changes nothing on chain.
 */
export function Reconciliation() {
	const toast = useToast();
	const campaign = useCampaignFilter();
	const openCritical = useAdminList("reconciliation-issues", { status: "open", limit: 100 });
	const criticalCount = (openCritical.data?.results ?? []).filter(critical).length;
	const [resolving, setResolving] = useState<AdminRecord | null>(null);
	const resolve = useAdminAction<{ id: string; note: string }>(
		({ id }) => `/reconciliation-issues/${encodeURIComponent(id)}/resolve`,
		({ note }) => ({ note }),
	);

	const actions = (i: AdminRecord) =>
		text(i, "status") === "open" ? (
			<Button size="sm" variant="outline" onClick={() => setResolving(i)}>
				<CheckCheck /> Mark reviewed
			</Button>
		) : null;

	return (
		<>
			<ResourceScreen
				title="Reconciliation issues"
				subtitle="Differences found between recorded balances and Stellar."
				resource="reconciliation-issues"
				filters={[campaign, { param: "status", label: "Status", options: STATUS }]}
				before={
					criticalCount > 0 && (
						<Notice
							tone="error"
							title={`${criticalCount} critical issue${criticalCount === 1 ? "" : "s"} open`}
							className="animate-rise mb-4"
						>
							An unexpected claim means funds left escrow to an account that isn&apos;t the allocation&apos;s beneficiary.
							Investigate before more payouts run.
						</Notice>
					)
				}
				columns={[
					{
						key: "type",
						header: "Issue",
						mobile: "title",
						cell: (i) => (
							<span className="flex items-center gap-2">
								{text(i, "type", "kind") ? <StatusChip status={text(i, "type", "kind")!} /> : "—"}
								{critical(i) && <span className="text-[11px] text-danger">Critical</span>}
							</span>
						),
					},
					{
						key: "campaign",
						header: "Campaign",
						cell: (i) => <span className="font-mono text-[11px]">{text(i, "campaignReference") ?? "—"}</span>,
					},
					{
						key: "message",
						header: "Details",
						className: "max-w-[360px]",
						cell: (i) => <span className="line-clamp-2">{text(i, "message", "description", "detail") ?? "—"}</span>,
					},
					{
						key: "status",
						header: "Status",
						cell: (i) => (text(i, "status") ? <StatusChip status={text(i, "status")!} /> : "—"),
					},
					{ key: "at", header: "Detected", cell: (i) => <Value name="detectedAt" value={pick(i, "detectedAt", "createdAt")} /> },
					{
						key: "actions",
						header: <span className="sr-only">Actions</span>,
						mobile: "label",
						className: "w-[150px]",
						cell: actions,
					},
				]}
				rowKey={(i) => String(i.id)}
				detail={() => ({ title: "Reconciliation issue", actions })}
				empty={{ title: "No reconciliation issues", body: "Balances and Stellar agree." }}
			/>
			<ReasonDialog
				open={!!resolving}
				onOpenChange={(open) => !open && setResolving(null)}
				title="Mark this issue as reviewed?"
				description="Records your review and note. It doesn't move funds or change anything on Stellar."
				label="Note"
				placeholder="Confirmed as a testnet reset."
				confirm="Mark reviewed"
				pending={resolve.isPending}
				onConfirm={(note) =>
					resolving &&
					resolve.mutate(
						{ id: String(resolving.id), note },
						{
							onSuccess: () => {
								toast.success("Issue marked as reviewed");
								setResolving(null);
							},
							onError: (e) => toast.error("The issue wasn't updated", { description: errorMessage(e) }),
						},
					)
				}
			/>
		</>
	);
}
