"use client";

import { cn } from "@repo/ui/lib/utils";
import { ErrorState, TableSkeleton } from "@/components/states";

export interface Column<T> {
	key: string;
	header: React.ReactNode;
	cell: (row: T) => React.ReactNode;
	/** Width / alignment classes for the desktop cell. */
	className?: string;
	/** Hide from the stacked mobile card (e.g. checkboxes rendered elsewhere). */
	mobile?: "hide" | "title" | "label";
}

/**
 * The design's table card (Figma: white card, #EAEAEA header bar radius 6, 12px rows split by 1px lines). From `md`
 * up it's a table; below, each row becomes a stacked card with label / value pairs, the `title` column on top.
 * Handles loading (skeleton rows), error (retry) and empty states in place.
 */
export function DataTable<T>({
	columns,
	rows,
	rowKey,
	isLoading,
	error,
	onRetry,
	empty,
	rowClassName,
	caption,
	className,
}: {
	columns: Column<T>[];
	rows: T[] | undefined;
	rowKey: (row: T) => string;
	isLoading?: boolean;
	error?: unknown;
	onRetry?: () => void;
	empty?: React.ReactNode;
	rowClassName?: (row: T) => string | undefined;
	caption?: string;
	className?: string;
}) {
	return (
		<div className={cn("min-w-0 rounded-card bg-white p-1", className)}>
			{error ? (
				<ErrorState error={error} onRetry={onRetry} />
			) : isLoading && !rows ? (
				<div className="p-1">
					<TableSkeleton columns={Math.min(columns.length, 6)} />
				</div>
			) : !rows?.length ? (
				empty
			) : (
				<>
					<div className={cn("hidden overflow-x-auto md:block", isLoading && "opacity-60 transition-opacity")}>
						<table className="w-full border-separate border-spacing-0 text-left text-xs">
							{caption && <caption className="sr-only">{caption}</caption>}
							<thead>
								<tr>
									{columns.map((col, i) => (
										<th
											key={col.key}
											scope="col"
											className={cn(
												"h-[35px] bg-line px-3 font-normal whitespace-nowrap text-ink",
												i === 0 && "rounded-l-[6px]",
												i === columns.length - 1 && "rounded-r-[6px]",
												col.className,
											)}
										>
											{col.header}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{rows.map((row, r) => (
									<tr
										key={rowKey(row)}
										className={cn("group transition-colors hover:bg-page/70", rowClassName?.(row))}
										style={{ ["--i" as string]: r }}
									>
										{columns.map((col) => (
											<td
												key={col.key}
												className={cn("h-[50px] border-b border-line px-3 align-middle group-last:border-0", col.className)}
											>
												{col.cell(row)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<ul className={cn("flex flex-col gap-1 md:hidden", isLoading && "opacity-60")}>
						{rows.map((row) => {
							const title = columns.find((c) => c.mobile === "title");
							return (
								<li key={rowKey(row)} className={cn("rounded-control border border-line p-3", rowClassName?.(row))}>
									{title && <div className="mb-2 text-[13px]">{title.cell(row)}</div>}
									<dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
										{columns
											.filter((c) => c.mobile !== "hide" && c.mobile !== "title")
											.map((col) =>
												col.mobile === "label" ? (
													<div key={col.key} className="col-span-2 pt-1">
														{col.cell(row)}
													</div>
												) : (
													<div key={col.key} className="contents">
														<dt className="text-muted">{col.header}</dt>
														<dd className="min-w-0 justify-self-end text-right break-words">{col.cell(row)}</dd>
													</div>
												),
											)}
									</dl>
								</li>
							);
						})}
					</ul>
				</>
			)}
		</div>
	);
}

/** "Showing 1–8 of 128 results" + Previous / numbered pages / › (Figma pagination). */
export function Pagination({
	total,
	limit,
	offset,
	onPage,
}: {
	total: number;
	limit: number;
	offset: number;
	onPage: (offset: number) => void;
}) {
	if (total === 0) return null;
	const pages = Math.max(1, Math.ceil(total / limit));
	const current = Math.floor(offset / limit) + 1;
	const from = Math.min(total, offset + 1);
	const to = Math.min(total, offset + limit);
	const windowStart = Math.max(1, Math.min(current - 1, pages - 2));
	const visible = Array.from({ length: Math.min(3, pages) }, (_, i) => windowStart + i);
	const btn =
		"flex h-[34px] min-w-[30px] cursor-pointer items-center justify-center rounded-control bg-white px-3 text-xs transition-colors hover:bg-field disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white";

	return (
		<nav aria-label="Pagination" className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
			<p className="text-xs">
				Showing {from}–{to} of {total.toLocaleString("en-US")} results
			</p>
			<div className="flex items-center gap-2">
				<button type="button" className={btn} disabled={current === 1} onClick={() => onPage(offset - limit)}>
					Previous
				</button>
				{visible.map((p) => (
					<button
						key={p}
						type="button"
						aria-current={p === current ? "page" : undefined}
						className={cn(btn, p === current && "bg-ink text-white hover:bg-ink")}
						onClick={() => onPage((p - 1) * limit)}
					>
						{p}
					</button>
				))}
				<button
					type="button"
					className={btn}
					disabled={current === pages}
					onClick={() => onPage(offset + limit)}
					aria-label="Next page"
				>
					›
				</button>
			</div>
		</nav>
	);
}

/** The design's filter boxes ("Type: All", "Status: All", "This month"): a native select styled as a white field. */
export function FilterSelect({
	value,
	onChange,
	options,
	label,
	className,
}: {
	value: string;
	onChange: (value: string) => void;
	options: readonly { value: string; label: string }[];
	label: string;
	className?: string;
}) {
	return (
		<label className={cn("relative flex h-10 min-w-0 items-center", className)}>
			<span className="sr-only">{label}</span>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="h-full w-full min-w-0 cursor-pointer appearance-none rounded-control border border-line bg-white pr-8 pl-3 text-xs text-ink outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15"
			>
				{options.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
			<svg viewBox="0 0 16 16" className="pointer-events-none absolute right-3 size-3 text-ink" fill="none" aria-hidden>
				<path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</label>
	);
}
