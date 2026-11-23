import { toStroops } from "./format";
import type { CampaignTotals, Stroops } from "./campaign";

/** Funding progress as 0–100 for progress bars (raised ÷ target), capped at 100. Integer maths until the end. */
export function fundingProgress(totals: Pick<CampaignTotals, "raised" | "target">): number {
	const target = BigInt(totals.target);
	if (target <= 0n) return 0;
	const basisPoints = (BigInt(totals.raised) * 10_000n) / target;
	return Math.min(100, Number(basisPoints) / 100);
}

/** Remaining to target, never negative. */
export function remainingToTarget(totals: Pick<CampaignTotals, "raised" | "target">): Stroops {
	const diff = BigInt(totals.target) - BigInt(totals.raised);
	return (diff > 0n ? diff : 0n).toString();
}

/** Campaign Funding Planner (PRD §6): target ÷ beneficiaries, floored to the stroop. `target` is a decimal string. */
export function plannedAllocation(target: string, beneficiaries: number): Stroops {
	if (!Number.isInteger(beneficiaries) || beneficiaries <= 0) return "0";
	return (toStroops(target) / BigInt(beneficiaries)).toString();
}
