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

/** Screen 2: Create Campaign. Limits match the backend (`POST /campaigns`). The organization comes from the account. */
export const createCampaignSchema = z
	.object({
		title: z
			.string()
			.trim()
			.min(3, "Give the campaign a name (at least 3 characters)")
			.max(140, "Keep the name under 140 characters"),
		description: z
			.string()
			.trim()
			.min(10, "Describe the mission, impact and use of funds (at least 10 characters)")
			.max(5000, "Keep it under 5,000 characters"),
		category: z.union([z.literal(""), z.string().trim().min(2, "At least 2 characters").max(40, "Up to 40 characters")]),
		target: usdcAmount,
		maxAllocation: usdcAmount,
		beneficiaryTarget: z.coerce
			.number<string | number>()
			.int("Whole number")
			.min(1, "At least one beneficiary")
			.max(100_000, "Up to 100,000"),
		eligibility: z.string().trim().min(3, "Describe who is eligible").max(5000, "Keep it under 5,000 characters"),
		startsAt: z.iso.date("Pick a start date"),
		endsAt: z.iso.date("Pick an end date"),
	})
	.refine((v) => v.endsAt > v.startsAt, { path: ["endsAt"], message: "The end date must be after the start date" })
	.refine((v) => !v.maxAllocation || !v.target || toStroops(v.maxAllocation) <= toStroops(v.target), {
		path: ["maxAllocation"],
		message: "Can't exceed the funding target",
	});

export type CreateCampaignForm = z.input<typeof createCampaignSchema>;
export type CreateCampaignValues = z.output<typeof createCampaignSchema>;

/** Backend field names → form field names, for `error.fields`. */
export const CAMPAIGN_FIELD: Record<string, keyof CreateCampaignForm> = {
	title: "title",
	description: "description",
	category: "category",
	eligibilityRequirements: "eligibility",
	targetAmount: "target",
	maxAllocation: "maxAllocation",
	beneficiaryTarget: "beneficiaryTarget",
	startsAt: "startsAt",
	endsAt: "endsAt",
};

/** Organization registration (the signed-in wallet becomes its administrator wallet). */
export const organizationSchema = z.object({
	name: z.string().trim().min(2, "Enter the organization's name").max(120),
	description: z.string().trim().max(2000),
	websiteUrl: z.union([z.literal(""), z.url("Enter a full URL, like https://example.org")]),
});

export type OrganizationValues = z.infer<typeof organizationSchema>;
