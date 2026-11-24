"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, FileLock2, Plus } from "lucide-react";
import { Button } from "@repo/ui/button";
import { AffixInput, Field, Input, Textarea } from "@repo/ui/field";
import { DetailRow, ProgressBar } from "@repo/ui/surface";
import { toStroops } from "@repo/stellar/format";
import { plannedAllocation } from "@repo/stellar/money";
import { routes } from "@/lib/routes";
import { usdc } from "@/lib/format";
import { useToast } from "@/lib/use-toast";
import { isoDay } from "@/lib/format";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import { PageHeader } from "@/components/PageHeader";
import { useOrganization } from "@/features/auth/hooks";
import { useCreateCampaign } from "@/features/campaigns/hooks";
import { CATEGORY_SUGGESTIONS } from "@/features/campaigns/status";
import {
	CAMPAIGN_FIELD,
	createCampaignSchema,
	type CreateCampaignForm,
	type CreateCampaignValues,
} from "@/features/campaigns/schema";

/**
 * Screen 2 (Figma "Create campaign"): campaign details, target and dates on the left; eligibility, beneficiary target,
 * per-beneficiary maximum and the funding planner (PRD §6) on the right. The organization and its administrator wallet
 * come from the signed-in account. Submitting creates the draft and publishes it (no wallet signature needed).
 */
