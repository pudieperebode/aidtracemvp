import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "./lib/utils";

/** White card, radius 8 (every content block in the app frames). */
export function Panel({ className, ...props }: React.ComponentProps<"section">) {
	return <section className={cn("min-w-0 rounded-card bg-white p-4 sm:p-5", className)} {...props} />;
}

/** Card heading: 16px title, optional 12px description and an action on the right. */
export function PanelHeader({
	title,
	description,
	action,
	className,
	as: Heading = "h2",
}: {
	title: React.ReactNode;
	description?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
	as?: "h2" | "h3";
}) {
	return (
		<div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
			<div className="min-w-0">
				<Heading className="h-section">{title}</Heading>
				{description && <p className="caption mt-2">{description}</p>}
			</div>
			{action}
		</div>
	);
}

const NOTICE = {
	info: { icon: Info, box: "bg-field", title: "text-ink", icn: "text-review" },
	brand: { icon: Info, box: "bg-brand-soft", title: "text-brand-deep", icn: "text-brand-dark" },
	warning: { icon: AlertTriangle, box: "bg-pollen-soft", title: "text-pollen-deep", icn: "text-pollen-dark" },
	error: { icon: XCircle, box: "bg-danger-bg", title: "text-danger", icn: "text-danger" },
	success: { icon: CheckCircle2, box: "bg-brand-soft", title: "text-brand-dark", icn: "text-brand-dark" },
} as const;

/** Tinted explainer box ("All campaign activity is public"). */
export function Notice({
	tone = "info",
	title,
	children,
	className,
	action,
	icon,
}: {
	tone?: keyof typeof NOTICE;
	title: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
	action?: React.ReactNode;
	icon?: React.ReactNode;
}) {
	const { icon: Icon, box, title: titleTone, icn } = NOTICE[tone];
	return (
		<div role={tone === "error" ? "alert" : undefined} className={cn("flex gap-3 rounded-card px-4 py-3.5", box, className)}>
			{icon ?? <Icon className={cn("mt-px size-4 shrink-0", icn)} aria-hidden />}
			<div className="min-w-0 flex-1">
				<p className={cn("text-[13px] leading-5", titleTone)}>{title}</p>
				{children && <div className="mt-1 text-xs leading-[1.5] text-muted">{children}</div>}
				{action && <div className="mt-3">{action}</div>}
			</div>
		</div>
	);
}

/** Status chip tones (Figma: radius 90, 12px text, 5px dot). */
const CHIP = {
	neutral: { box: "bg-field text-ink", dot: "bg-ink" },
	pending: { box: "bg-accent-soft text-accent-deep", dot: "bg-accent-deep" },
	success: { box: "bg-brand-soft text-brand-dark", dot: "bg-brand" },
	warning: { box: "bg-pollen-soft text-pollen-deep", dot: "bg-pollen-deep" },
	review: { box: "bg-review-soft text-review", dot: "bg-review" },
	danger: { box: "bg-danger-bg text-danger", dot: "bg-danger" },
	dark: { box: "bg-ink text-white", dot: "bg-white" },
} as const;

export type ChipTone = keyof typeof CHIP;

/** Small rounded status label with a dot. `live` pulses the dot (only while waiting on the network). */
export function Chip({ tone = "neutral", live, dot = true, className, children }: { tone?: ChipTone; live?: boolean; dot?: boolean; className?: string; children: React.ReactNode }) {
	const t = CHIP[tone];
	return (
		<span className={cn("inline-flex h-[21px] shrink-0 items-center gap-[5px] rounded-full px-[11px] text-xs whitespace-nowrap", t.box, className)}>
			{dot && <span className={cn("size-[5px] rounded-full", t.dot, live && "animate-signal")} aria-hidden />}
			{children}
		</span>
	);
}

/** "Label ... value" row (Review allocation). */
export function DetailRow({ label, value, className }: { label: React.ReactNode; value: React.ReactNode; className?: string }) {
	return (
		<div className={cn("flex items-baseline justify-between gap-4 text-xs", className)}>
			<dt className="text-ink">{label}</dt>
			<dd className="min-w-0 text-right break-words text-ink tabular-nums">{value}</dd>
		</div>
	);
}

const BAR_TONES = {
	review: "bg-review",
	accent: "bg-accent",
	pollen: "bg-pollen",
	ink: "bg-ink",
	brand: "bg-brand",
} as const;

export type BarTone = keyof typeof BAR_TONES;

/** The stat cards' decorative mini bar chart; bars grow from the baseline on first view. */
export function MiniBars({ tone = "review", className }: { tone?: BarTone; className?: string }) {
	const heights = [45, 75, 55, 95, 65, 100, 80];
	return (
		<span aria-hidden className={cn("animate-bars flex h-7 items-end gap-[3px]", className)}>
			{heights.map((h, i) => (
				<span key={i} className={cn("w-[3px] rounded-full", BAR_TONES[tone])} style={{ height: `${h}%`, ["--i" as string]: i }} />
			))}
		</span>
	);
}

/** Stat card (Figma: "Total funds raised / $143,829,672 / Across all public campaigns" + mini bars). */
export function StatCard({
	label,
	value,
	caption,
	tone = "review",
	className,
	style,
}: {
	label: React.ReactNode;
	value: React.ReactNode;
	caption?: React.ReactNode;
	tone?: BarTone;
	className?: string;
	style?: React.CSSProperties;
}) {
	return (
		<div className={cn("flex min-h-[104px] min-w-0 flex-col justify-between rounded-card bg-white p-3.5 sm:min-h-[118px] sm:p-5", className)} style={style}>
			<p className="text-xs text-ink">{label}</p>
			<div className="mt-2 flex items-end justify-between gap-3">
				<p className="stat-value min-w-0 truncate">{value}</p>
				<MiniBars tone={tone} className="mb-0.5 hidden shrink-0 min-[420px]:flex" />
			</div>
			{caption && <p className="caption mt-2 truncate">{caption}</p>}
		</div>
	);
}

/** Funding progress bar (Figma: #6A4CC7 on #EAEAEA, 6px). Fills on first view. */
export function ProgressBar({ value, tone = "review", className, label }: { value: number; tone?: BarTone; className?: string; label?: string }) {
	const pct = Math.max(0, Math.min(100, value));
	return (
		<div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className={cn("h-1.5 overflow-hidden rounded-full bg-line", className)}>
			<div className={cn("animate-fill h-full rounded-full", BAR_TONES[tone])} style={{ width: `${pct}%` }} />
		</div>
	);
}
