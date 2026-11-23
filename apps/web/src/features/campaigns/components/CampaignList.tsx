"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@repo/ui/button";
import { SearchInput } from "@repo/ui/field";
import { routes } from "@/lib/routes";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState } from "@/components/states";
import { FilterSelect } from "@/components/DataTable";
import { usePublicCampaigns } from "@/features/campaigns/hooks";
import { CampaignCard, CampaignCardSkeleton } from "@/features/campaigns/components/CampaignCard";

const STATUS = [
	{ value: "", label: "All campaigns" },
	{ value: "active", label: "Active" },
	{ value: "funded", label: "Funded" },
	{ value: "closed", label: "Closed" },
];

/** Every public campaign ("View all campaigns"), searchable and filterable by status. Filters live in the URL. */
export function CampaignList({ q, status }: { q?: string; status?: string }) {
	const router = useRouter();
	const list = usePublicCampaigns({ q, status });
	const set = (next: { q?: string; status?: string }) => router.replace(routes.CAMPAIGNS({ q, status, ...next }), { scroll: false });

	return (
		<>
			<PageHeader
				title="Campaigns"
				subtitle="Every public campaign, its funding and its payouts, verifiable on Stellar."
				action={
					<Button asChild variant="accent">
						<Link href={routes.CREATE_CAMPAIGN}>
							<Plus /> Create campaign
						</Link>
					</Button>
				}
			/>
			<form
				role="search"
				className="mb-4 flex flex-col gap-2 sm:flex-row"
				onSubmit={(e) => {
					e.preventDefault();
					set({ q: new FormData(e.currentTarget).get("q")?.toString().trim() || undefined });
				}}
			>
				<SearchInput name="q" defaultValue={q} placeholder="Search by name or reference" aria-label="Search campaigns" className="sm:w-[300px]" />
				<FilterSelect label="Status" value={status ?? ""} onChange={(v) => set({ status: v || undefined })} options={STATUS} className="sm:w-[180px]" />
			</form>

			{list.error ? (
				<div className="rounded-card bg-white">
					<ErrorState error={list.error} onRetry={() => list.refetch()} />
				</div>
			) : !list.data ? (
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{[0, 1, 2, 3, 4, 5].map((i) => (
						<CampaignCardSkeleton key={i} />
					))}
				</div>
			) : list.data.results.length === 0 ? (
				<div className="rounded-card bg-white">
					<EmptyState
						title={q || status ? "No campaigns match" : "No campaigns yet"}
						icon={q || status ? "search" : "inbox"}
						action={
							(q || status) && (
								<Button variant="outline" size="sm" onClick={() => router.replace(routes.CAMPAIGNS())}>
									Clear filters
								</Button>
							)
						}
					>
						{q || status ? "Try a different name, reference or status." : "Verified campaigns will appear here once published."}
					</EmptyState>
				</div>
			) : (
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{list.data.results.map((c, i) => (
						<CampaignCard key={c.id} campaign={c} index={i} style={{ ["--i" as string]: Math.min(i, 8) }} />
					))}
				</div>
			)}
		</>
	);
}
