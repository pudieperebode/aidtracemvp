"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Wand2 } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { mockAccountId } from "@repo/stellar/strkey";
import { IS_MOCK } from "@/lib/mode";
import { errorMessage } from "@/lib/api/errors";
import { useToast } from "@/lib/use-toast";
import { beneficiarySchema, type BeneficiaryValues } from "@/features/beneficiaries/schema";
import { EvidenceDropzone } from "@/features/beneficiaries/components/EvidenceDropzone";

/**
 * "Register a beneficiary" (Figma Beneficiary registration): name or ID, wallet, eligibility details, evidence. Used by
 * administrators (console) and applicants (public form); the parent supplies the submit.
 */
export function BeneficiaryForm({
	onSubmit,
	submitLabel = "Register beneficiary",
	layout = "row",
	header,
}: {
	onSubmit: (values: BeneficiaryValues) => Promise<{ reference: string }>;
	submitLabel?: string;
	layout?: "row" | "stack";
	header?: React.ReactNode;
}) {
	const toast = useToast();
	const form = useForm<BeneficiaryValues>({ resolver: zodResolver(beneficiarySchema), defaultValues: { name: "", wallet: "", eligibilityNotes: "", evidence: [] }, mode: "onTouched" });
	const { register, handleSubmit, formState, control, setValue, reset, setError } = form;
	const errors = formState.errors;
	const evidence = useWatch({ control, name: "evidence" });

	const submit = async (values: BeneficiaryValues) => {
		try {
			const { reference } = await onSubmit(values);
			reset();
			toast.success(`${reference} registered`, { description: "The application is waiting for review." });
		} catch (error) {
			const message = errorMessage(error);
			if (/wallet/i.test(message)) setError("wallet", { message });
			else toast.error("Couldn't register the beneficiary", { description: message });
		}
	};

	return (
		<form noValidate onSubmit={handleSubmit(submit)}>
			{header}
			<div className={layout === "row" ? "mt-6 grid gap-5 md:grid-cols-3" : "mt-6 flex flex-col gap-5"}>
				<Field label="Beneficiary name or ID" htmlFor="b-name" error={errors.name?.message}>
					<Input id="b-name" placeholder="Enter name or unique ID" autoComplete="off" invalid={!!errors.name} {...register("name")} />
				</Field>
				<Field
					label="Wallet address"
					htmlFor="b-wallet"
					error={errors.wallet?.message}
					hint={
						IS_MOCK ? (
							<button
								type="button"
								className="inline-flex cursor-pointer items-center gap-1 text-brand-dark hover:underline"
								onClick={() => setValue("wallet", mockAccountId(`demo-${Math.random()}`), { shouldValidate: true })}
							>
								<Wand2 className="size-3" aria-hidden /> Use a test address
							</button>
						) : (
							"Stellar account (G…). Needs a USDC trustline to receive payouts."
						)
					}
				>
					<Input id="b-wallet" placeholder="G…" autoComplete="off" spellCheck={false} className="font-mono text-xs" invalid={!!errors.wallet} {...register("wallet")} />
				</Field>
				<Field label="Eligibility details" htmlFor="b-notes" error={errors.eligibilityNotes?.message}>
					<Input id="b-notes" placeholder="Add eligibility information" invalid={!!errors.eligibilityNotes} {...register("eligibilityNotes")} />
				</Field>
			</div>
			<div className={layout === "row" ? "mt-6 grid items-end gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : "mt-6 flex flex-col gap-4"}>
				<EvidenceDropzone files={evidence} onChange={(files) => setValue("evidence", files, { shouldValidate: true })} error={errors.evidence?.message} />
				<div className="flex justify-end">
					<Button type="submit" isLoading={formState.isSubmitting} loadingText="Registering…" className={layout === "stack" ? "w-full" : undefined} size={layout === "stack" ? "lg" : "md"}>
						<Plus /> {submitLabel}
					</Button>
				</div>
			</div>
		</form>
	);
}
