"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Wand2 } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Field, Input, Textarea } from "@repo/ui/field";
import { mockAccountId } from "@repo/stellar/strkey";
import { IS_MOCK } from "@/lib/mode";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import { useToast } from "@/lib/use-toast";
import { applicationSchema, BENEFICIARY_FIELD, beneficiarySchema, type BeneficiaryValues } from "@/features/beneficiaries/schema";
import { EvidenceDropzone } from "@/features/beneficiaries/components/EvidenceDropzone";

/**
 * "Register a beneficiary" (Figma Beneficiary registration): name or ID, contact, wallet, eligibility details,
 * evidence. Used by administrators (email optional) and applicants (email required: the private status link is sent
 * there). The parent supplies the submit; backend field errors land under the matching inputs.
 */
export function BeneficiaryForm({
	onSubmit,
	mode = "admin",
	submitLabel = "Register beneficiary",
	layout = "row",
	header,
}: {
	/** Resolves with a toast message on success (or null to stay quiet). */
	onSubmit: (values: BeneficiaryValues) => Promise<{ title: string; description?: string } | null>;
	mode?: "admin" | "apply";
	submitLabel?: string;
	layout?: "row" | "stack";
	header?: React.ReactNode;
}) {
	const toast = useToast();
	const form = useForm<BeneficiaryValues>({
		resolver: zodResolver(mode === "apply" ? applicationSchema : beneficiarySchema),
		defaultValues: { fullName: "", email: "", phone: "", walletAddress: "", eligibilityDetails: "", evidence: [] },
		mode: "onTouched",
	});
	const { register, handleSubmit, formState, control, setValue, reset, setError } = form;
	const errors = formState.errors;
	const evidence = useWatch({ control, name: "evidence" });

	const submit = async (values: BeneficiaryValues) => {
		try {
			const done = await onSubmit(values);
			reset();
			if (done) toast.success(done.title, { description: done.description });
		} catch (error) {
			const fields = fieldErrors(error);
			for (const f of fields) {
				const name = BENEFICIARY_FIELD[f.field];
				if (name) setError(name, { message: f.message });
			}
			if (!fields.length)
				toast.error(mode === "apply" ? "Your application wasn't sent" : "Couldn't register the beneficiary", {
					description: errorMessage(error),
				});
		}
	};

	const grid = layout === "row" ? "mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3" : "mt-6 flex flex-col gap-5";

	return (
		<form noValidate onSubmit={handleSubmit(submit)}>
			{header}
			<div className={grid}>
				<Field
					label={mode === "apply" ? "Your name" : "Beneficiary name or ID"}
					htmlFor="b-name"
					error={errors.fullName?.message}
				>
					<Input
						id="b-name"
						placeholder={mode === "apply" ? "Full name" : "Enter name or unique ID"}
						autoComplete={mode === "apply" ? "name" : "off"}
						invalid={!!errors.fullName}
						{...register("fullName")}
					/>
				</Field>
				<Field
					label="Wallet address"
					htmlFor="b-wallet"
					error={errors.walletAddress?.message}
					hint={
						IS_MOCK ? (
							<button
								type="button"
								className="inline-flex cursor-pointer items-center gap-1 text-brand-dark hover:underline"
								onClick={() => setValue("walletAddress", mockAccountId(`demo-${Math.random()}`), { shouldValidate: true })}
							>
								<Wand2 className="size-3" aria-hidden /> Use a test address
							</button>
						) : (
							"Stellar account (G…). Needs USDC enabled to receive payouts."
						)
					}
				>
					<Input
						id="b-wallet"
						placeholder="G…"
						autoComplete="off"
						spellCheck={false}
						className="font-mono text-xs"
						invalid={!!errors.walletAddress}
						{...register("walletAddress")}
					/>
				</Field>
				<Field
					label={mode === "apply" ? "Email" : "Email (optional)"}
					htmlFor="b-email"
					error={errors.email?.message}
					hint={mode === "apply" ? "Your private status link is sent here." : "For status updates to the applicant."}
				>
					<Input
						id="b-email"
						type="email"
						placeholder="name@example.org"
						autoComplete={mode === "apply" ? "email" : "off"}
						invalid={!!errors.email}
						{...register("email")}
					/>
				</Field>
				<Field label="Phone (optional)" htmlFor="b-phone" error={errors.phone?.message}>
					<Input
						id="b-phone"
						type="tel"
						placeholder="+234…"
						autoComplete={mode === "apply" ? "tel" : "off"}
						invalid={!!errors.phone}
						{...register("phone")}
					/>
				</Field>
				<Field
					label="Eligibility details"
					htmlFor="b-notes"
					error={errors.eligibilityDetails?.message}
					className={layout === "row" ? "md:col-span-2" : undefined}
				>
					<Textarea
						id="b-notes"
						rows={2}
						placeholder="How the eligibility requirements are met"
						invalid={!!errors.eligibilityDetails}
						{...register("eligibilityDetails")}
					/>
				</Field>
			</div>
			<div
				className={
					layout === "row" ? "mt-6 grid items-end gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : "mt-6 flex flex-col gap-4"
				}
			>
				<EvidenceDropzone
					files={evidence}
					onChange={(files) => setValue("evidence", files, { shouldValidate: true })}
					error={errors.evidence?.message}
				/>
				<div className="flex justify-end">
					<Button
						type="submit"
						isLoading={formState.isSubmitting}
						loadingText={mode === "apply" ? "Sending…" : "Registering…"}
						className={layout === "stack" ? "w-full" : undefined}
						size={layout === "stack" ? "lg" : "md"}
					>
						<Plus /> {submitLabel}
					</Button>
				</div>
			</div>
		</form>
	);
}
