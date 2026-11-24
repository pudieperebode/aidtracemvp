"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Notice } from "@repo/ui/surface";
import type { AdminRecord } from "@/lib/api/dto";
import { errorMessage } from "@/lib/api/errors";
import { useToast } from "@/lib/use-toast";
import { useAdminAction } from "@/features/admin/hooks";
import { ResourceScreen } from "@/features/admin/components/ResourceScreen";
import { pick, StatusChip, text, Value } from "@/features/admin/values";
import { useCampaignFilter } from "@/features/campaigns/components/Campaigns";

const opts = (all: string, values: string[]) => [
	{ value: "", label: all },
	...values.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ") })),
];

const chip = (row: AdminRecord, ...keys: string[]) => {
	const s = text(row, ...keys);
	return s ? <StatusChip status={s} /> : <span className="text-muted">—</span>;
};

const ref = (row: AdminRecord, ...keys: string[]) => <span className="font-mono text-[11px]">{text(row, ...keys) ?? "—"}</span>;

/** `/admin/beneficiaries`: references and status only. Platform admins never see names, contacts or evidence. */
export function Beneficiaries() {
	const campaign = useCampaignFilter();
	return (
		<ResourceScreen
			title="Beneficiaries"
			subtitle="References and review status across every campaign. Names, contact details and evidence stay with each organization."
			resource="beneficiaries"
			filters={[
				campaign,
				{
					param: "status",
					label: "Status",
					options: opts("All statuses", ["registered", "under_review", "approved", "rejected"]),
				},
			]}
			before={
				<Notice tone="info" title="Privacy by design" className="mb-4">
					Platform administrators can&apos;t read beneficiary names, contacts or evidence, or approve anyone.
				</Notice>
			}
			columns={[
				{ key: "ref", header: "Beneficiary", mobile: "title", cell: (b) => ref(b, "reference") },
				{ key: "campaign", header: "Campaign", cell: (b) => ref(b, "campaignReference", "campaign.reference") },
				{ key: "status", header: "Status", cell: (b) => chip(b, "status") },
				{
					key: "alloc",
					header: "Allocated",
					cell: (b) => <Value name="hasAllocation" value={pick(b, "hasAllocation", "allocated")} />,
				},
				{ key: "created", header: "Applied", cell: (b) => <Value name="createdAt" value={pick(b, "createdAt")} /> },
			]}
			detail={(b) => ({ title: text(b, "reference") ?? "Beneficiary" })}
			empty={{ title: "No beneficiaries yet", body: "Applications and registrations appear here." }}
		/>
	);
}

/** `/admin/allocations`. */
export function Allocations() {
	const campaign = useCampaignFilter();
	return (
		<ResourceScreen
			title="Allocations"
			subtitle="Every allocation and its payout state. ALC- references are the only recipient identifiers shown publicly."
			resource="allocations"
			filters={[
				campaign,
				{
					param: "status",
					label: "Status",
					options: opts("All statuses", ["allocated", "ready", "processing", "confirmed", "failed", "cancelled"]),
				},
			]}
			columns={[
				{ key: "ref", header: "Allocation", mobile: "title", cell: (a) => ref(a, "reference") },
				{ key: "ben", header: "Beneficiary", cell: (a) => ref(a, "beneficiaryReference", "beneficiary.reference") },
				{ key: "campaign", header: "Campaign", cell: (a) => ref(a, "campaignReference") },
				{ key: "amount", header: "Amount", cell: (a) => <Value name="amount" value={pick(a, "amount")} /> },
				{ key: "status", header: "Status", cell: (a) => chip(a, "status") },
				{
					key: "hash",
					header: "Payout",
					cell: (a) => <Value name="payoutTxHash" value={pick(a, "payoutTxHash", "transactionHash")} />,
				},
			]}
			detail={(a) => ({ title: text(a, "reference") ?? "Allocation" })}
			empty={{
				title: "No allocations yet",
				body: "Allocations appear when organizations assign funds to approved beneficiaries.",
			}}
		/>
	);
}

