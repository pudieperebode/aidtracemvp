import { z } from "zod";
import { StrKey } from "@stellar/stellar-sdk";

export const stellarAddress = z
	.string()
	.trim()
	.min(1, "Enter the beneficiary's Stellar wallet address")
	.refine((v) => StrKey.isValidEd25519PublicKey(v), "Enter a Stellar account address (starts with G, 56 characters)");

/**
 * Beneficiary registration / application (Deliverable 1 "Beneficiary registration requirements"). Evidence and notes
 * go to protected off-chain storage only.
 */
export const beneficiarySchema = z.object({
	name: z.string().trim().min(2, "Enter a name or unique ID").max(120),
	wallet: stellarAddress,
	eligibilityNotes: z.string().trim().min(10, "Add how the eligibility requirements are met").max(4000),
	evidence: z.array(z.instanceof(File)).max(5, "Up to 5 files"),
});

export type BeneficiaryValues = z.infer<typeof beneficiarySchema>;

export const rejectionSchema = z.object({ reason: z.string().trim().min(5, "Tell the applicant why (at least 5 characters)").max(500) });
