import { z } from "zod";
import { toStroops } from "@repo/stellar/format";

/** A positive USDC amount with at most 7 decimals, as typed. Kept as a string: money is never a float. */
export const usdcAmount = z
	.string()
	.trim()
	.min(1, "Enter an amount")
	.transform((v) => v.replace(/,/g, ""))
	.pipe(z.string().regex(/^\d+(\.\d{1,7})?$/, "Enter an amount like 2000 or 12.50 (up to 7 decimals)"))
	.refine((v) => toStroops(v) > 0n, "Must be more than 0");

/** Screen 2: Create Campaign (Deliverable 1 "Campaign creation requirements"). */
export const createCampaignSchema = z
	.object({
		title: z.string().trim().min(3, "Give the campaign a name").max(120, "Keep the name under 120 characters"),
		description: z.string().trim().min(20, "Describe the mission, impact and use of funds (at least 20 characters)").max(4000),
		organizationName: z.string().trim().min(2, "Enter the organization's name").max(120),
		organizationWebsite: z.union([z.literal(""), z.url("Enter a full URL, like https://example.org")]),
		category: z.enum(["water", "food", "education", "health"]),
		target: usdcAmount,
		maxAllocation: usdcAmount,
		beneficiaryTarget: z.coerce.number<string | number>().int("Whole number").min(1, "At least one beneficiary").max(100_000, "Up to 100,000"),
		eligibility: z.string().trim().min(10, "Describe who is eligible (one requirement per line)").max(2000),
		startsAt: z.iso.date("Pick a start date"),
		endsAt: z.iso.date("Pick an end date"),
	})
	.refine((v) => v.endsAt > v.startsAt, { path: ["endsAt"], message: "The end date must be after the start date" })
	.refine((v) => !v.maxAllocation || !v.target || toStroops(v.maxAllocation) <= toStroops(v.target), { path: ["maxAllocation"], message: "Can't exceed the funding target" });

export type CreateCampaignForm = z.input<typeof createCampaignSchema>;
export type CreateCampaignValues = z.output<typeof createCampaignSchema>;

/** "One per line" → a clean list. */
export const eligibilityList = (text: string) =>
	text
		.split(/\n|;/)
		.map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
		.filter(Boolean);