/** `/admin/transactions`: every prepared or submitted escrow transaction; re-check reads the result from Stellar. */
export function Transactions() {
	const toast = useToast();
	const campaign = useCampaignFilter();
	const recheck = useAdminAction<string>((id) => `/transactions/${encodeURIComponent(id)}/recheck`);
	const actions = (t: AdminRecord) =>
		text(t, "status") === "prepared" ? null : (
			<Button
				size="sm"
				variant="outline"
				isLoading={recheck.isPending}
				loadingText="Reading Stellar…"
				onClick={() =>
					recheck.mutate(String(t.id), {
						onSuccess: ({ data }) =>
							toast.success("Transaction re-checked", { description: `Status: ${text(data, "status") ?? "unknown"}` }),
						onError: (e) => toast.error("The re-check didn't run", { description: errorMessage(e) }),
					})
				}
			>
				<RefreshCw /> Re-check on Stellar
			</Button>
		);
	return (
		<ResourceScreen
			title="Transactions"
			subtitle="Funding, locks, payouts, cancellations and recoveries. Only “confirmed” moved money."
			resource="transactions"
			search={{ param: "hash", label: "Search by transaction hash", placeholder: "Transaction hash" }}
			filters={[
				campaign,
				{
					param: "kind",
					label: "Kind",
					options: opts("All kinds", ["fund", "lock_allocations", "payout", "cancel_allocation", "recover"]),
				},
				{
					param: "status",
					label: "Status",
					options: opts("All statuses", ["prepared", "pending", "confirmed", "failed", "expired"]),
				},
			]}
			columns={[
				{ key: "kind", header: "Kind", mobile: "title", cell: (t) => chip(t, "kind") },
				{ key: "campaign", header: "Campaign", cell: (t) => ref(t, "campaignReference") },
				{ key: "amount", header: "Amount", cell: (t) => <Value name="amount" value={pick(t, "amount")} /> },
				{ key: "status", header: "Status", cell: (t) => chip(t, "status") },
				{
					key: "hash",
					header: "Hash",
					cell: (t) => <Value name="transactionHash" value={pick(t, "transactionHash", "hash", "txHash")} />,
				},
				{ key: "at", header: "Created", cell: (t) => <Value name="createdAt" value={pick(t, "createdAt", "submittedAt")} /> },
			]}
			detail={(t) => ({
				title: `Transaction ${String(t.id)}`,
				path: `/transactions/${encodeURIComponent(String(t.id))}`,
				actions,
			})}
			empty={{ title: "No transactions yet", body: "Escrow transactions appear as organizations fund, lock and pay out." }}
		/>
	);
}

/** `/admin/escrow-balances`: the claimable balances holding campaign funds, with the settlement sweep. */
export function Escrow() {
	const toast = useToast();
	const campaign = useCampaignFilter();
	const sweep = useAdminAction(() => "/sweeper/run");
	return (
		<ResourceScreen
			title="Escrow balances"
			subtitle="Stellar claimable balances: one pool per campaign and one per locked allocation."
			resource="escrow-balances"
			filters={[
				campaign,
				{ param: "kind", label: "Kind", options: opts("Pools and allocations", ["pool", "allocation"]) },
				{ param: "status", label: "Status", options: opts("Open and claimed", ["open", "claimed"]) },
			]}
			action={
				<Button
					variant="outline"
					className="h-10 bg-white"
					isLoading={sweep.isPending}
					loadingText="Running sweep…"
					onClick={() =>
						sweep.mutate(undefined, {
							onSuccess: ({ message }) => toast.success(message || "Sweep finished"),
							onError: (e) => toast.error("The sweep didn't run", { description: errorMessage(e) }),
						})
					}
				>
					<RefreshCw /> Run settlement sweep
				</Button>
			}
			columns={[
				{ key: "kind", header: "Kind", mobile: "title", cell: (b) => chip(b, "kind") },
				{ key: "campaign", header: "Campaign", cell: (b) => ref(b, "campaignReference") },
				{ key: "alloc", header: "Allocation", cell: (b) => ref(b, "allocationReference") },
				{ key: "amount", header: "Amount", cell: (b) => <Value name="amount" value={pick(b, "amount")} /> },
				{ key: "status", header: "Status", cell: (b) => chip(b, "status") },
				{
					key: "id",
					header: "Balance id",
					cell: (b) => {
						const id = text(b, "balanceId");
						return id ? (
							<span className="font-mono text-[11px]" title={id}>
								{id.slice(0, 10)}…{id.slice(-4)}
							</span>
						) : (
							"—"
						);
					},
				},
			]}
			detail={() => ({ title: "Escrow balance" })}
			empty={{ title: "No escrow balances", body: "Balances appear once a campaign is funded." }}
		/>
	);
}
