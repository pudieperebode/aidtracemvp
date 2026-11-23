import { fromStroops } from "@repo/stellar/format";
import type { CampaignTotals, LedgerEntry, ReconciliationRow } from "@repo/stellar/campaign";
import { explorer } from "@/lib/stellar/config";
import { isoDateTime } from "@/lib/format";

/**
 * CSV exports (PRD §7 "Downloadable financial reports"). Built only from public-safe types: campaign totals, ledger
 * entries and reconciliation rows keyed by beneficiary *reference*. Never pass a `BeneficiaryRecord` in here.
 */

/** RFC 4180 quoting, plus a guard against spreadsheet formula injection. */
function cell(value: string | number | boolean | null | undefined) {
	let text = value == null ? "" : String(value);
	if (/^[=+\-@\t\r]/.test(text) && !/^-?\d/.test(text)) text = `'${text}`;
	return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const rows = (lines: (string | number | boolean | null | undefined)[][]) => lines.map((line) => line.map(cell).join(",")).join("\r\n");

export function campaignReportCsv(reference: string, totals: CampaignTotals, ledger: LedgerEntry[], reconciliation: ReconciliationRow[]) {
	const summary = rows([
		["Campaign", reference],
		["Funding target (USDC)", fromStroops(totals.target)],
		["Total inflows (USDC)", fromStroops(totals.raised)],
		["Total allocated (USDC)", fromStroops(totals.allocated)],
		["Total outflows (USDC)", fromStroops(totals.disbursed)],
		["Available balance (USDC)", fromStroops(totals.available)],
		["Beneficiaries approved", totals.beneficiaries_approved],
		["Beneficiaries paid", totals.beneficiaries_paid],
	]);
	const transactions = rows([
		["Timestamp (UTC)", "Type", "Amount (USDC)", "Status", "Reference", "Transaction hash", "Explorer"],
		...ledger.map((e) => [isoDateTime(e.timestamp), e.type, fromStroops(e.amount), e.status, e.counterparty_ref, e.tx_hash, explorer.tx(e.tx_hash)]),
	]);
	const payouts = rows([
		["Beneficiary reference", "Allocated (USDC)", "Paid (USDC)", "Transaction hash", "Matched"],
		...reconciliation.map((r) => [r.beneficiary_reference, fromStroops(r.allocated), fromStroops(r.paid), r.tx_hash, r.matched]),
	]);
	return [summary, "", transactions, "", payouts].join("\r\n");
}

/** Triggers a browser download of `csv` as `filename`. */
export function downloadCsv(filename: string, csv: string) {
	const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
	const a = Object.assign(document.createElement("a"), { href: url, download: filename });
	a.click();
	URL.revokeObjectURL(url);
}
