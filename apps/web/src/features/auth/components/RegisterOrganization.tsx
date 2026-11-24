"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Field, Input, Textarea } from "@repo/ui/field";
import { Notice } from "@repo/ui/surface";
import { shortKey } from "@repo/stellar/format";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import { useToast } from "@/lib/use-toast";
import { useRegisterOrganization } from "@/features/auth/hooks";
import { useSession } from "@/features/auth/store";
import { organizationSchema, type OrganizationValues } from "@/features/campaigns/schema";
import { WalletSetup } from "@/features/wallet/components/WalletSetup";

/**
 * Deliverable 1 "Organization registration": the connected wallet becomes the organization's authorized
 * administrator wallet (one organization per wallet). Shown on admin screens until the wallet has one, with the
 * wallet setup steps (test XLM, USDC, test USDC) the backend guide lists before funding is possible.
 */
export function RegisterOrganization() {
	const toast = useToast();
	const address = useSession((s) => s.address);
	const register = useRegisterOrganization();
	const form = useForm<OrganizationValues>({
		resolver: zodResolver(organizationSchema),
		defaultValues: { name: "", description: "", websiteUrl: "" },
		mode: "onTouched",
	});
	const errors = form.formState.errors;

	const submit = (values: OrganizationValues) =>
		register
			.mutateAsync({
				name: values.name,
				description: values.description || undefined,
				websiteUrl: values.websiteUrl || undefined,
			})
			.then((org) =>
				toast.success(`${org.name} is registered`, {
					description: "Your wallet is its administrator wallet. Create your first campaign.",
				}),
			)
			.catch((error) => {
				const fields = fieldErrors(error);
				for (const f of fields)
					if (f.field === "name" || f.field === "description" || f.field === "websiteUrl")
						form.setError(f.field, { message: f.message });
				if (!fields.length) toast.error("The organization wasn't registered", { description: errorMessage(error) });
			});

	return (
		<div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,370px)]">
			<section className="animate-rise rounded-card bg-white p-4 sm:p-5">
				<div className="flex items-center gap-3">
					<span className="flex size-10 items-center justify-center rounded-card bg-field">
						<Building2 className="size-5" aria-hidden />
					</span>
					<div>
						<h2 className="h-section">Register your organization</h2>
						<p className="caption mt-1">One step before your first campaign.</p>
					</div>
				</div>
				<form noValidate onSubmit={form.handleSubmit(submit)} className="mt-6 flex flex-col gap-5">
					<Field label="Organization name" htmlFor="org-name" error={errors.name?.message}>
						<Input
							id="org-name"
							placeholder="Water for All Foundation"
							autoComplete="organization"
							invalid={!!errors.name}
							{...form.register("name")}
						/>
					</Field>
					<Field label="Website (optional)" htmlFor="org-web" error={errors.websiteUrl?.message}>
						<Input
							id="org-web"
							type="url"
							placeholder="https://waterforall.org"
							autoComplete="url"
							invalid={!!errors.websiteUrl}
							{...form.register("websiteUrl")}
						/>
					</Field>
					<Field label="What you do (optional)" htmlFor="org-about" error={errors.description?.message}>
						<Textarea
							id="org-about"
							rows={3}
							placeholder="Safe water and sanitation for rural communities."
							invalid={!!errors.description}
							{...form.register("description")}
						/>
					</Field>
					{address && (
						<Notice tone="info" title="Authorized administrator wallet">
							<span className="font-mono">{shortKey(address, 6, 6)}</span> funds, allocates and pays out for every campaign of
							this organization. It can&apos;t be changed later from here.
						</Notice>
					)}
					<div className="flex justify-end">
						<Button type="submit" size="lg" isLoading={form.formState.isSubmitting} loadingText="Registering…">
							Register organization
						</Button>
					</div>
				</form>
			</section>
			<WalletSetup className="animate-rise" />
		</div>
	);
}
