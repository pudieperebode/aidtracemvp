import * as React from "react";
import { cn } from "./lib/utils";

/** Label + control + hint/error, the form row on every screen (Figma: 12px label, 40px control). */
export function Field({
	label,
	htmlFor,
	hint,
	error,
	className,
	children,
}: {
	label: React.ReactNode;
	htmlFor?: string;
	hint?: React.ReactNode;
	error?: React.ReactNode;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className={cn("flex min-w-0 flex-col gap-2", className)}>
			<label htmlFor={htmlFor} className="text-xs text-ink">
				{label}
			</label>
			{children}
			{error ? (
				<p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="animate-rise text-xs text-danger">
					{error}
				</p>
			) : (
				hint && <p className="caption">{hint}</p>
			)}
		</div>
	);
}

const control =
	"w-full min-w-0 rounded-control border bg-white px-3 text-[13px] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-subtle focus:border-brand focus:ring-[3px] focus:ring-brand/15 disabled:bg-page disabled:text-muted";

/** Text input (Figma "Surface" 40px, 1px #EAEAEA stroke, radius 5). */
export function Input({ className, invalid, ...props }: React.ComponentProps<"input"> & { invalid?: boolean }) {
	return (
		<input
			aria-invalid={invalid || undefined}
			aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
			className={cn(control, "h-10", invalid ? "border-danger" : "border-line", className)}
			{...props}
		/>
	);
}

export function Textarea({ className, invalid, ...props }: React.ComponentProps<"textarea"> & { invalid?: boolean }) {
	return (
		<textarea
			aria-invalid={invalid || undefined}
			aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
			className={cn(control, "min-h-[84px] resize-y py-2.5", invalid ? "border-danger" : "border-line", className)}
			{...props}
		/>
	);
}

/** Input with a trailing unit or icon ("USDC"). */
export function AffixInput({ className, trailing, invalid, ...props }: React.ComponentProps<"input"> & { trailing?: React.ReactNode; invalid?: boolean }) {
	return (
		<div
			className={cn(
				"flex h-10 items-center gap-2 rounded-control border bg-white px-3 transition-[border-color,box-shadow] focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/15",
				invalid ? "border-danger" : "border-line",
				props.disabled && "bg-page",
				className,
			)}
		>
			<input
				aria-invalid={invalid || undefined}
				aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
				className="h-full w-full min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-subtle disabled:text-muted"
				{...props}
			/>
			{trailing && <span className="caption shrink-0">{trailing}</span>}
		</div>
	);
}

/** Search box with a magnifier (header and ledger filters; Figma fill #F3F3F3 in the header). */
export function SearchInput({ className, tone = "white", ...props }: React.ComponentProps<"input"> & { tone?: "white" | "field" }) {
	return (
		<div
			className={cn(
				"flex h-10 min-w-0 items-center gap-2 rounded-control px-3 transition-[box-shadow,border-color] focus-within:ring-[3px] focus-within:ring-brand/15",
				tone === "field" ? "bg-field" : "border border-line bg-white focus-within:border-brand",
				className,
			)}
		>
			<svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-ink" fill="none" aria-hidden>
				<circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.5" />
				<path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
			</svg>
			<input type="search" className="h-full w-full min-w-0 bg-transparent text-xs text-ink outline-none placeholder:text-ink/70" {...props} />
		</div>
	);
}
