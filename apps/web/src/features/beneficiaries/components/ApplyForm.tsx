"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Notice } from "@repo/ui/surface";
import { routes } from "@/lib/routes";
import { utcDate } from "@/lib/format";
import { IS_MOCK } from "@/lib/mode";
import { PageHeader } from "@/components/PageHeader";
import { CardSkeleton, ErrorState } from "@/components/states";
import { usePublicCampaign } from "@/features/campaigns/hooks";
import { eligibilityLines } from "@/features/campaigns/status";
import { PRIVACY_NOTICE } from "@/features/ledger/status";
import { useApply } from "@/features/beneficiaries/hooks";
import { BeneficiaryForm } from "@/features/beneficiaries/components/BeneficiaryForm";
import { peekLastStatusToken } from "@/mock/server";

/**
 * Beneficiary application (public half of Screen 3): the campaign's eligibility rules, the application form (with
 * optional evidence) and a clear privacy notice. The backend answers the same way whether or not this wallet already
 * applied, so the page never says an application was definitely created: the private status link arrives by email.
 */
export function ApplyForm({ reference }: { reference: string }) {
	const campaign = usePublicCampaign(reference);
	const apply = useApply(reference);
	const [submitted, setSubmitted] = useState(false);
	const [demoToken, setDemoToken] = useState<string | null>(null);
	const c = campaign.data;
	const open = c && (c.status === "active" || c.display_status === "funded");

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
							<path
								d="M5 12.5l4.5 4.5L19 7.5"
								stroke="currentColor"
								strokeWidth="2.4"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="animate-check"
							/>
						</svg>
					</span>
					<h2 className="mt-5 text-lg">Application received</h2>
					<p className="mt-2 text-sm">Check your email for your private status link.</p>
					<p className="caption mt-3 max-w-[380px]">
						The link shows your reference and where your application stands, and lets you add documents until a decision is made.{" "}
						{c.organization.name} reviews eligibility; if approved, your allocation is paid in USDC to the wallet you gave.
					</p>
					{IS_MOCK && demoToken && (
						<Notice tone="info" title="Demo: no email is sent" className="mt-5 text-left">
							Open the private status link the backend would have emailed.{" "}
							<Link href={`${routes.APPLICATION_STATUS}#token=${demoToken}`} className="underline underline-offset-2">
								Open status page
							</Link>
						</Notice>
					)}
					<div className="mt-6 flex flex-wrap justify-center gap-2">
						<Button asChild variant="outline">
							<Link href={routes.CAMPAIGN(c.reference)}>Back to campaign</Link>
						</Button>
						<Button onClick={() => setSubmitted(false)}>Submit another</Button>
					</div>
				</section>
			) : !open ? (
				<Notice tone="warning" title="This campaign isn't accepting applications">
					It is {c.status}. Browse other campaigns that are open.
				</Notice>
			) : (
				<div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
					<section className="animate-rise rounded-card bg-white p-4 sm:p-5 lg:order-2">
						<BeneficiaryForm
							mode="apply"
							layout="stack"
							submitLabel="Submit application"
							onSubmit={async ({ evidence, ...input }) => {
								await apply.mutateAsync({ input, files: evidence });
								if (IS_MOCK) setDemoToken(peekLastStatusToken());
								setSubmitted(true);
								return null;
							}}
							header={
								<>
									<h2 className="h-section">Your application</h2>
									<p className="caption mt-2">Your details and documents go to protected storage, never to the public ledger.</p>
								</>
							}
						/>
					</section>
					<section className="animate-rise flex flex-col gap-3 lg:order-1" style={{ ["--i" as string]: 1 }}>
						<div className="rounded-card bg-white p-4 sm:p-5">
							<h2 className="h-section">Who can apply</h2>
							<ul className="mt-4 flex flex-col gap-2.5">
								{eligibilityLines(c.eligibility_requirements).map((e) => (
									<li key={e} className="flex gap-2 text-[13px] leading-5">
										<span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
										{e}
									</li>
								))}
							</ul>
							<p className="caption mt-4">Applications close {utcDate(c.ends_at)}.</p>
						</div>
						<Notice tone="info" title="How your information is used">
							Your name, contact details and documents are seen only by the campaign&apos;s administrators. Payments to you appear
							publicly only under a random reference. {PRIVACY_NOTICE}
						</Notice>
					</section>
				</div>
			)}
		</>
	);
}
