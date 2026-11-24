import { z } from "zod";
import { StrKey } from "@stellar/stellar-sdk";

export const stellarAddress = z
	.string()
	.trim()
	.min(1, "Enter the beneficiary's Stellar wallet address")
	.refine((v) => StrKey.isValidEd25519PublicKey(v), "Enter a Stellar account address (starts with G, 56 characters)");

/** The backend accepts PDF, PNG or JPEG, up to 5 MB each, at most 5 per application. */
export const EVIDENCE_TYPES = ["application/pdf", "image/png", "image/jpeg"];
export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_MAX_FILES = 5;

export const evidenceFiles = z
	.array(z.instanceof(File))
	.max(EVIDENCE_MAX_FILES, `Up to ${EVIDENCE_MAX_FILES} files`)
	.refine((files) => files.every((f) => EVIDENCE_TYPES.includes(f.type)), "Upload PDF, PNG or JPEG files")
	.refine((files) => files.every((f) => f.size <= EVIDENCE_MAX_BYTES), "Each file can be up to 5 MB");

const email = z.union([z.literal(""), z.email("Enter a valid email address")]);

/**
 * Beneficiary registration by an administrator (Deliverable 1 "Beneficiary registration requirements"). Details and
 * evidence go to protected off-chain storage only. Email is optional here; the applicant gets status updates when given.
 */
export const beneficiarySchema = z.object({
	fullName: z.string().trim().min(2, "Enter a name or unique ID").max(120),
	email,
	phone: z.string().trim().max(40),
	walletAddress: stellarAddress,
	eligibilityDetails: z.string().trim().min(3, "Add how the eligibility requirements are met").max(4000),
	evidence: evidenceFiles,
});

export type BeneficiaryValues = z.infer<typeof beneficiarySchema>;

/** The public application: email is required, because the private status link is emailed. Evidence can come with it or later. */
export const applicationSchema = beneficiarySchema.extend({
	email: z.email("Enter your email address: we send your private status link there"),
});

/** Backend field names → form field names, for `error.fields`. */
export const BENEFICIARY_FIELD: Record<string, "fullName" | "email" | "phone" | "walletAddress" | "eligibilityDetails"> = {
	fullName: "fullName",
	email: "email",
	phone: "phone",
	walletAddress: "walletAddress",
	eligibilityDetails: "eligibilityDetails",
};

export const reviewNoteSchema = z.object({ note: z.string().trim().max(500, "Keep the note under 500 characters") });
