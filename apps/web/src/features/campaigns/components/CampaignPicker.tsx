"use client";

import { useRouter, usePathname } from "next/navigation";
import type { ManagedCampaign } from "@repo/stellar/campaign";
import { FilterSelect } from "@/components/DataTable";
import { useCampaigns } from "@/features/campaigns/hooks";

export type { ManagedCampaign };

/**
 * The campaign an admin screen works on: `?campaign=REF` when given, else the administrator's first published
 * campaign. Returns the list too, for the picker.
 */
export function useSelectedCampaign(reference: string | undefined) {
	const campaigns = useCampaigns();
	const list = campaigns.data?.results ?? [];
	const selected =
		(reference && list.find((c) => c.reference === reference)) ||
		list.find((c) => c.status === "active") ||
		list.find((c) => c.status !== "draft") ||
		list[0];
	return { ...campaigns, list, selected: selected as ManagedCampaign | undefined };
}

/** "Campaign: Clean water for every family" as a select that keeps the choice in the URL. */
export function CampaignPicker({
	list,
	selected,
	label = "Campaign",
	className,
}: {
	list: ManagedCampaign[];
	selected?: ManagedCampaign;
	label?: string;
	className?: string;
}) {
	const router = useRouter();
	const pathname = usePathname();
	if (!list.length || !selected) return null;
	return (
		<FilterSelect
			label={label}
			className={className}
			value={selected.reference}
			onChange={(reference) => router.replace(`${pathname}?campaign=${encodeURIComponent(reference)}`, { scroll: false })}
			options={list.map((c) => ({ value: c.reference, label: `${label}: ${c.title}${c.status === "draft" ? " (draft)" : ""}` }))}
		/>
	);
}
