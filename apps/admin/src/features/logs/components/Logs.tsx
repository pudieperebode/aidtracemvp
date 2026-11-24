"use client";

import { useState } from "react";
import { cn } from "@repo/ui/lib/utils";
import { ResourceScreen } from "@/features/admin/components/ResourceScreen";
import { pick, StatusChip, text, Value } from "@/features/admin/values";

const TABS = [
	{ id: "audit-log", label: "Admin actions" },
	{ id: "access-log", label: "Protected-data access" },
] as const;

/** `/admin/audit-log` (what platform admins did) and `/admin/access-log` (who opened protected beneficiary records). */
export function Logs() {
	const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("audit-log");
	const tabs = (
		<div role="tablist" aria-label="Log" className="mb-4 inline-flex rounded-control bg-white p-1">
			{TABS.map((t) => (
				<button
					key={t.id}
					role="tab"
					type="button"
					aria-selected={tab === t.id}
					onClick={() => setTab(t.id)}
					className={cn(
						"h-8 cursor-pointer rounded-[4px] px-3 text-xs transition-colors",
						tab === t.id ? "bg-ink text-white" : "hover:bg-field",
					)}
				>
					{t.label}
				</button>
			))}
		</div>
	);
	return tab === "audit-log" ? (
		<ResourceScreen
			key="audit"
			title="Logs"
			subtitle="Every platform-admin action, and every view of a protected beneficiary record."
			resource="audit-log"
			before={tabs}
			columns={[
				{
					key: "action",
					header: "Action",
					mobile: "title",
					cell: (r) => <span className="font-mono text-[11px]">{text(r, "action", "event") ?? "—"}</span>,
				},
				{
					key: "actor",
					header: "By",
					cell: (r) => <Value name="actorWallet" value={pick(r, "actorWallet", "actor.walletAddress", "actor")} />,
				},
				{
					key: "target",
					header: "Target",
					cell: (r) => <span className="font-mono text-[11px] break-all">{text(r, "target", "targetId") ?? "—"}</span>,
				},
				{
					key: "details",
					header: "Details",
					className: "max-w-[320px]",
					cell: (r) => <span className="line-clamp-2">{text(r, "details", "reason", "note") ?? "—"}</span>,
				},
				{ key: "at", header: "When", cell: (r) => <Value name="createdAt" value={pick(r, "createdAt", "timestamp")} /> },
			]}
			detail={() => ({ title: "Admin action" })}
			empty={{ title: "No admin actions yet", body: "Suspensions, featuring, re-checks and resolutions are recorded here." }}
		/>
	) : (
		<ResourceScreen
			key="access"
			title="Logs"
			subtitle="Every platform-admin action, and every view of a protected beneficiary record."
			resource="access-log"
			before={tabs}
			columns={[
				{
					key: "who",
					header: "Viewed by",
					mobile: "title",
					cell: (r) => <Value name="actorWallet" value={pick(r, "actorWallet", "actor.walletAddress", "actor")} />,
				},
				{
					key: "ben",
					header: "Beneficiary",
					cell: (r) => (
						<span className="font-mono text-[11px]">{text(r, "beneficiaryReference", "beneficiary.reference") ?? "—"}</span>
					),
				},
				{
					key: "campaign",
					header: "Campaign",
					cell: (r) => <span className="font-mono text-[11px]">{text(r, "campaignReference") ?? "—"}</span>,
				},
				{ key: "action", header: "Action", cell: (r) => (text(r, "action") ? <StatusChip status={text(r, "action")!} /> : "—") },
				{ key: "at", header: "When", cell: (r) => <Value name="createdAt" value={pick(r, "createdAt", "timestamp")} /> },
			]}
			detail={() => ({ title: "Record access" })}
			empty={{
				title: "No access recorded",
				body: "Each time an organization opens a protected beneficiary record, it shows here.",
			}}
		/>
	);
}
