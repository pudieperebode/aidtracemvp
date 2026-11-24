"use client";

import { useDeferredValue, useState } from "react";
import { X } from "lucide-react";
import { SearchInput } from "@repo/ui/field";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@repo/ui/sheet";
import type { AdminRecord } from "@/lib/api/dto";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, FilterSelect, Pagination, type Column } from "@/components/DataTable";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/states";
import { useAdminDoc, useAdminList } from "@/features/admin/hooks";
import { RecordView } from "@/features/admin/components/RecordView";

const PAGE = 20;

export interface ListFilter {
	/** Query parameter (`status`, `kind`, `campaign`). */
	param: string;
	label: string;
	options: { value: string; label: string }[];
}

export interface DetailSpec {
	title: string;
	/** Fetch the full record from this admin path (`/users/{id}`); otherwise the list row is shown. */
	path?: string;
	/** Actions for the open record (suspend, recheck, resolve …). */
	actions?: (record: AdminRecord) => React.ReactNode;
}

/**
 * One admin list (backend guide §14): filters and search as the backend's query parameters, 20 rows per page, every
 * state (loading, empty, error) handled, and a side sheet that shows the selected record in full.
 */
export function ResourceScreen({
	title,
	subtitle,
	resource,
	columns,
	filters = [],
	search,
	rowKey = (r) => String(r.id ?? r.reference),
	detail,
	before,
	action,
	empty,
}: {
	title: string;
	subtitle: string;
	resource: string;
	columns: Column<AdminRecord>[];
	filters?: ListFilter[];
	search?: { param: string; placeholder: string; label: string };
	rowKey?: (row: AdminRecord) => string;
	detail?: (row: AdminRecord) => DetailSpec;
	before?: React.ReactNode;
	action?: React.ReactNode;
	empty?: { title: string; body: string };
}) {
	const [values, setValues] = useState<Record<string, string>>({});
	const [query, setQuery] = useState("");
	const deferred = useDeferredValue(query.trim());
	const [offset, setOffset] = useState(0);
	const [open, setOpen] = useState<AdminRecord | null>(null);
	const params = { ...values, ...(search && deferred ? { [search.param]: deferred } : {}), limit: PAGE, offset };
	const list = useAdminList(resource, params);
	const filtered = Object.values(values).some(Boolean) || !!deferred;

	const withOpen: Column<AdminRecord>[] = detail
		? [
				...columns,
				{
					key: "open",
					header: <span className="sr-only">Details</span>,
					mobile: "label",
					className: "w-[80px]",
					cell: (row) => (
						<button
							type="button"
							className="cursor-pointer text-ink underline-offset-2 hover:underline"
							onClick={() => setOpen(row)}
						>
							Details
						</button>
					),
				},
			]
		: columns;

	return (
		<>
			<PageHeader title={title} subtitle={subtitle} action={action} />
			{before}
			{(filters.length > 0 || search) && (
				<div role="search" className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
					{search && (
						<SearchInput
							aria-label={search.label}
							placeholder={search.placeholder}
							value={query}
							onChange={(e) => {
								setQuery(e.target.value);
								setOffset(0);
							}}
							className="sm:w-[300px]"
						/>
					)}
					{filters.map((f) => (
						<FilterSelect
							key={f.param}
							label={f.label}
							value={values[f.param] ?? ""}
							onChange={(v) => {
								setValues((s) => ({ ...s, [f.param]: v }));
								setOffset(0);
							}}
							options={f.options}
							className="sm:w-[200px]"
						/>
					))}
				</div>
			)}
			<DataTable
				caption={title}
				columns={withOpen}
				rows={list.data?.results}
				rowKey={rowKey}
				isLoading={list.isFetching}
				error={list.error}
				onRetry={() => list.refetch()}
				empty={
					<EmptyState
						title={filtered ? "Nothing matches" : (empty?.title ?? "Nothing here yet")}
						icon={filtered ? "search" : "inbox"}
					>
						{filtered
							? "Try other filters or clear the search."
							: (empty?.body ?? "Records appear here as the platform is used.")}
					</EmptyState>
				}
			/>
			{list.data && <Pagination total={list.data.total} limit={PAGE} offset={offset} onPage={setOffset} />}
			<RecordSheet spec={open && detail ? detail(open) : null} row={open} onClose={() => setOpen(null)} />
		</>
	);
}

function RecordSheet({ spec, row, onClose }: { spec: DetailSpec | null; row: AdminRecord | null; onClose: () => void }) {
	const doc = useAdminDoc(spec?.path ?? null);
	const record = spec?.path ? doc.data : (row ?? undefined);
	return (
		<Sheet open={!!spec} onOpenChange={(next) => !next && onClose()}>
			<SheetContent side="right" className="w-full sm:max-w-[480px]">
				<div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
					<SheetTitle className="text-base font-normal">{spec?.title}</SheetTitle>
					<SheetClose
						className="flex size-8 cursor-pointer items-center justify-center rounded-control hover:bg-field"
						aria-label="Close"
					>
						<X className="size-4" />
					</SheetClose>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto p-5">
					{spec?.path && doc.isPending ? (
						<CardSkeleton lines={8} />
					) : spec?.path && doc.error ? (
						<ErrorState error={doc.error} onRetry={() => doc.refetch()} />
					) : record ? (
						<>
							{spec?.actions && <div className="mb-5 flex flex-wrap gap-2">{spec.actions(record)}</div>}
							<RecordView record={record} />
						</>
					) : null}
				</div>
			</SheetContent>
		</Sheet>
	);
}
