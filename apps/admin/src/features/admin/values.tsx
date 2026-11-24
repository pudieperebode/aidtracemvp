import { Chip, type ChipTone } from "@repo/ui/surface";
import { decimalToStroops, shortKey } from "@repo/stellar/format";
import { usdc, utcDateTime } from "@/lib/format";
import { HashLink } from "@/components/ExplorerButton";
import type { AdminRecord } from "@/lib/api/dto";

/**
 * Reading PROVISIONAL admin records: `pick` tries each key in turn (dotted paths allowed), so a field the backend names
 * differently still shows. `Value` formats by key: amounts as USDC, `…At` / timestamps as UTC, hashes as explorer
 * links, wallets in mono, statuses as chips.
 */
export function pick(row: AdminRecord | undefined, ...keys: string[]): unknown {
	for (const key of keys) {
		let v: unknown = row;
		for (const part of key.split(".")) v = v && typeof v === "object" ? (v as AdminRecord)[part] : undefined;
		if (v !== undefined && v !== null && v !== "") return v;
	}
	return undefined;
}

export const text = (row: AdminRecord | undefined, ...keys: string[]) => {
	const v = pick(row, ...keys);
	return v === undefined ? undefined : String(v);
};

const AMOUNT = /amount|balance|raised|allocated|disbursed|recovered|available|target/i;
const DATE = /(At|_at|timestamp|date)$/i;
const HASH = /hash$/i;
const WALLET = /wallet|address|^actor$/i;
const DECIMAL = /^-?\d+(\.\d+)?$/;

export function Value({ name, value }: { name: string; value: unknown }) {
	if (value === null || value === undefined || value === "") return <span className="text-muted">—</span>;
	const leaf = name.split(".").pop()!;
	if (typeof value === "boolean")
		return (
			<Chip tone={value ? "success" : "neutral"} dot={false}>
				{value ? "Yes" : "No"}
			</Chip>
		);
	if (typeof value === "string") {
		if (AMOUNT.test(leaf) && DECIMAL.test(value) && !/xlm/i.test(leaf))
			return <span className="tabular-nums">{usdc(decimalToStroops(value))}</span>;
		if (/xlm/i.test(leaf) && DECIMAL.test(value))
			return <span className="tabular-nums">{Number(value).toLocaleString("en-US")} XLM</span>;
		if (DATE.test(leaf) && !Number.isNaN(Date.parse(value))) return <span className="tabular-nums">{utcDateTime(value)}</span>;
		if (HASH.test(leaf) && /^[0-9a-f]{16,}$/i.test(value)) return <HashLink hash={value} />;
		if (WALLET.test(leaf) && /^G[A-Z2-7]{55}$/.test(value))
			return (
				<span className="font-mono text-[11px]" title={value}>
					{shortKey(value, 6, 6)}
				</span>
			);
		if (/status$|^kind$|^type$|severity/i.test(leaf)) return <StatusChip status={value} />;
		return <span className="break-words">{value}</span>;
	}
	if (typeof value === "number") return <span className="tabular-nums">{value.toLocaleString("en-US")}</span>;
	if (Array.isArray(value))
		return value.length ? (
			<span className="break-words">{value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ")}</span>
		) : (
			<span className="text-muted">None</span>
		);
	return <span className="font-mono text-[11px] break-all">{JSON.stringify(value)}</span>;
}

const TONES: Record<string, ChipTone> = {
	active: "success",
	confirmed: "success",
	claimed: "success",
	resolved: "success",
	approved: "success",
	ok: "success",
	up: "success",
	running: "success",
	pending: "pending",
	registered: "pending",
	prepared: "neutral",
	processing: "warning",
	under_review: "review",
	allocated: "neutral",
	ready: "review",
	open: "warning",
	draft: "neutral",
	closed: "neutral",
	failed: "danger",
	expired: "neutral",
	rejected: "warning",
	cancelled: "neutral",
	suspended: "danger",
	down: "danger",
	error: "danger",
	degraded: "warning",
	unexpected_claim: "danger",
	critical: "danger",
};

/** Any backend status, kind or issue type as a chip ("lock_allocations" → "Lock allocations"). */
export function StatusChip({ status }: { status: string }) {
	const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
	return (
		<Chip tone={TONES[status] ?? "neutral"} live={status === "pending" || status === "processing"}>
			{label}
		</Chip>
	);
}

/** "beneficiariesApproved" → "Beneficiaries approved". */
export const humanize = (key: string) =>
	key
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/[_.]/g, " ")
		.toLowerCase()
		.replace(/^./, (c) => c.toUpperCase());
