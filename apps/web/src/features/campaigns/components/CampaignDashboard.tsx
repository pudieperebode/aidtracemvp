"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CircleDollarSign, Users, Wallet } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Chip, MiniBars, Notice, ProgressBar, StatCard } from "@repo/ui/surface";
import { fundingProgress, remainingToTarget } from "@repo/stellar/money";
import { routes } from "@/lib/routes";
import { percent, usd, utcDate } from "@/lib/format";
import { useHydrated } from "@/lib/hydrated";
import { PageHeader } from "@/components/PageHeader";
import { CardSkeleton, ErrorState, StatsSkeleton } from "@/components/states";
import { CountUp, CountUpUsd } from "@/components/Money";
import { useIsAdmin } from "@/features/auth/hooks";
import { useCampaigns, usePublicCampaign } from "@/features/campaigns/hooks";
import { CAMPAIGN_STATUS, CATEGORIES } from "@/features/campaigns/status";
import { useLedger } from "@/features/ledger/hooks";
import { useFreshIds } from "@/features/ledger/fresh";
import { TransactionsTable } from "@/features/ledger/components/TransactionsTable";
import { FundDialog } from "@/features/disbursements/components/FundDialog";

/**
 * Screen 5: public campaign dashboard (Figma "Campaign dashboard"): funding target, raised, disbursed, remaining,
 * the funding bar, beneficiaries paid, status, latest verified transactions. Only public fields; administrators of
 * the campaign also get its management actions.
 */
