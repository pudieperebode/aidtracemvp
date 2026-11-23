"use client";

import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@repo/ui/button";
import { StatCard } from "@repo/ui/surface";
import { routes } from "@/lib/routes";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, StatsSkeleton } from "@/components/states";
import { CountUp, CountUpUsd } from "@/components/Money";
import { usePublicCampaigns, usePublicStats } from "@/features/campaigns/hooks";
import { CampaignCard, CampaignCardSkeleton } from "@/features/campaigns/components/CampaignCard";

const YEAR = new Date().getUTCFullYear();

/** Screen 1 in the app (Figma "Landing / Desktop"): platform statistics, featured campaigns, the public-by-default note. */
export function Overview() {
	const stats = usePublicStats();
	const featured = usePublicCampaigns({ featured: true });

	return (
		<>
			<PageHeader
				title="Real impact from contributions"
				subtitle="Support verified campaigns. Follow every USDC from donation to delivery."
				action={
					<Button asChild variant="accent">
						<Link href={routes.CREATE_CAMPAIGN}>
							<Plus /> Create campaign
						</Link>
					</Button>
				}
			/>

			{stats.error ? (
				<div className="rounded-card bg-white">
					<ErrorState error={stats.error} onRetry={() => stats.refetch()} />
				</div>
			) : !stats.data ? (
				<StatsSkeleton />
			) : (
				<div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
					<StatCard className="animate-rise" label="Total funds raised" value={<CountUpUsd stroops={stats.data.raised} />} caption="Across all public campaigns" tone="review" />
					<StatCard
						className="animate-rise"
						style={{ ["--i" as string]: 1 }}
						label="Total disbursed"
						value={<CountUpUsd stroops={stats.data.disbursed} />}
						caption="Delivered to beneficiaries"
						tone="accent"
					/>
					<StatCard className="animate-rise" style={{ ["--i" as string]: 2 }} label="Active campaigns" value={<CountUp value={stats.data.active_campaigns} />} caption="Creating lasting change" tone="pollen" />
					<StatCard
						className="animate-rise"
						style={{ ["--i" as string]: 3 }}
						label="Beneficiaries paid"
						value={<CountUp value={stats.data.beneficiaries_paid} />}
						caption="People supported to date"
						tone="ink"
					/>
				</div>
			)}

			<section aria-labelledby="featured" className="mt-10">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h2 id="featured" className="h-section">
							Featured campaigns
						</h2>
						<p className="caption mt-2">Verified organizations. Measurable outcomes.</p>
					</div>
					<Button asChild variant="outline" size="sm" className="bg-white">
						<Link href={routes.CAMPAIGNS()}>
							<ArrowUpRight /> View all campaigns
						</Link>
					</Button>
				</div>

				<div className="mt-5">
					{featured.error ? (
						<div className="rounded-card bg-white">
							<ErrorState error={featured.error} onRetry={() => featured.refetch()} />
						</div>
					) : !featured.data ? (
						<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
							{[0, 1, 2].map((i) => (
								<CampaignCardSkeleton key={i} />
							))}
						</div>
					) : featured.data.results.length === 0 ? (
						<div className="rounded-card bg-white">
							<EmptyState
								title="No campaigns yet"
								action={
									<Button asChild size="sm">
										<Link href={routes.CREATE_CAMPAIGN}>Create campaign</Link>
									</Button>
								}
							>
								Verified campaigns will appear here once an organization publishes the first one.
							</EmptyState>
						</div>
					) : (
						<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
							{featured.data.results.map((c, i) => (
								<CampaignCard key={c.id} campaign={c} index={i} style={{ ["--i" as string]: i + 2 }} />
							))}
						</div>
					)}
				</div>
			</section>

			<section className="animate-rise mt-6 rounded-card bg-white p-5" style={{ ["--i" as string]: 5 }}>
				<h2 className="text-[13px]">Public by default. Accountable at every step.</h2>
				<p className="caption mt-2">
					Explore the{" "}
					<Link href={routes.LEDGER()} className="text-ink underline underline-offset-2 hover:text-brand-dark">
						public ledger
					</Link>{" "}
					to see how every contribution is put to work. Beneficiaries appear only by privacy-safe reference.
				</p>
			</section>

			<p className="caption mt-12">© {YEAR} AidTrace. Transparent by design. Stellar Testnet · test USDC has no real value.</p>
		</>
	);
}
