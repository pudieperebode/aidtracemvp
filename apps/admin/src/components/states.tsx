"use client";

import { Inbox, RotateCcw, SearchX, WifiOff } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage, httpStatus } from "@/lib/api/errors";

/**
 * Empty state (Figma "Empty states · Desktop & mobile"): a small icon tile, a title, one line of guidance and an
 * optional action, centred in the card that would hold the data.
 */
export function EmptyState({
	title,
	children,
	action,
	icon = "inbox",
	className,
}: {
	title: string;
	children?: React.ReactNode;
	action?: React.ReactNode;
	icon?: "inbox" | "search";
	className?: string;
}) {
	const Icon = icon === "search" ? SearchX : Inbox;
	return (
		<div className={cn("animate-pop flex flex-col items-center justify-center px-4 py-12 text-center sm:py-16", className)}>
			<span className="flex size-10 items-center justify-center rounded-card bg-field text-ink">
				<Icon className="size-[18px]" aria-hidden />
			</span>
			<p className="mt-4 text-sm">{title}</p>
			{children && <p className="caption mt-1.5 max-w-[360px]">{children}</p>}
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}

/** A load failed (Figma "Error states"): what happened in plain words, that funds are safe, and a retry. */
export function ErrorState({
	error,
	onRetry,
	title,
	className,
}: {
	error: unknown;
	onRetry?: () => void;
	title?: string;
	className?: string;
}) {
	const offline = errorMessage(error).includes("couldn't reach");
	const notFound = httpStatus(error) === 404;
	const Icon = offline ? WifiOff : notFound ? SearchX : RotateCcw;
	return (
		<div
			role="alert"
			className={cn("animate-pop flex flex-col items-center justify-center px-4 py-12 text-center sm:py-16", className)}
		>
			<span className="flex size-10 items-center justify-center rounded-card bg-accent-soft text-accent-deep">
				<Icon className="size-[18px]" aria-hidden />
			</span>
			<p className="mt-4 text-sm">{title ?? (notFound ? "Not found" : "We couldn't load this")}</p>
			<p className="caption mt-1.5 max-w-[380px]">
				{errorMessage(error, "Something went wrong while loading. Campaign funds are unaffected.")}
			</p>
			{onRetry && !notFound && (
				<Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
					<RotateCcw /> Try again
				</Button>
			)}
		</div>
	);
}

/** Skeleton for a row of stat cards (Figma "Loading states"). */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4" aria-busy aria-label="Loading">
			{Array.from({ length: count }, (_, i) => (
				<div key={i} className="flex min-h-[118px] flex-col justify-between rounded-card bg-white p-5">
					<Skeleton className="h-3 w-24" />
					<Skeleton className="h-7 w-36" />
					<Skeleton className="h-3 w-28" />
				</div>
			))}
		</div>
	);
}

/** Skeleton rows for a table card. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
	return (
		<div aria-busy aria-label="Loading" className="flex flex-col">
			<Skeleton className="h-[35px] w-full rounded-control" />
			{Array.from({ length: rows }, (_, r) => (
				<div key={r} className="flex items-center gap-6 border-b border-line px-3 py-4 last:border-0">
					{Array.from({ length: columns }, (_, c) => (
						<Skeleton key={c} className={cn("h-3", c === 0 ? "w-20" : c % 2 ? "w-28" : "w-16", c > 2 && "hidden md:block")} />
					))}
				</div>
			))}
		</div>
	);
}

/** Skeleton for a generic card. */
export function CardSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
	return (
		<div className={cn("flex flex-col gap-3 rounded-card bg-white p-5", className)} aria-busy aria-label="Loading">
			<Skeleton className="h-4 w-40" />
			{Array.from({ length: lines }, (_, i) => (
				<Skeleton key={i} className={cn("h-3", i % 2 ? "w-3/4" : "w-full")} />
			))}
		</div>
	);
}
