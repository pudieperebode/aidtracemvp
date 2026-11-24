import type { ChipTone } from "@repo/ui/surface";
import type { CampaignDisplayStatus } from "@repo/stellar/campaign";

/** Campaign status labels and tones, by the backend's `displayStatus`. The only place this copy lives. */
export const CAMPAIGN_STATUS: Record<CampaignDisplayStatus, { label: string; tone: ChipTone; hint: string }> = {
	draft: { label: "Draft", tone: "neutral", hint: "Not published yet. Only you can see it." },
	active: { label: "Active", tone: "success", hint: "Accepting funding and beneficiary applications." },
	funded: { label: "Funded", tone: "review", hint: "Funding target reached. Still accepting applications." },
	closed: { label: "Closed", tone: "neutral", hint: "Campaign ended. The ledger stays public." },
	cancelled: { label: "Cancelled", tone: "danger", hint: "Cancelled by the organization." },
};

/** Suggestions for the free-text category (the backend accepts any 2–40 characters). */
export const CATEGORY_SUGGESTIONS = [
	"Clean water",
	"Food security",
	"Education",
	"Health",
	"Emergency relief",
	"Shelter",
	"Livelihoods",
];

/** Eligibility is one text field on the backend; show it one requirement per line. */
export const eligibilityLines = (text: string) =>
	text
		.split(/\n|;/)
		.map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
		.filter(Boolean);
