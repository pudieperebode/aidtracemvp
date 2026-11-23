"use client";

import { useId, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { fileSize } from "@/lib/format";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const MAX = 10 * 1024 * 1024;

/**
 * "Upload supporting evidence · PDF, JPG or PNG · up to 10 MB" (Figma grey drop area). Click or drop; files are kept
 * in the form and uploaded to protected storage with the record, never published.
 */
export function EvidenceDropzone({ files, onChange, error }: { files: File[]; onChange: (files: File[]) => void; error?: string }) {
	const id = useId();
	const [dragging, setDragging] = useState(false);
	const [rejected, setRejected] = useState<string | null>(null);

	const add = (list: FileList | null) => {
		if (!list) return;
		const incoming = Array.from(list);
		const ok = incoming.filter((f) => f.size <= MAX && /pdf|jpe?g|png/i.test(f.type || f.name));
		setRejected(ok.length < incoming.length ? "Some files were skipped: use PDF, JPG or PNG up to 10 MB." : null);
		onChange([...files, ...ok].slice(0, 5));
	};

	return (
		<div className="min-w-0">
			<label
				htmlFor={id}
				onDragOver={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(e) => {
					e.preventDefault();
					setDragging(false);
					add(e.dataTransfer.files);
				}}
				className={cn(
					"flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[6px] border border-dashed px-4 py-4 text-center transition-colors",
					dragging ? "border-brand bg-brand-soft" : error ? "border-danger bg-danger-bg" : "border-transparent bg-line hover:bg-line-strong",
				)}
			>
				<Upload className={cn("size-5 transition-transform", dragging && "-translate-y-0.5")} strokeWidth={1.5} aria-hidden />
				<span className="text-xs">Upload supporting evidence</span>
				<span className="caption">PDF, JPG or PNG · up to 10 MB</span>
				<input
					id={id}
					type="file"
					multiple
					accept={ACCEPT}
					className="sr-only"
					onChange={(e) => {
						add(e.target.files);
						e.target.value = "";
					}}
				/>
			</label>
			{(error || rejected) && (
				<p role="alert" className="mt-2 text-xs text-danger">
					{error ?? rejected}
				</p>
			)}
			{files.length > 0 && (
				<ul className="mt-2 flex flex-col gap-1.5">
					{files.map((f, i) => (
						<li key={`${f.name}-${i}`} className="animate-pop flex items-center gap-2 rounded-control border border-line px-2.5 py-1.5 text-xs">
							<FileText className="size-3.5 shrink-0 text-muted" aria-hidden />
							<span className="min-w-0 flex-1 truncate">{f.name}</span>
							<span className="caption">{fileSize(f.size)}</span>
							<button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} className="cursor-pointer text-muted hover:text-ink" aria-label={`Remove ${f.name}`}>
								<X className="size-3.5" />
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
