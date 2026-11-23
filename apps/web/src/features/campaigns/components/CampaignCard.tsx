import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Chip, ProgressBar } from "@repo/ui/surface";
import { fundingProgress } from "@repo/stellar/money";
import type { PublicCampaign } from "@repo/stellar/campaign";
import { routes } from "@/lib/routes";
import { usd } from "@/lib/format";
import { CAMPAIGN_STATUS } from "@/features/campaigns/status";

/**
 * Featured campaign card (Figma Overview): status chip + "01 / PUBLIC CAMPAIGN", title, organization, "$72,000 raised
 * of $100,000", the purple funding bar and "View campaign".
 */
export function CampaignCard({ campaign, index, style }: { campaign: PublicCampaign; index: number; style?: React.CSSProperties }) {
	const status = CAMPAIGN_STATUS[campaign.status];
	const progress = fundingProgress(campaign.totals);
	return (
		<article className="animate-rise group relative flex min-w-0 flex-col rounded-card bg-white p-4 transition-shadow duration-300 hover:shadow-[0_18px_40px_-24px_rgba(14,14,14,0.35)] sm:p-5" style={style}>
			<div className="flex items-center justify-between gap-3">
				<Chip tone={status.tone}>{status.label}</Chip>
				<span className="text-[11px] tracking-[0.02em] text-ink uppercase">
					{String(index + 1).padStart(2, "0")} / Public campaign
				</span>
			</div>
			<h3 className="mt-5 text-xl leading-tight tracking-[-0.02em] sm:text-[22px]">
				<Link href={routes.CAMPAIGN(campaign.reference)} className="after:absolute after:inset-0 focus-visible:outline-none">
					{campaign.title}
				</Link>
			</h3>
			<p className="mt-auto pt-8 text-xs">{campaign.organization.name}</p>
			<div className="mt-4 h-px bg-line" />
			<div className="mt-3 flex items-baseline justify-between gap-2">
				<p className="text-base tabular-nums">{usd(campaign.totals.raised)} raised</p>
				<p className="caption tabular-nums">of {usd(campaign.totals.target)}</p>
			</div>
			<ProgressBar value={progress} className="mt-3" label={`${campaign.title} funding progress`} />
			<Link
				href={routes.CAMPAIGN(campaign.reference)}
				className="relative z-10 mt-4 flex h-9 items-center gap-2 rounded-control border border-line px-3 text-xs transition-colors hover:bg-field"
			>
				<ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:rotate-45" aria-hidden />
				View campaign
			</Link>
		</article>
	);
}

export function CampaignCardSkeleton() {
	return (
		<div className="flex min-h-[260px] flex-col rounded-card bg-white p-5" aria-hidden>
			<div className="flex justify-between">
				<div className="shimmer h-[21px] w-16 rounded-full" />
				<div className="shimmer h-3 w-28 rounded-control" />
			</div>
			<div className="shimmer mt-5 h-5 w-3/4 rounded-control" />
			<div className="shimmer mt-auto h-3 w-1/3 rounded-control" />
			<div className="shimmer mt-6 h-4 w-1/2 rounded-control" />
			<div className="shimmer mt-3 h-1.5 w-full rounded-full" />
			<div className="shimmer mt-4 h-9 w-full rounded-control" />
		</div>
	);
}
