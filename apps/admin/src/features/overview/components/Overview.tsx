"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Notice, Panel, PanelHeader, StatCard } from "@repo/ui/surface";
import type { AdminRecord, IntegrityDto } from "@/lib/api/dto";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { useToast } from "@/lib/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { CardSkeleton, ErrorState, StatsSkeleton } from "@/components/states";
import { useAdminAction, useAdminDoc } from "@/features/admin/hooks";
import { RecordView } from "@/features/admin/components/RecordView";
import { humanize, pick, Value } from "@/features/admin/values";
import { decimalToStroops } from "@repo/stellar/format";
import { usd } from "@/lib/format";

/** Flattens the overview into "label → leaf" pairs, whatever its nesting (the shape is provisional). */
function leaves(record: AdminRecord, prefix = ""): [string, unknown][] {
	return Object.entries(record).flatMap(([key, value]) => {
		const name = prefix ? `${prefix}.${key}` : key;
		return value && typeof value === "object" && !Array.isArray(value)
			? leaves(value as AdminRecord, name)
			: [[name, value] as [string, unknown]];
	});
}

const TONES = ["review", "accent", "pollen", "brand", "ink"] as const;

/** Stat cards are narrow: money as "$140,250" (the organization app's stat format), everything else as usual. */
function statValue(name: string, value: unknown) {
	if (
		typeof value === "string" &&
		/^\d+(\.\d+)?$/.test(value) &&
		/amount|raised|allocated|disbursed|recovered|available|target|funds/i.test(name)
	)
		return usd(decimalToStroops(value));
	return <Value name={name} value={value} />;
}

/** `/admin/overview` + `/admin/integrity` + `/admin/system`. Integrity alerts when `healthy` is false (guide §14). */
export function Overview() {
	const toast = useToast();
	const overview = useAdminDoc("/overview");
	const integrity = useAdminDoc<IntegrityDto>("/integrity");
	const system = useAdminDoc("/system");
	const sweep = useAdminAction(() => "/sweeper/run");

	const runSweep = () =>
		sweep.mutate(undefined, {
			onSuccess: ({ data, message }) =>
				toast.success(message || "Sweep finished", {
					description:
						pick(data, "settled") !== undefined ? `${String(pick(data, "settled"))} transaction(s) settled.` : undefined,
				}),
			onError: (e) => toast.error("The sweep didn't run", { description: errorMessage(e) }),
		});

	return (
		<>
			<PageHeader
				title="Platform overview"
				subtitle="Totals, accounting integrity and service health across every organization."
				action={
					<Button
						variant="outline"
						className="h-10 bg-white"
						onClick={runSweep}
						isLoading={sweep.isPending}
						loadingText="Running sweep…"
					>
						<RefreshCw /> Run settlement sweep
					</Button>
				}
			/>

			{integrity.data && !integrity.data.healthy && (
				<Notice
					tone="error"
					title="Accounting integrity check failed"
					className="animate-rise mb-4"
					action={
						<Button asChild size="sm" variant="outline">
							<Link href={routes.RECONCILIATION}>Review issues</Link>
						</Button>
					}
				>
					Recorded balances and Stellar disagree somewhere. Review the open reconciliation issues before anything else.
				</Notice>
			)}
			{integrity.error && (
				<Notice tone="warning" title="The integrity check didn't load" className="mb-4">
					{errorMessage(integrity.error)}
				</Notice>
			)}

			{overview.isPending ? (
				<StatsSkeleton count={8} />
			) : overview.error ? (
				<div className="rounded-card bg-white">
					<ErrorState error={overview.error} onRetry={() => overview.refetch()} />
				</div>
			) : (
				<div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
					{leaves(overview.data).map(([name, value], i) => (
						<StatCard
							key={name}
							className="animate-rise"
							style={{ ["--i" as string]: Math.min(i, 8) }}
							label={humanize(name)}
							value={statValue(name, value)}
							tone={TONES[i % TONES.length]}
						/>
					))}
				</div>
			)}

			<div className="mt-8 grid items-start gap-3 lg:grid-cols-2">
				<Panel className="animate-rise">
					<PanelHeader
						title="Accounting integrity"
						description="Escrow balances, payouts and the ledger checked against each other."
						action={integrity.data && <Value name="status" value={integrity.data.healthy ? "ok" : "failed"} />}
					/>
					<div className="mt-5">
						{integrity.isPending ? <CardSkeleton lines={4} /> : integrity.data ? <RecordView record={integrity.data} /> : null}
					</div>
				</Panel>
				<Panel className="animate-rise" style={{ ["--i" as string]: 1 }}>
					<PanelHeader title="System health" description="Services, the arbiter account and the background worker." />
					<div className="mt-5">
						{system.isPending ? (
							<CardSkeleton lines={6} />
						) : system.error ? (
							<ErrorState error={system.error} onRetry={() => system.refetch()} />
						) : (
							<RecordView record={system.data} />
						)}
					</div>
				</Panel>
			</div>
		</>
	);
}
