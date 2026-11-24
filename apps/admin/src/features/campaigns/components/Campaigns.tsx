"use client";

import Link from "next/link";
import { routes } from "@/lib/routes";
import { ResourceScreen, type ListFilter } from "@/features/admin/components/ResourceScreen";
import { useAdminList } from "@/features/admin/hooks";
import { pick, StatusChip, text, Value } from "@/features/admin/values";

export const CAMPAIGN_STATUS = [
	{ value: "", label: "All statuses" },
	{ value: "draft", label: "Draft" },
	{ value: "active", label: "Active" },
	{ value: "closed", label: "Closed" },
	{ value: "cancelled", label: "Cancelled" },
];

/** A "Campaign" filter for the cross-campaign lists, from the first 100 campaigns. */
export function useCampaignFilter(): ListFilter {
	const list = useAdminList("campaigns", { limit: 100 });
	return {
		param: "campaign",
		label: "Campaign",
		options: [
			{ value: "", label: "All campaigns" },
			...(list.data?.results ?? []).map((c) => ({
				value: String(c.reference),
				label: `${String(c.reference)} · ${text(c, "title") ?? ""}`,
			})),
		],
	};
}

/** `/admin/campaigns`: every campaign including drafts. Open one for the full record, featuring and reconciliation. */
export function Campaigns() {
	return (
		<ResourceScreen
			title="Campaigns"
			subtitle="Every campaign on the platform, drafts included."
			resource="campaigns"
			rowKey={(c) => String(c.reference)}
			search={{ param: "search", label: "Search campaigns", placeholder: "Title, reference or organization" }}
			filters={[{ param: "status", label: "Status", options: CAMPAIGN_STATUS }]}
			columns={[
				{
					key: "ref",
					header: "Campaign",
					mobile: "title",
					cell: (c) => (
						<Link href={routes.CAMPAIGN(String(c.reference))} className="flex flex-col hover:underline">
							<span>{text(c, "title") ?? String(c.reference)}</span>
							<span className="caption font-mono">{String(c.reference)}</span>
						</Link>
					),
				},
				{ key: "org", header: "Organization", cell: (c) => text(c, "organization.name", "organizationName") ?? "—" },
				{ key: "status", header: "Status", cell: (c) => (text(c, "status") ? <StatusChip status={text(c, "status")!} /> : "—") },
				{ key: "featured", header: "Featured", cell: (c) => <Value name="featured" value={pick(c, "featured")} /> },
				{
					key: "raised",
					header: "Raised",
					cell: (c) => <Value name="raised" value={pick(c, "totals.raised", "raised", "totalRaised")} />,
				},
				{
					key: "target",
					header: "Target",
					cell: (c) => <Value name="target" value={pick(c, "targetAmount", "totals.target", "target")} />,
				},
			]}
			empty={{ title: "No campaigns yet", body: "Campaigns appear here as organizations create them." }}
		/>
	);
}
