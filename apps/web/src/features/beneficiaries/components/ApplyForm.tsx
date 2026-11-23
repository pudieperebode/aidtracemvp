"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Notice } from "@repo/ui/surface";
import { routes } from "@/lib/routes";
import { utcDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { CardSkeleton, ErrorState } from "@/components/states";
import { usePublicCampaign } from "@/features/campaigns/hooks";
import { useApply } from "@/features/beneficiaries/hooks";
import { BeneficiaryForm } from "@/features/beneficiaries/components/BeneficiaryForm";

/**
 * Beneficiary application (public half of Screen 3): the campaign's eligibility rules, the registration form and
 * a clear privacy notice. The application starts as "Pending" until an administrator reviews it.
 */
export function ApplyForm({ reference }: { reference: string }) {
	const campaign = usePublicCampaign(reference);
	const apply = useApply(reference);
	const [submitted, setSubmitted] = useState<string | null>(null);
	const c = campaign.data;

	return (
		<>
			<PageHeader title="Apply for support" subtitle={c ? `${c.title} · ${c.organization.name}` : " "} />
			{campaign.error ? (
				<div className="rounded-card bg-white">
					<ErrorState error={campaign.error} onRetry={() => campaign.refetch()} title="Campaign not found" />
				</div>
			) : !c ? (
				<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
					<CardSkeleton className="min-h-[360px]" lines={6} />
					<CardSkeleton className="min-h-[240px]" />
				</div>
			) : submitted ? (
				<section className="animate-pop mx-auto flex max-w-[520px] flex-col items-center rounded-card bg-white px-6 py-14 text-center">
					<span className="flex size-12 items-center justify-center rounded-full bg-brand text-white">
						<svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
							<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="animate-check" />
						</svg>
					</span>
					<h2 className="mt-5 text-lg">Application received</h2>
					<p className="mt-2 text-sm">
						Your reference is <span className="font-mono">{submitted}</span>
					</p>
					<p className="caption mt-3 max-w-[380px]">
						{c.organization.name} will review your eligibility. If approved, your allocation is paid in USDC straight to the wallet you gave. Keep your
						reference to follow payments on the public ledger.
					</p>
					<div className="mt-6 flex flex-wrap justify-center gap-2">
						<Button asChild variant="outline">
							<Link href={routes.CAMPAIGN(c.reference)}>Back to campaign</Link>
						</Button>
						<Button onClick={() => setSubmitted(null)}>Submit another</Button>
					</div>
				</section>
			) : c.status !== "active" ? (
				<Notice tone="warning" title="This campaign isn't accepting applications">
					It is {c.status}. Browse other campaigns that are open.
				</Notice>
			) : (
				<div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
					<section className="animate-rise rounded-card bg-white p-4 sm:p-5 lg:order-2">
						<BeneficiaryForm
							layout="stack"
							submitLabel="Submit application"
							onSubmit={async (values) => {
								const result = await apply.mutateAsync(values);
								setSubmitted(result.reference);
								return result;
							}}
							header={
								<>
									<h2 className="h-section">Your application</h2>
									<p className="caption mt-2">Fields marked here go to protected storage, never to the public ledger.</p>
								</>
							}
						/>
					</section>
					<section className="animate-rise flex flex-col gap-3 lg:order-1" style={{ ["--i" as string]: 1 }}>
						<div className="rounded-card bg-white p-4 sm:p-5">
							<h2 className="h-section">Who can apply</h2>
							<ul className="mt-4 flex flex-col gap-2.5">
								{c.eligibility.map((e) => (
									<li key={e} className="flex gap-2 text-[13px] leading-5">
										<span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
										{e}
									</li>
								))}
							</ul>
							<p className="caption mt-4">Applications close {utcDate(c.ends_at)}.</p>
						</div>
						<Notice tone="info" title="How your information is used">
							Your name, details and documents are seen only by the campaign&apos;s administrators. The public ledger shows a reference (BNF-…) and the amount
							paid. Note that Stellar transactions and wallet addresses are publicly observable.
						</Notice>
					</section>
				</div>
			)}
		</>
	);
}
