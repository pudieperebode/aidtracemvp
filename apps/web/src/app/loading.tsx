import { BrandLoader } from "@repo/ui/brand";

/** First load of the app: the mark with a trace running around it, like a payment being followed. */
export default function Loading() {
	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-page">
			<BrandLoader label="Loading AidTrace" />
			<p className="caption tracking-wide">Tracing the ledger…</p>
		</div>
	);
}
