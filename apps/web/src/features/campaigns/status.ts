import type { ChipTone } from "@repo/ui/surface";
import type { CampaignCategory, CampaignStatus } from "@repo/stellar/campaign";

/** Campaign status labels and tones. The only place this copy lives. */
export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; tone: ChipTone; hint: string }> = {
	draft: { label: "Draft", tone: "neutral", hint: "Not yet registered on Stellar." },
	active: { label: "Active", tone: "success", hint: "Accepting funding and beneficiary applications." },
	funded: { label: "Funded", tone: "review", hint: "Funding target reached." },
	closed: { label: "Closed", tone: "neutral", hint: "Campaign ended. The ledger stays public." },
	cancelled: { label: "Cancelled", tone: "danger", hint: "Cancelled by the organization." },
};

export const CATEGORIES: { value: CampaignCategory; label: string }[] = [
	{ value: "water", label: "Water" },
	{ value: "food", label: "Food & relief" },
	{ value: "education", label: "Education" },
	{ value: "health", label: "Health" },
];
