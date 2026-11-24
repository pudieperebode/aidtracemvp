import { assetCode } from "@repo/stellar/assets";
import { formatAmount } from "@repo/stellar/format";

/**
 * Display formatting. Amounts are stroop strings (7 decimals); never converted through floating point. USDC is shown
 * the way the design does: "$72,000" for headline stats, "250.00" in tables, "500.00 USDC" in summaries.
 * Dates are UTC ("24 Aug 2026, 14:32"); timestamps from the model are unix seconds.
 */

const SCALE = 10_000_000n;

/** "1,000 USDC". */
export const money = (stroops: string | bigint, asset = "USDC", decimals = 2) =>
	`${formatAmount(stroops, decimals)} ${assetCode(asset)}`;

/** Always two decimals, grouped: "72,000.00", "-250.00". */
export function fixed2(stroops: string | bigint) {
	const value = BigInt(stroops);
	const sign = value < 0n ? "-" : "";
	const abs = value < 0n ? -value : value;
	const cents = (abs * 100n + SCALE / 2n) / SCALE;
	return `${sign}${(cents / 100n).toLocaleString("en-US")}.${(cents % 100n).toString().padStart(2, "0")}`;
}

/** "$72,000" (whole) or "$72,000.50"; `cents` forces two decimals ("$72,000.00"). */
export function usd(stroops: string | bigint, { cents = false }: { cents?: boolean } = {}) {
	const value = BigInt(stroops);
	const sign = value < 0n ? "-" : "";
	const abs = value < 0n ? -value : value;
	return `${sign}$${cents || abs % SCALE !== 0n ? fixed2(abs) : formatAmount(abs, 0)}`;
}

/** "500.00 USDC" */
export const usdc = (stroops: string | bigint) => `${fixed2(stroops)} USDC`;

/** Whole-number percentage of `part` in `whole`, one decimal when under 10 ("23.5%"). */
export function percent(part: string | bigint | number, whole: string | bigint | number) {
	const w = BigInt(whole);
	if (w <= 0n) return "0%";
	const bp = Number((BigInt(part) * 10_000n) / w) / 100;
	return `${bp < 10 && bp % 1 ? bp.toFixed(1) : Math.round(bp)}%`;
}

type DateInput = string | number | Date;
/** Numbers below 10^11 are unix seconds (the UI model); larger ones are milliseconds. */
export const toDate = (value: DateInput) =>
	value instanceof Date ? value : typeof value === "number" && value < 1e11 ? new Date(value * 1000) : new Date(value);

const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
/** Some engines write "Sept"; the design uses three-letter months ("24 Aug"). */
const day = { format: (d: Date) => dayFormat.format(d).replace("Sept", "Sep") };
const dayMonthFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
const dayMonth = { format: (d: Date) => dayMonthFormat.format(d).replace("Sept", "Sep") };
const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" });

/** "24 Aug 2026" */
export const utcDate = (value: DateInput) => day.format(toDate(value));
/** "24 Aug" */
export const utcDayMonth = (value: DateInput) => dayMonth.format(toDate(value));
/** "14:32" */
export const utcTime = (value: DateInput) => time.format(toDate(value));
/** "24 Aug 2026, 14:32" (tables) */
export const utcDateTime = (value: DateInput) => `${utcDate(value)}, ${utcTime(value)}`;
/** ISO, for CSV exports. */
export const isoDateTime = (value: DateInput) => toDate(value).toISOString();
/** "YYYY-MM-DD" for date inputs. */
export const isoDay = (value: DateInput) => toDate(value).toISOString().slice(0, 10);

/** "in 2 days", "3 hours ago". Both arguments in milliseconds. */
export function relative(target: number, now: number) {
	const diff = target - now;
	const abs = Math.abs(diff);
	const units: [number, string][] = [
		[86_400_000, "day"],
		[3_600_000, "hour"],
		[60_000, "minute"],
	];
	for (const [size, unit] of units) {
		if (abs >= size) {
			const n = Math.round(abs / size);
			const label = `${n} ${unit}${n === 1 ? "" : "s"}`;
			return diff > 0 ? `in ${label}` : `${label} ago`;
		}
	}
	return diff > 0 ? "in under a minute" : "just now";
}

/** "GDQP…4201" for addresses and "0x7f8a3d…b24e" style for hashes. */
export const shortHash = (hash: string, head = 8, tail = 4) =>
	hash.length > head + tail + 1 ? `${hash.slice(0, head)}…${hash.slice(-tail)}` : hash;

/** "1.2 MB" */
export function fileSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
