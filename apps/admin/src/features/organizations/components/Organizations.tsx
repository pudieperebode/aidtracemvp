"use client";

import { ResourceScreen } from "@/features/admin/components/ResourceScreen";
import { pick, text, Value } from "@/features/admin/values";

/** `/admin/organizations`: every registered organization and its administrator wallet. */
export function Organizations() {
	return (
		<ResourceScreen
			title="Organizations"
			subtitle="Registered organizations. Each has one authorized administrator wallet."
			resource="organizations"
			search={{ param: "search", label: "Search organizations", placeholder: "Organization name" }}
			columns={[
				{ key: "name", header: "Organization", mobile: "title", cell: (o) => text(o, "name") ?? "—" },
				{
					key: "wallet",
					header: "Administrator wallet",
					cell: (o) => <Value name="adminWallet" value={pick(o, "adminWallet", "walletAddress")} />,
				},
				{
					key: "web",
					header: "Website",
					cell: (o) => {
						const url = text(o, "websiteUrl", "website");
						return url ? (
							<a href={url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
								{url.replace(/^https?:\/\//, "")}
							</a>
						) : (
							<span className="text-muted">—</span>
						);
					},
				},
				{
					key: "campaigns",
					header: "Campaigns",
					cell: (o) => <Value name="campaigns" value={pick(o, "campaigns", "campaignCount")} />,
				},
				{ key: "created", header: "Registered", cell: (o) => <Value name="createdAt" value={pick(o, "createdAt")} /> },
			]}
			detail={(o) => ({ title: text(o, "name") ?? "Organization" })}
			empty={{ title: "No organizations yet", body: "Organizations appear here once an administrator wallet registers one." }}
		/>
	);
}