export function CreateCampaign() {
	const router = useRouter();
	const toast = useToast();
	const create = useCreateCampaign();
	const organization = useOrganization();
	const [defaults] = useState<CreateCampaignForm>(() => {
		const today = Date.now();
		return {
			title: "",
			description: "",
			category: "",
			target: "",
			maxAllocation: "",
			beneficiaryTarget: "",
			eligibility: "",
			startsAt: isoDay(today),
			endsAt: isoDay(today + 90 * 86_400_000),
		};
	});

	const form = useForm<CreateCampaignForm, unknown, CreateCampaignValues>({
		resolver: zodResolver(createCampaignSchema),
		defaultValues: defaults,
		mode: "onTouched",
	});
	const { register, handleSubmit, formState, control, setError } = form;
	const errors = formState.errors;
	const [target, maxAllocation, beneficiaryTarget] = useWatch({
		control,
		name: ["target", "maxAllocation", "beneficiaryTarget"],
	});

	// Funding planner (PRD §6): allocation each = target ÷ beneficiaries, capped by the per-beneficiary maximum.
	const plan = (() => {
		try {
			const count = Number(beneficiaryTarget);
			const t = target ? toStroops(String(target).replace(/,/g, "")) : 0n;
			if (!t || !Number.isInteger(count) || count < 1) return null;
			const each = BigInt(plannedAllocation(String(target).replace(/,/g, ""), count));
			const max = maxAllocation ? toStroops(String(maxAllocation).replace(/,/g, "")) : null;
			return { each, t, count, overMax: max !== null && each > max, max };
		} catch {
			return null;
		}
	})();

	const onSubmit = (values: CreateCampaignValues) =>
		create
			.mutateAsync(
				{
					title: values.title,
					description: values.description,
					category: values.category || undefined,
					eligibilityRequirements: values.eligibility,
					targetAmount: values.target,
					maxAllocation: values.maxAllocation,
					beneficiaryTarget: values.beneficiaryTarget,
					startsAt: new Date(`${values.startsAt}T00:00:00Z`).toISOString(),
					endsAt: new Date(`${values.endsAt}T23:59:59Z`).toISOString(),
				},
				{
					onSuccess: (result) => {
						if (result.published) {
							toast.success(`${result.campaign.title} is live`, {
								description: `Published as ${result.campaign.reference}. Next: fund it and review beneficiaries.`,
							});
							router.push(routes.CAMPAIGN(result.campaign.reference));
						} else {
							toast.warning(`${result.campaign.reference} was saved as a draft`, {
								description: `${errorMessage(result.publishError)} Publish it from Fund allocation.`,
							});
							router.push(routes.ALLOCATION({ campaign: result.campaign.reference }));
						}
					},
					onError: (error) => {
						const fields = fieldErrors(error);
						for (const f of fields) {
							const name = CAMPAIGN_FIELD[f.field];
							if (name) setError(name, { message: f.message });
						}
						if (!fields.length) toast.error("The campaign wasn't created", { description: errorMessage(error) });
					},
				},
			)
			.catch(() => undefined);

	return (
		<>
			<PageHeader title="Create campaign" subtitle="Set up a transparent campaign and start making an impact." />
			<form
				noValidate
				onSubmit={handleSubmit(onSubmit)}
				className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,370px)]"
			>
				<section className="animate-rise min-w-0 rounded-card bg-white p-4 sm:p-5">
					<h2 className="h-section">Campaign details</h2>
					<p className="caption mt-2">Tell the public what you&apos;re raising funds for.</p>
					<div className="mt-6 flex flex-col gap-5">
						<Field label="Campaign name" htmlFor="title" error={errors.title?.message}>
							<Input id="title" placeholder="e.g. Clean water for every family" invalid={!!errors.title} {...register("title")} />
						</Field>
						<Field label="Description" htmlFor="description" error={errors.description?.message}>
							<Textarea
								id="description"
								rows={3}
								placeholder="Describe the mission, impact and use of funds…"
								invalid={!!errors.description}
								{...register("description")}
							/>
						</Field>
					</div>

					<h2 className="mt-8 h-section">Organization details</h2>
					<div className="mt-4 flex items-center gap-3 rounded-card bg-page p-3.5">
						<span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-white">
							<Building2 className="size-4" aria-hidden />
						</span>
						<div className="min-w-0">
							<p className="truncate text-[13px]">
								{organization.data?.name ?? (
									<span className="shimmer inline-block h-3 w-40 rounded-control" aria-label="Loading" />
								)}
							</p>
							<p className="caption truncate">
								{organization.data?.website_url ?? "Your administrator wallet is the campaign's authorized wallet."}
							</p>
						</div>
					</div>
					<div className="mt-5 grid gap-5 sm:grid-cols-3">
						<Field label="Funding target (USDC)" htmlFor="target" error={errors.target?.message}>
							<AffixInput
								id="target"
								inputMode="decimal"
								placeholder="100,000.00"
								trailing="USDC"
								invalid={!!errors.target}
								{...register("target")}
							/>
						</Field>
						<Field label="Start date" htmlFor="startsAt" error={errors.startsAt?.message}>
							<Input id="startsAt" type="date" invalid={!!errors.startsAt} {...register("startsAt")} />
						</Field>
						<Field label="End date" htmlFor="endsAt" error={errors.endsAt?.message}>
							<Input id="endsAt" type="date" invalid={!!errors.endsAt} {...register("endsAt")} />
						</Field>
					</div>
				</section>

				<section
					className="animate-rise flex min-w-0 flex-col rounded-card bg-white p-4 sm:p-5 lg:sticky lg:top-[88px]"
					style={{ ["--i" as string]: 1 }}
				>
					<h2 className="h-section">Eligibility &amp; recipients</h2>
					<p className="caption mt-2">Define who this campaign will support.</p>
					<div className="mt-6 flex flex-col gap-5">
						<Field
							label="Eligibility requirements"
							htmlFor="eligibility"
							hint="One requirement per line."
							error={errors.eligibility?.message}
						>
							<Textarea
								id="eligibility"
								rows={3}
								placeholder="Households without access to clean water."
								invalid={!!errors.eligibility}
								{...register("eligibility")}
							/>
						</Field>
						<div className="grid grid-cols-2 gap-3">
							<Field label="Beneficiary target" htmlFor="beneficiaryTarget" error={errors.beneficiaryTarget?.message}>
								<Input
									id="beneficiaryTarget"
									inputMode="numeric"
									placeholder="400"
									invalid={!!errors.beneficiaryTarget}
									{...register("beneficiaryTarget")}
								/>
							</Field>
							<Field label="Max per beneficiary" htmlFor="maxAllocation" error={errors.maxAllocation?.message}>
								<AffixInput
									id="maxAllocation"
									inputMode="decimal"
									placeholder="250"
									trailing="USDC"
									invalid={!!errors.maxAllocation}
									{...register("maxAllocation")}
								/>
							</Field>
						</div>
						<Field
							label="Category (optional)"
							htmlFor="category"
							hint="Shown on campaign cards and used to filter."
							error={errors.category?.message}
						>
							<Input
								id="category"
								list="category-suggestions"
								placeholder="e.g. Food security"
								autoComplete="off"
								invalid={!!errors.category}
								{...register("category")}
							/>
						</Field>
						<datalist id="category-suggestions">
							{CATEGORY_SUGGESTIONS.map((c) => (
								<option key={c} value={c} />
							))}
						</datalist>
					</div>

					<div className="mt-6 rounded-card bg-page p-3.5" aria-live="polite">
						<p className="text-xs">Campaign allocation preview</p>
						{plan ? (
							<dl className="mt-3 flex flex-col gap-2">
								<DetailRow label="Planned allocation each" value={usdc(plan.each)} />
								<DetailRow label="Beneficiaries" value={plan.count.toLocaleString("en-US")} />
								<DetailRow label="Funding target" value={usdc(plan.t)} />
								{plan.overMax && (
									<p className="caption text-accent-dark">
										The planned share is above your maximum of {usdc(plan.max!)}; some funds would stay unallocated.
									</p>
								)}
								<ProgressBar value={0} className="mt-1" label="Funding progress (starts at 0)" />
							</dl>
						) : (
							<p className="caption mt-2">
								Enter a funding target and beneficiary target to see each beneficiary&apos;s planned share.
							</p>
						)}
					</div>

					<div className="mt-6 border-t border-line pt-5">
						<p className="flex items-center gap-2 text-xs">
							<FileLock2 className="size-4 text-review" aria-hidden /> All campaign activity is public
						</p>
						<p className="caption mt-2">
							Only privacy-safe references appear on the public ledger. After publishing, only the name, description, category and
							end date can change.
						</p>
					</div>

					<Button
						type="submit"
						variant="accent"
						size="lg"
						className="mt-8 w-full"
						isLoading={formState.isSubmitting}
						loadingText="Creating campaign…"
					>
						<Plus /> Create campaign
					</Button>
				</section>
			</form>
		</>
	);
}
