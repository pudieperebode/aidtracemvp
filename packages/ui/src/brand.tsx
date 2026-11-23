import { cn } from "./lib/utils";

/** The AidTrace mark from the app header: a graphite rounded square with a white plus (aid). */
export function AidTraceMark({ className, title }: { className?: string; title?: string }) {
	return (
		<svg viewBox="0 0 26 26" fill="none" role={title ? "img" : undefined} aria-hidden={!title} className={cn("size-[26px] shrink-0", className)}>
			{title && <title>{title}</title>}
			<rect width="26" height="26" rx="5" fill="currentColor" />
			<path d="M13 7.5v11M7.5 13h11" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
		</svg>
	);
}

/** Mark + wordmark, as in the app header ("plus" square + 14px name). */
export function AidTraceLogo({ className, markClassName }: { className?: string; markClassName?: string }) {
	return (
		<span className={cn("inline-flex items-center gap-2.5 text-ink", className)}>
			<AidTraceMark className={cn("text-ink", markClassName)} />
			<span className="text-sm leading-none tracking-[-0.02em]">AidTrace</span>
		</span>
	);
}

/** The landing wordmark (30px, no mark). */
export function AidTraceWordmark({ className }: { className?: string }) {
	return <span className={cn("text-[26px] leading-none tracking-[-0.03em] sm:text-[30px]", className)}>AidTrace</span>;
}

/**
 * The brand loader: a trace line runs around the mark, like a payment being followed from donor to recipient.
 * Reduced-motion visitors see the static mark with a full ring.
 */
export function BrandLoader({ className, label = "Loading" }: { className?: string; label?: string }) {
	return (
		<span role="status" aria-label={label} className={cn("inline-flex flex-col items-center", className)}>
			<svg viewBox="0 0 48 48" className="size-14 overflow-visible" aria-hidden>
				<rect x="2" y="2" width="44" height="44" rx="11" fill="none" stroke="var(--color-line)" strokeWidth="2" />
				<rect
					x="2"
					y="2"
					width="44"
					height="44"
					rx="11"
					fill="none"
					stroke="var(--color-brand)"
					strokeWidth="2"
					strokeLinecap="round"
					pathLength={100}
					className="animate-trace"
					style={{ ["--trace-length" as string]: 100 }}
				/>
				<rect x="11" y="11" width="26" height="26" rx="5" fill="var(--color-ink)" />
				<path d="M24 18.5v11M18.5 24h11" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
			</svg>
		</span>
	);
}