export function CampaignDashboard({ reference }: { reference: string }) {
	const campaign = usePublicCampaign(reference);
	const ledger = useLedger({ campaign: reference, limit: 5 });
	const fresh = useFreshIds(ledger.data?.results);
	const hydrated = useHydrated();
	const isAdmin = useIsAdmin();
	const mine = useCampaigns();
	const managed = hydrated && isAdmin ? mine.data?.results.find((c) => c.reference === reference) : undefined;
	const [funding, setFunding] = useState(false);

	if (campaign.error) {
		return (
			<>
				<PageHeader title="Campaign" />
				<div className="rounded-card bg-white">
					<ErrorState
						error={campaign.error}
						onRetry={() => campaign.refetch()}
						title="Campaign not found"
					/>
					<div className="-mt-8 flex justify-center pb-12">
						<Button asChild variant="outline" size="sm">
							<Link href={routes.CAMPAIGNS()}>Browse campaigns</Link>
						</Button>
					</div>
				</div>
			</>
		);
	}

	const c = campaign.data;
	const t = c?.totals;

	return (
		<>
			<PageHeader
				title={c ? c.title : <span className="shimmer inline-block h-6 w-72 max-w-full rounded-control" aria-label="Loading" />}
				subtitle={c ? `${c.organization.name} · ${c.reference}` : " "}
				action={
					c && (
						<>
							{c.status === "active" && (
								<Button asChild variant="outline" className="bg-white">
									<Link href={routes.APPLY(c.reference)}>Apply for aid</Link>
								</Button>
							)}
							{managed && (
								<>
									<Button asChild variant="outline" className="bg-white">
										<Link href={routes.ALLOCATION({ campaign: c.reference })}>
											<Wallet /> Allocate funds
										</Link>
									</Button>
									{(c.status === "active" || c.status === "funded") && (
										<Button variant="accent" onClick={() => setFunding(true)}>
											<CircleDollarSign /> Fund campaign
										</Button>
									)}
								</>
							)}
						</>
					)
				}
			/>

			{!t ? (
				<StatsSkeleton />
			) : (
				<div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
					<StatCard className="animate-rise" label="Funding target" value={<CountUpUsd stroops={t.target} />} caption="USDC campaign goal" tone="review" />
					<StatCard
						className="animate-rise"
						style={{ ["--i" as string]: 1 }}
						label="Total raised"
						value={<CountUpUsd stroops={t.raised} />}
						caption={`${percent(t.raised, t.target)} of funding target`}
						tone="accent"
					/>
					<StatCard className="animate-rise" style={{ ["--i" as string]: 2 }} label="Total disbursed" value={<CountUpUsd stroops={t.disbursed} />} caption="Delivered to recipients" tone="pollen" />
					<StatCard className="animate-rise" style={{ ["--i" as string]: 3 }} label="Remaining balance" value={<CountUpUsd stroops={t.available} />} caption="Available for allocation" tone="ink" />
				</div>
			)}

			<div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				{!c || !t ? (
					<>
						<CardSkeleton className="min-h-[200px]" />
						<CardSkeleton className="min-h-[200px]" />
					</>
				) : (
					<>
						<section className="animate-rise rounded-card bg-white p-4 sm:p-5" style={{ ["--i" as string]: 4 }}>
							<h2 className="h-section">Campaign funding progress</h2>
							<p className="caption mt-2">Every contribution is recorded on Stellar and visible below.</p>
							<p className="stat-value mt-6 sm:mt-8">
								<CountUpUsd stroops={t.raised} />
							</p>
							<p className="caption mt-2">of {usd(t.target)} USDC</p>
							<ProgressBar value={fundingProgress(t)} className="mt-6 h-2" label="Funding progress" />
							<div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
								<span>{percent(t.raised, t.target)} funded</span>
								{BigInt(remainingToTarget(t)) > 0n && <span className="text-muted">{usd(remainingToTarget(t))} to go</span>}
							</div>
						</section>
						<div className="flex flex-col gap-3">
							<section className="animate-rise flex flex-1 flex-col rounded-card bg-white p-4 sm:p-5" style={{ ["--i" as string]: 5 }}>
								<p className="text-xs">Beneficiaries paid</p>
								<div className="mt-3 flex items-end justify-between gap-3">
									<p className="stat-value">
										<CountUp value={t.beneficiaries_paid} /> <span className="text-muted">of {c.beneficiary_target.toLocaleString("en-US")}</span>
									</p>
									<MiniBars tone="review" />
								</div>
								<p className="caption mt-3">{percent(t.beneficiaries_paid, c.beneficiary_target)} of target beneficiaries supported</p>
							</section>
							<section className="animate-rise rounded-card bg-white p-4 sm:p-5" style={{ ["--i" as string]: 6 }}>
								<p className="text-xs">Campaign status</p>
								<div className="mt-3 flex flex-wrap items-center gap-3">
									<Chip tone={CAMPAIGN_STATUS[c.status].tone}>{CAMPAIGN_STATUS[c.status].label}</Chip>
									<span className="text-xs">
										{c.status === "closed" ? "Ended" : "Ends"} {utcDate(c.ends_at)}
									</span>
								</div>
							</section>
						</div>
					</>
				)}
			</div>

			<section aria-labelledby="latest" className="mt-8">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h2 id="latest" className="h-section">
							Latest transactions
						</h2>
						<p className="caption mt-2">The five most recent inflows and payments.</p>
					</div>
					<Button asChild variant="outline" size="sm" className="bg-white">
						<Link href={routes.LEDGER({ campaign: reference })}>
							<ArrowUpRight /> Full ledger
						</Link>
					</Button>
				</div>
				<TransactionsTable
					rows={ledger.data?.results}
					isLoading={ledger.isPending}
					error={ledger.error}
					onRetry={() => ledger.refetch()}
					freshIds={fresh}
					emptyBody="This campaign hasn't received or paid out any funds yet."
				/>
			</section>

			{c && (
				<section className="mt-8 grid gap-3 lg:grid-cols-2">
					<div className="rounded-card bg-white p-4 sm:p-5">
						<h2 className="h-section">About this campaign</h2>
						<p className="mt-3 text-[13px] leading-6 text-ink/90">{c.description}</p>
						<dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
							<div>
								<dt className="text-muted">Category</dt>
								<dd className="mt-1">{CATEGORIES.find((x) => x.value === c.category)?.label}</dd>
							</div>
							<div>
								<dt className="text-muted">Runs</dt>
								<dd className="mt-1">
									{utcDate(c.starts_at)} – {utcDate(c.ends_at)}
								</dd>
							</div>
						</dl>
					</div>
					<div className="rounded-card bg-white p-4 sm:p-5">
						<h2 className="flex items-center gap-2 h-section">
							<Users className="size-4" aria-hidden /> Who this campaign supports
						</h2>
						<ul className="mt-3 flex flex-col gap-2">
							{c.eligibility.map((e) => (
								<li key={e} className="flex gap-2 text-[13px] leading-5">
									<span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
									{e}
								</li>
							))}
						</ul>
						<Notice tone="info" title="Privacy" className="mt-4">
							Beneficiaries appear only by reference (BNF-…). Names and documents are never published, but Stellar transactions and wallet addresses are publicly
							observable.
						</Notice>
					</div>
				</section>
			)}

			{managed && <FundDialog open={funding} onOpenChange={setFunding} campaign={managed} />}
		</>
	);
}
