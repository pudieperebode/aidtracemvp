"use client";

import {
	allocationReference,
	campaignTotals,
	DEMO_ADMIN_WALLET,
	LIVE_ALLOCATION,
	mockTxHash,
	platformStats,
	type AllocationRow,
	type BeneficiaryRow,
	type CampaignRow,
	type LedgerRow,
	type MockDb,
	type OrgRow,
} from "@repo/mock/seed";
import { explorer, NETWORK_PASSPHRASE } from "@repo/stellar/network";
import { fromStroops, toStroops } from "@repo/stellar/format";
import { StrKey } from "@stellar/stellar-sdk";
import type {
	AllocationDto,
	BeneficiaryDetailDto,
	BeneficiaryDto,
	CampaignDto,
	ChainActionDto,
	LedgerEntryDto,
	MeDto,
	NotificationDto,
	OrganizationDto,
	PublicStatsDto,
	ReconciliationDto,
	WalletDto,
} from "@/lib/api/dto";
import { consume, useMockControls } from "./controls";
import { getDb, nextId, saveDb } from "./store";

/**
 * The mock AidTrace backend: the routes, envelopes and rules of the real API (`/docs` on the API host), answered from
 * the in-browser database. Admin-only routes, approval before allocation, the per-beneficiary maximum, available
 * funds, lock before payout, no duplicate payouts, and failed transactions that move nothing. Money actions are
 * prepared here, "signed" by the demo wallet, submitted back here, stay `pending` for about one ledger close, then
 * settle as `confirmed` or `failed` (Demo panel → fail the next transaction).
 */

export interface MockRequest {
	method: string;
	path: string;
	params: Record<string, unknown>;
	body: unknown;
	token: string | null;
	headers: Record<string, string>;
}

export interface MockResponse {
	status: number;
	body: unknown;
	headers?: Record<string, string>;
}

class HttpError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
		public fields?: { field: string; message: string }[],
	) {
		super(message);
	}
}

const ok = (data: unknown, status = 200, message = "OK"): MockResponse => ({
	status,
	body: { statusCode: status, message, data },
});
const dec = (stroops: string | bigint) => fromStroops(stroops);
const now = () => new Date().toISOString();
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const includes = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle.toLowerCase());

/** Collects field errors and throws one `VALIDATION_FAILED`, like the backend. */
function validate(checks: [boolean, string, string][]) {
	const fields = checks.filter(([bad]) => bad).map(([, field, message]) => ({ field, message }));
	if (fields.length)
		throw new HttpError(
			400,
			"VALIDATION_FAILED",
			fields.length === 1 ? fields[0]!.message : `Please fix the ${fields.length} highlighted fields`,
			fields,
		);
}

const isAddress = (v: unknown) => typeof v === "string" && StrKey.isValidEd25519PublicKey(v.trim());
const isEmail = (v: unknown) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const len = (v: unknown) => (typeof v === "string" ? v.trim().length : 0);

function parseAmount(value: unknown, field = "amount") {
	try {
		const text = String(value ?? "");
		if (!/^\d+(\.\d{1,7})?$/.test(text)) throw new Error();
		const stroops = toStroops(text);
		if (stroops <= 0n) throw new Error();
		return stroops;
	} catch {
		throw new HttpError(400, "VALIDATION_FAILED", "Please fix the highlighted field", [
			{ field, message: `${field} must be a positive amount as text, with up to 7 decimal places, like "100.50"` },
		]);
	}
}

// --- DTO mapping ---------------------------------------------------------------------------------------------------

function totalsDto(db: MockDb, c: CampaignRow): CampaignDto["totals"] {
	const t = campaignTotals(db, c.reference);
	const remaining = t.target - t.raised;
	return {
		raised: dec(t.raised),
		allocated: dec(t.allocated),
		disbursed: dec(t.disbursed),
		recovered: dec(t.recovered),
		availableBalance: dec(t.available),
		remainingToTarget: dec(remaining > 0n ? remaining : 0n),
		fundingProgressPercent: t.target > 0n ? Math.min(100, Number((t.raised * 10_000n) / t.target) / 100) : 0,
		beneficiariesApproved: t.beneficiariesApproved,
		beneficiariesPaid: t.beneficiariesPaid,
	};
}

/** `funded` = still active and the target is reached. */
function displayStatus(db: MockDb, c: CampaignRow): CampaignDto["displayStatus"] {
	if (c.status !== "active") return c.status;
	const t = campaignTotals(db, c.reference);
	return t.target > 0n && t.raised >= t.target ? "funded" : "active";
}

function campaignDto(db: MockDb, c: CampaignRow): CampaignDto {
	const org = db.orgs.find((o) => o.id === c.organizationId);
	return {
		reference: c.reference,
		title: c.title,
		description: c.description,
		eligibilityRequirements: c.eligibilityRequirements,
		category: c.category,
		featured: c.featured,
		organization: { name: org?.name ?? "", websiteUrl: org?.websiteUrl ?? null },
		adminWallet: c.adminWallet,
		asset: "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
		network: "testnet",
		targetAmount: dec(c.target),
		maxAllocation: dec(c.maxAllocation),
		beneficiaryTarget: c.beneficiaryTarget,
		startsAt: c.startsAt,
		endsAt: c.endsAt,
		status: c.status,
		displayStatus: displayStatus(db, c),
		totals: totalsDto(db, c),
		createdAt: c.createdAt,
		updatedAt: c.updatedAt,
	};
}

const orgDto = (o: OrgRow): OrganizationDto => ({
	id: o.id,
	name: o.name,
	description: o.description,
	websiteUrl: o.websiteUrl,
	adminWallet: o.adminWallet,
});

/** `withName`: the organization's list includes the name (the real backend logs each one it returns). */
const beneficiaryDto = (b: BeneficiaryRow, withName = false): BeneficiaryDto => ({
	id: b.id,
	reference: b.reference,
	walletAddress: b.walletAddress,
	...(withName && { fullName: b.fullName }),
	status: b.status,
	eligibilityStatus: b.status === "approved" ? "eligible" : b.status === "rejected" ? "ineligible" : "pending",
	reviewedAt: b.reviewedAt,
	createdAt: b.createdAt,
	updatedAt: b.updatedAt,
});

const beneficiaryDetailDto = (b: BeneficiaryRow): BeneficiaryDetailDto => ({
	...beneficiaryDto(b),
	profile: {
		fullName: b.fullName,
		email: b.email,
		phone: b.phone,
		eligibilityDetails: b.eligibilityDetails,
		reviewNote: b.reviewNote,
	},
	evidence: b.evidence.map((e) => ({
		id: e.id,
		contentType: e.contentType,
		sizeBytes: e.sizeBytes,
		sha256: e.sha256,
		createdAt: e.createdAt,
	})),
});

function allocationDto(db: MockDb, a: AllocationRow): AllocationDto {
	const b = db.beneficiaries.find((x) => x.id === a.beneficiaryId);
	return {
		id: a.id,
		reference: a.reference,
		beneficiaryId: a.beneficiaryId,
		beneficiaryReference: b?.reference ?? "",
		walletAddress: b?.walletAddress ?? "",
		amount: dec(a.amount),
		status: a.status,
		payoutTxHash: a.payoutTxHash,
		explorerUrl: a.payoutTxHash ? explorer.tx(a.payoutTxHash) : null,
		paidAt: a.paidAt,
		cancelledAt: a.cancelledAt,
		createdAt: a.createdAt,
	};
}

const ledgerDto = (r: LedgerRow): LedgerEntryDto => ({
	id: r.id,
	campaignReference: r.campaignReference,
	type: r.type,
	amount: dec(r.amount),
	status: r.status,
	recipientReference: r.recipientReference,
	timestamp: r.timestamp,
	ledger: r.ledger,
	transactionHash: r.txHash,
	explorerUrl: r.ledger === null && r.status === "failed" ? null : explorer.tx(r.txHash),
	failureCode: r.failureCode,
});

function page<T>(items: T[], params: Record<string, unknown>) {
	const limit = Math.max(1, Math.min(Number(params.limit ?? 20) || 20, 100));
	const offset = Math.max(0, Number(params.offset ?? 0) || 0);
	const result = items.slice(offset, offset + limit);
	const totalPage = Math.ceil(items.length / limit);
	const currentPage = Math.floor(offset / limit) + 1;
	return {
		result,
		paginationMeta: {
			nextPage: offset + limit < items.length,
			previousPage: offset > 0,
			currentPage,
			totalPage,
			totalCount: items.length,
			pageCount: result.length,
		},
	};
}

// --- auth ----------------------------------------------------------------------------------------------------------

const TOKEN_PREFIX = "mock-access.";
const challenges = new Map<string, string>();

function signedIn(req: MockRequest) {
	const address = req.token?.startsWith(TOKEN_PREFIX) ? req.token.slice(TOKEN_PREFIX.length) : null;
	if (!address) throw new HttpError(401, "UNAUTHORIZED", "Sign in with your wallet to continue.");
	return address;
}

const orgOf = (db: MockDb, address: string) => db.orgs.find((o) => o.adminWallet === address);

/** Private routes answer 404 for campaigns that aren't yours: they never confirm what exists. */
function campaignFor(db: MockDb, reference: string, admin: string) {
	const campaign = db.campaigns.find((c) => c.reference === decodeURIComponent(reference));
	if (!campaign || campaign.adminWallet !== admin)
		throw new HttpError(404, "CAMPAIGN_NOT_FOUND", "We couldn't find that campaign.");
	return campaign;
}

function beneficiaryIn(db: MockDb, campaign: CampaignRow, id: string) {
	const b = db.beneficiaries.find((x) => x.id === id && x.campaignReference === campaign.reference);
	if (!b) throw new HttpError(404, "BENEFICIARY_NOT_FOUND", "We couldn't find that beneficiary.");
	return b;
}

function allocationIn(db: MockDb, campaign: CampaignRow, id: string) {
	const a = db.allocations.find((x) => x.id === id && x.campaignReference === campaign.reference);
	if (!a) throw new HttpError(404, "ALLOCATION_NOT_FOUND", "We couldn't find that allocation.");
	return a;
}

function notify(db: MockDb, event: string, message: string, campaignReference: string | null) {
	db.notifications.unshift({ id: nextId("ntf"), event, message, campaignReference, readAt: null, createdAt: now() });
}

const liveAllocation = (db: MockDb, beneficiaryId: string) =>
	db.allocations.find(
		(a) => a.beneficiaryId === beneficiaryId && (LIVE_ALLOCATION.includes(a.status) || a.status === "confirmed"),
	);

// --- money actions (prepare → wallet signs → submit → pending → settled) -------------------------------------------

type Effect =
	| { kind: "fund"; amount: bigint }
	| { kind: "lock_allocations"; allocationIds: string[] }
	| { kind: "payout"; allocationId: string }
	| { kind: "cancel_allocation"; allocationId: string };

interface MockAction {
	dto: ChainActionDto;
	campaignReference: string;
	effect: Effect;
	settleAt: number;
	fail: boolean;
}

const actions = new Map<string, MockAction>();

function prepare(campaign: CampaignRow, effect: Effect, amount: bigint | null) {
	// Preparing a new transaction for the campaign replaces the one waiting for a signature.
	for (const a of actions.values())
		if (a.campaignReference === campaign.reference && a.dto.status === "prepared")
			a.dto = {
				...a.dto,
				status: "expired",
				transaction: null,
				statusMessage: "Replaced by a newer transaction. No funds moved.",
			};
	const id = nextId("act");
	const hash = mockTxHash(`${id}:${Date.now()}`);
	const dto: ChainActionDto = {
		id,
		kind: effect.kind,
		status: "prepared",
		hash,
		amount: amount === null ? null : dec(amount),
		transaction: `MOCK:${id}`,
		networkPassphrase: NETWORK_PASSPHRASE,
		expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
		ledger: null,
		explorerUrl: null,
		statusMessage: "Waiting for the wallet signature",
		failureCode: null,
		failureCodes: null,
	};
	actions.set(id, { dto, campaignReference: campaign.reference, effect, settleAt: 0, fail: false });
	return ok(dto);
}

function submit(db: MockDb, campaign: CampaignRow, id: string, body: unknown) {
	const action = actions.get(id);
	if (!action || action.campaignReference !== campaign.reference)
		throw new HttpError(404, "TRANSACTION_NOT_FOUND", "We couldn't find that transaction. Start again.");
	if (action.dto.status === "expired" || Date.parse(action.dto.expiresAt) < Date.now()) {
		action.dto = { ...action.dto, status: "expired", transaction: null };
		throw new HttpError(409, "TRANSACTION_EXPIRED", "This transaction expired. Try again to prepare a new one.");
	}
	if (action.dto.status !== "prepared")
		throw new HttpError(409, "TRANSACTION_IN_PROGRESS", "This transaction was already submitted.");
	const signed = (body as { signedTransaction?: string } | null)?.signedTransaction ?? "";
	if (signed !== `SIGNED:${action.dto.transaction}`)
		throw new HttpError(
			400,
			"INVALID_SIGNATURE",
			"The wallet didn't sign the transaction that was prepared. Start the step again.",
		);
	const realistic = useMockControls.getState().speed === "realistic";
	action.fail = consume("failNext");
	action.settleAt = Date.now() + (realistic ? 4500 : 1200);
	action.dto = { ...action.dto, status: "pending", transaction: null, statusMessage: "Confirming on Stellar" };
	const e = action.effect;
	// Funding and payout attempts appear on the public ledger as soon as they're submitted (as pending).
	if (e.kind === "fund") {
		db.ledger.unshift({
			id: action.dto.id,
			campaignReference: campaign.reference,
			type: "funding",
			amount: e.amount.toString(),
			status: "pending",
			recipientReference: null,
			txHash: action.dto.hash,
			ledger: null,
			failureCode: null,
			timestamp: now(),
		});
	} else if (e.kind === "payout") {
		const a = allocationIn(db, campaign, e.allocationId);
		a.status = "processing";
		db.ledger.unshift({
			id: action.dto.id,
			campaignReference: campaign.reference,
			type: "disbursement",
			amount: a.amount,
			status: "pending",
			recipientReference: a.reference,
			txHash: action.dto.hash,
			ledger: null,
			failureCode: null,
			timestamp: now(),
		});
	}
	return ok(action.dto);
}

/** Settles a pending action once its "ledger" has closed: apply the effect, or fail with nothing moved. */
function settle(db: MockDb, action: MockAction) {
	if (action.dto.status !== "pending" || Date.now() < action.settleAt) return;
	const campaign = db.campaigns.find((c) => c.reference === action.campaignReference)!;
	const at = now();
	const e = action.effect;
	const row = db.ledger.find((r) => r.id === action.dto.id);
	if (action.fail) {
		if (row) Object.assign(row, { status: "failed", failureCode: "TRANSACTION_FAILED" });
		if (e.kind === "payout") {
			const a = db.allocations.find((x) => x.id === e.allocationId)!;
			a.status = "failed";
			a.failureMessage = "The payout failed on Stellar (simulated). No funds moved; retry the payout.";
			notify(db, "payout_failed", `A payout for ${campaign.title} failed. No funds moved.`, campaign.reference);
		}
		action.dto = {
			...action.dto,
			status: "failed",
			statusMessage: "The transaction failed on Stellar (simulated). No funds moved.",
			failureCode: "TRANSACTION_FAILED",
			failureCodes: ["TRANSACTION_FAILED"],
		};
		return;
	}
	db.counters.ledger += 1 + Math.floor(Math.random() * 3);
	const ledger = db.counters.ledger;
	if (row) Object.assign(row, { status: "confirmed", ledger, timestamp: at });
	if (e.kind === "fund") {
		db.walletUsdc = (BigInt(db.walletUsdc) - e.amount).toString();
		notify(
			db,
			"funding_confirmed",
			`${Number(fromStroops(e.amount)).toLocaleString("en-US")} USDC funding confirmed for ${campaign.title}`,
			campaign.reference,
		);
	} else if (e.kind === "lock_allocations") {
		for (const id of e.allocationIds) {
			const a = db.allocations.find((x) => x.id === id);
			if (a?.status === "allocated") a.status = "ready";
		}
	} else if (e.kind === "payout") {
		const a = db.allocations.find((x) => x.id === e.allocationId)!;
		a.status = "confirmed";
		a.payoutTxHash = action.dto.hash;
		a.paidAt = at;
		a.failureMessage = null;
		notify(db, "payout_confirmed", `${fromStroops(a.amount)} USDC paid to ${a.reference}`, campaign.reference);
	} else {
		const a = db.allocations.find((x) => x.id === e.allocationId)!;
		a.status = "cancelled";
		a.cancelledAt = at;
	}
	action.dto = {
		...action.dto,
		status: "confirmed",
		ledger,
		explorerUrl: explorer.tx(action.dto.hash),
		statusMessage: "Confirmed on Stellar",
	};
}

// --- router --------------------------------------------------------------------------------------------------------

type Handler = (req: MockRequest, m: string[], db: MockDb) => MockResponse;

let lastStatusToken: string | null = null;

/** Mock mode only: the private status-link token the real backend would have emailed to the last applicant. */
export const peekLastStatusToken = () => lastStatusToken;

function addBeneficiary(db: MockDb, campaign: CampaignRow, body: Record<string, unknown>, emailRequired: boolean) {
	validate([
		[len(body.fullName) < 2 || len(body.fullName) > 120, "fullName", "fullName must be between 2 and 120 characters"],
		[emailRequired ? !isEmail(body.email) : !!str(body.email) && !isEmail(body.email), "email", "email must be an email"],
		[!isAddress(body.walletAddress), "walletAddress", "walletAddress must be a Stellar account address (G…)"],
		[
			len(body.eligibilityDetails) < 3 || len(body.eligibilityDetails) > 4000,
			"eligibilityDetails",
			"eligibilityDetails must be between 3 and 4,000 characters",
		],
	]);
	const wallet = String(body.walletAddress).trim();
	const existing = db.beneficiaries.find((b) => b.campaignReference === campaign.reference && b.walletAddress === wallet);
	if (existing) return { row: existing, created: false };
	db.counters.beneficiary++;
	const at = now();
	const row: BeneficiaryRow = {
		id: nextId("ben"),
		reference: `BNF-${db.counters.beneficiary.toString().padStart(5, "0")}`,
		campaignReference: campaign.reference,
		fullName: String(body.fullName).trim(),
		email: str(body.email) ?? null,
		phone: str(body.phone) ?? null,
		walletAddress: wallet,
		eligibilityDetails: String(body.eligibilityDetails).trim(),
		reviewNote: null,
		evidence: [],
		status: "registered",
		reviewedAt: null,
		createdAt: at,
		updatedAt: at,
		statusToken: mockTxHash(`token-${Date.now()}-${Math.random()}`).slice(0, 40),
	};
	db.beneficiaries.unshift(row);
	return { row, created: true };
}

const EVIDENCE_TYPES = ["application/pdf", "image/png", "image/jpeg"];

function addEvidence(b: BeneficiaryRow, body: unknown) {
	if (b.status === "approved" || b.status === "rejected")
		throw new HttpError(409, "EVIDENCE_LOCKED", "Evidence can't change after a decision.");
	const file = typeof FormData !== "undefined" && body instanceof FormData ? body.get("file") : null;
	if (!file || typeof file === "string") throw new HttpError(400, "FILE_REQUIRED", "Choose a file to upload.");
	if (!EVIDENCE_TYPES.includes(file.type)) throw new HttpError(400, "UNSUPPORTED_FILE_TYPE", "Upload a PDF, PNG or JPEG.");
	if (file.size > 5 * 1024 * 1024) throw new HttpError(413, "FILE_TOO_LARGE", "Files can be up to 5 MB.");
	if (b.evidence.length >= 5) throw new HttpError(409, "TOO_MANY_FILES", "An application can have at most 5 files.");
	return addFile(b, file);
}

function addFile(b: BeneficiaryRow, file: File) {
	const row = {
		id: nextId("ev"),
		name: file.name,
		contentType: file.type,
		sizeBytes: file.size,
		sha256: mockTxHash(`${file.name}:${file.size}`),
		createdAt: now(),
	};
	b.evidence.push(row);
	b.updatedAt = row.createdAt;
	return row;
}

function ledgerList(db: MockDb, params: Record<string, unknown>, campaign?: string) {
	const { type, status, search, from, to } = params as Record<string, string | undefined>;
	let list = db.ledger;
	if (campaign) list = list.filter((r) => r.campaignReference === campaign);
	if (type) list = list.filter((r) => r.type === type);
	if (status) list = list.filter((r) => r.status === status);
	if (from) list = list.filter((r) => r.timestamp >= new Date(from).toISOString());
	if (to) {
		const end = /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59.999Z`) : new Date(to);
		list = list.filter((r) => r.timestamp <= end.toISOString());
	}
	if (search) {
		list = list.filter((r) => {
			const title = db.campaigns.find((c) => c.reference === r.campaignReference)?.title ?? "";
			return includes(`${r.txHash} ${r.campaignReference} ${r.recipientReference ?? ""} ${title}`, search);
		});
	}
	return ok(page(list.map(ledgerDto), params), 200, "Ledger");
}

function publicCampaign(db: MockDb, reference: string) {
	const c = db.campaigns.find((x) => x.reference === decodeURIComponent(reference) && x.status !== "draft");
	if (!c) throw new HttpError(404, "CAMPAIGN_NOT_FOUND", "We couldn't find a public campaign with that reference.");
	return c;
}

function walletDto(db: MockDb, address: string): WalletDto {
	return {
		address,
		shortAddress: `${address.slice(0, 4)}…${address.slice(-4)}`,
		exists: true,
		explorerUrl: explorer.account(address),
		assets: [
			{ id: "XLM", code: "XLM", issuer: null, native: true, trusted: true, balance: "9984.3500000", spendable: "9982.3500000" },
			{
				id: "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
				code: "USDC",
				issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
				native: false,
				trusted: true,
				balance: fromStroops(db.walletUsdc),
				spendable: fromStroops(db.walletUsdc),
			},
		],
	};
}

function reportCsv(db: MockDb, c: CampaignRow) {
	const t = campaignTotals(db, c.reference);
	const lines = [
		["Campaign", c.reference, c.title],
		["Funding target (USDC)", dec(t.target)],
		["Total inflows (USDC)", dec(t.raised)],
		["Total outflows (USDC)", dec(t.disbursed)],
		["Recovered (USDC)", dec(t.recovered)],
		["Available balance (USDC)", dec(t.available)],
		["Beneficiaries approved", t.beneficiariesApproved],
		["Beneficiaries paid", t.beneficiariesPaid],
		[],
		["Timestamp (UTC)", "Type", "Amount (USDC)", "Status", "Recipient reference", "Ledger", "Transaction hash"],
		...db.ledger
			.filter((r) => r.campaignReference === c.reference)
			.map((r) => [r.timestamp, r.type, dec(r.amount), r.status, r.recipientReference ?? "", r.ledger ?? "", r.txHash]),
		[],
		["Allocation reference", "Amount (USDC)", "Status", "Paid at", "Payout hash"],
		...db.allocations
			.filter((a) => a.campaignReference === c.reference)
			.map((a) => [a.reference, dec(a.amount), a.status, a.paidAt ?? "", a.payoutTxHash ?? ""]),
	];
	return lines.map((l) => l.join(",")).join("\r\n");
}

const routes: [string, RegExp, Handler][] = [
	// --- Public
	[
		"GET",
		/^\/public\/stats$/,
		(_r, _m, db) => {
			const s = platformStats(db);
			const dto: PublicStatsDto = {
				campaigns: s.campaigns,
				activeCampaigns: s.activeCampaigns,
				organizations: s.organizations,
				totalTarget: dec(s.target),
				totalRaised: dec(s.raised),
				totalDisbursed: dec(s.disbursed),
				beneficiariesApproved: s.beneficiariesApproved,
				beneficiariesPaid: s.beneficiariesPaid,
				verifiedTransactions: s.verifiedTransactions,
			};
			return ok(dto, 200, "Statistics");
		},
	],
	[
		"GET",
		/^\/public\/campaigns$/,
		(req, _m, db) => {
			const search = str(req.params.search);
			const status = str(req.params.status);
			const category = str(req.params.category);
			const featured = req.params.featured;
			let list = db.campaigns.filter((c) => c.status === "active" || c.status === "closed");
			if (status) list = list.filter((c) => displayStatus(db, c) === status);
			if (category) list = list.filter((c) => c.category?.toLowerCase() === category.toLowerCase());
			if (featured === true || featured === "true") list = list.filter((c) => c.featured);
			if (search) list = list.filter((c) => includes(`${c.title} ${c.reference} ${c.description} ${c.category ?? ""}`, search));
			list = [...list].sort((a, b) => Number(b.featured) - Number(a.featured)); // featured first
			return ok(
				page(
					list.map((c) => campaignDto(db, c)),
					req.params,
				),
				200,
				"Campaigns",
			);
		},
	],
	["GET", /^\/public\/campaigns\/([^/]+)$/, (_r, [ref], db) => ok(campaignDto(db, publicCampaign(db, ref!)), 200, "Campaign")],
	[
		"GET",
		/^\/public\/campaigns\/([^/]+)\/ledger$/,
		(req, [ref], db) => ledgerList(db, req.params, publicCampaign(db, ref!).reference),
	],
	["GET", /^\/public\/ledger$/, (req, _m, db) => ledgerList(db, req.params)],
	[
		"POST",
		/^\/public\/campaigns\/([^/]+)\/applications$/,
		(req, [ref], db) => {
			const c = publicCampaign(db, ref!);
			if (c.status !== "active") throw new HttpError(409, "APPLICATIONS_CLOSED", "This campaign isn't accepting applications.");
			// JSON, or multipart with the same fields plus up to 5 evidence files in `files`. One bad file rejects it all.
			let body = (req.body ?? {}) as Record<string, unknown>;
			let files: File[] = [];
			if (typeof FormData !== "undefined" && req.body instanceof FormData) {
				const form = req.body;
				body = Object.fromEntries(
					["fullName", "email", "phone", "walletAddress", "eligibilityDetails"].map((k) => [k, form.get(k) ?? undefined]),
				);
				files = form.getAll("files").filter((f): f is File => typeof f !== "string");
				if (files.length > 5) throw new HttpError(409, "TOO_MANY_FILES", "An application can have at most 5 files.");
				if (files.some((f) => !EVIDENCE_TYPES.includes(f.type)))
					throw new HttpError(400, "UNSUPPORTED_FILE_TYPE", "Upload PDF, PNG or JPEG files only.");
				if (files.some((f) => f.size > 5 * 1024 * 1024))
					throw new HttpError(413, "FILE_TOO_LARGE", "Files can be up to 5 MB each.");
			}
			const { row, created } = addBeneficiary(db, c, body, true);
			if (created) for (const file of files) addFile(row, file);
			lastStatusToken = row.statusToken;
			if (created) notify(db, "application_received", `New beneficiary application ${row.reference} for ${c.title}`, c.reference);
			// Same answer whether or not this wallet already applied: the form never reveals who is seeking aid.
			return ok({ received: true }, 202, "Application received");
		},
	],
	[
		"GET",
		/^\/applications\/me$/,
		(req, _m, db) => {
			const b = db.beneficiaries.find((x) => x.statusToken === req.headers["x-application-token"]);
			if (!b) throw new HttpError(401, "INVALID_STATUS_LINK", "This status link is invalid or was replaced by a newer one.");
			const c = db.campaigns.find((x) => x.reference === b.campaignReference);
			return ok({
				reference: b.reference,
				status: b.status,
				note: b.reviewNote,
				canAddEvidence: b.status === "registered" || b.status === "under_review",
				campaign: c ? { reference: c.reference, title: c.title } : null,
				evidenceCount: b.evidence.length,
				createdAt: b.createdAt,
			});
		},
	],
	[
		"POST",
		/^\/applications\/me\/evidence$/,
		(req, _m, db) => {
			const b = db.beneficiaries.find((x) => x.statusToken === req.headers["x-application-token"]);
			if (!b) throw new HttpError(401, "INVALID_STATUS_LINK", "This status link is invalid or was replaced by a newer one.");
			addEvidence(b, req.body);
			return ok({ received: true }, 201);
		},
	],

	// --- Auth
	[
		"POST",
		/^\/auth\/challenge$/,
		(req) => {
			const address = (req.body as { address?: string } | null)?.address;
			if (!isAddress(address)) throw new HttpError(400, "INVALID_ADDRESS", "Enter a valid Stellar account address.");
			const challengeId = nextId("chl");
			challenges.set(challengeId, address!.trim());
			return ok({
				challengeId,
				transaction: `MOCK-CHALLENGE:${challengeId}`,
				networkPassphrase: NETWORK_PASSPHRASE,
				expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
			});
		},
	],
	[
		"POST",
		/^\/auth\/verify$/,
		(req) => {
			const { challengeId, signedTransaction } = (req.body ?? {}) as { challengeId?: string; signedTransaction?: string };
			const address = challengeId ? challenges.get(challengeId) : undefined;
			challenges.delete(challengeId ?? ""); // each challenge works once, even when the signature is wrong
			if (!address) throw new HttpError(400, "CHALLENGE_EXPIRED", "The sign-in request expired. Connect your wallet again.");
			if (signedTransaction !== `SIGNED:MOCK-CHALLENGE:${challengeId}`)
				throw new HttpError(400, "INVALID_SIGNATURE", "The wallet didn't sign the sign-in request.");
			return ok({
				accessToken: `${TOKEN_PREFIX}${address}`,
				refreshToken: `mock-refresh.${address}.${Date.now()}`,
				tokenType: "Bearer",
				expiresIn: 900,
				newAccount: false,
			});
		},
	],
	[
		"POST",
		/^\/auth\/refresh$/,
		(req) => {
			const { refreshToken } = (req.body ?? {}) as { refreshToken?: string };
			const address = refreshToken?.split(".")[1];
			if (!address) throw new HttpError(401, "UNAUTHORIZED", "Your session ended. Sign in again.");
			return ok({
				accessToken: `${TOKEN_PREFIX}${address}`,
				refreshToken: `mock-refresh.${address}.${Date.now()}`,
				tokenType: "Bearer",
				expiresIn: 900,
			});
		},
	],
	["POST", /^\/auth\/logout$/, () => ({ status: 204, body: "" })],
	[
		"GET",
		/^\/auth\/me$/,
		(req, _m, db) => {
			const address = signedIn(req);
			const org = orgOf(db, address);
			const me: MeDto = {
				id: `usr_${address.slice(1, 9).toLowerCase()}`,
				walletAddress: address,
				shortAddress: `${address.slice(0, 4)}…${address.slice(-4)}`,
				roles: { organizationAdmin: !!org, platformAdmin: false },
				organization: org ? { id: org.id, name: org.name } : null,
				createdAt: org?.createdAt ?? now(),
			};
			return ok(me);
		},
	],

	// --- Organizations
	[
		"GET",
		/^\/organizations\/me$/,
		(req, _m, db) => {
			const org = orgOf(db, signedIn(req));
			if (!org) throw new HttpError(404, "ORGANIZATION_NOT_FOUND", "This wallet hasn't registered an organization yet.");
			return ok(orgDto(org));
		},
	],
	[
		"POST",
		/^\/organizations$/,
		(req, _m, db) => {
			const address = signedIn(req);
			if (orgOf(db, address)) throw new HttpError(409, "ORGANIZATION_EXISTS", "This wallet already administers an organization.");
			const b = (req.body ?? {}) as Record<string, unknown>;
			validate([
				[len(b.name) < 2 || len(b.name) > 120, "name", "name must be between 2 and 120 characters"],
				[
					!!str(b.websiteUrl) && !/^https?:\/\/\S+\.\S+/.test(String(b.websiteUrl)),
					"websiteUrl",
					"websiteUrl must be a URL address",
				],
			]);
			const org: OrgRow = {
				id: nextId("org"),
				name: String(b.name).trim(),
				description: str(b.description) ?? null,
				websiteUrl: str(b.websiteUrl) ?? null,
				adminWallet: address,
				createdAt: now(),
			};
			db.orgs.push(org);
			return ok(orgDto(org), 201);
		},
	],

	// --- Campaigns (administrator)
	[
		"GET",
		/^\/campaigns$/,
		(req, _m, db) => {
			const admin = signedIn(req);
			return ok(
				page(
					db.campaigns.filter((c) => c.adminWallet === admin).map((c) => campaignDto(db, c)),
					req.params,
				),
			);
		},
	],
	[
		"POST",
		/^\/campaigns$/,
		(req, _m, db) => {
			const admin = signedIn(req);
			const org = orgOf(db, admin);
			if (!org) throw new HttpError(409, "ORGANIZATION_REQUIRED", "Register your organization before creating a campaign.");
			const b = (req.body ?? {}) as Record<string, unknown>;
			const start = Date.parse(String(b.startsAt));
			const end = Date.parse(String(b.endsAt));
			validate([
				[len(b.title) < 3 || len(b.title) > 140, "title", "title must be between 3 and 140 characters"],
				[
					len(b.description) < 10 || len(b.description) > 5000,
					"description",
					"description must be between 10 and 5,000 characters",
				],
				[
					len(b.eligibilityRequirements) < 3 || len(b.eligibilityRequirements) > 5000,
					"eligibilityRequirements",
					"eligibilityRequirements must be between 3 and 5,000 characters",
				],
				[
					!!str(b.category) && (len(b.category) < 2 || len(b.category) > 40),
					"category",
					"category must be between 2 and 40 characters",
				],
				[
					!Number.isInteger(b.beneficiaryTarget) || Number(b.beneficiaryTarget) < 1 || Number(b.beneficiaryTarget) > 100_000,
					"beneficiaryTarget",
					"beneficiaryTarget must be a whole number from 1 to 100,000",
				],
				[Number.isNaN(start), "startsAt", "startsAt must be an ISO 8601 date"],
				[Number.isNaN(end), "endsAt", "endsAt must be an ISO 8601 date"],
			]);
			const target = parseAmount(b.targetAmount, "targetAmount");
			const maxAllocation = parseAmount(b.maxAllocation, "maxAllocation");
			if (maxAllocation > target)
				throw new HttpError(400, "INVALID_CAMPAIGN_TERMS", "The maximum allocation can't exceed the funding target.");
			if (end <= start) throw new HttpError(400, "INVALID_CAMPAIGN_DATES", "The end date must be after the start date.");
			db.counters.campaign++;
			const at = now();
			const row: CampaignRow = {
				reference: `AT-${db.counters.campaign}`,
				title: String(b.title).trim(),
				description: String(b.description).trim(),
				eligibilityRequirements: String(b.eligibilityRequirements).trim(),
				category: str(b.category) ?? null,
				featured: false, // only a platform administrator can feature a campaign
				organizationId: org.id,
				adminWallet: admin,
				target: target.toString(),
				maxAllocation: maxAllocation.toString(),
				beneficiaryTarget: Number(b.beneficiaryTarget),
				startsAt: new Date(start).toISOString(),
				endsAt: new Date(end).toISOString(),
				status: "draft",
				createdAt: at,
				updatedAt: at,
			};
			db.campaigns.unshift(row);
			return ok(campaignDto(db, row), 201, "Campaign created");
		},
	],
	["GET", /^\/campaigns\/([^/]+)$/, (req, [ref], db) => ok(campaignDto(db, campaignFor(db, ref!, signedIn(req))))],
	[
		"PATCH",
		/^\/campaigns\/([^/]+)$/,
		(req, [ref], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			const b = (req.body ?? {}) as Record<string, unknown>;
			const locked = Object.keys(b).filter((k) => !["title", "description", "category", "endsAt"].includes(k));
			if (c.status !== "draft" && locked.length)
				throw new HttpError(
					409,
					"FIELDS_LOCKED",
					"After publishing, only the title, description, category and end date can change.",
				);
			if (str(b.title)) c.title = String(b.title).trim();
			if (str(b.description)) c.description = String(b.description).trim();
			if (b.category !== undefined) c.category = str(b.category) ?? null;
			if (str(b.endsAt)) c.endsAt = new Date(String(b.endsAt)).toISOString();
			c.updatedAt = now();
			return ok(campaignDto(db, c));
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/publish$/,
		(req, [ref], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			if (c.status !== "draft") throw new HttpError(409, "INVALID_CAMPAIGN_STATE", "Only a draft can be published.");
			c.status = "active";
			c.updatedAt = now();
			notify(db, "campaign_published", `${c.title} is live on the public dashboard`, c.reference);
			return ok(campaignDto(db, c), 200, "Campaign published");
		},
	],

	// --- Beneficiaries (administrator)
	[
		"GET",
		/^\/campaigns\/([^/]+)\/beneficiaries$/,
		(req, [ref], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			const status = str(req.params.status);
			let list = db.beneficiaries.filter((b) => b.campaignReference === c.reference);
			if (status) list = list.filter((b) => b.status === status);
			list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
			return ok(
				page(
					list.map((b) => beneficiaryDto(b, true)),
					req.params,
				),
			);
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/beneficiaries$/,
		(req, [ref], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			const { row, created } = addBeneficiary(db, c, (req.body ?? {}) as Record<string, unknown>, false);
			if (!created) throw new HttpError(409, "BENEFICIARY_WALLET_TAKEN", "This wallet is already registered for this campaign.");
			return ok(beneficiaryDto(row), 201, "Beneficiary registered");
		},
	],
	[
		"GET",
		/^\/campaigns\/([^/]+)\/beneficiaries\/([^/]+)$/,
		(req, [ref, id], db) => ok(beneficiaryDetailDto(beneficiaryIn(db, campaignFor(db, ref!, signedIn(req)), id!))),
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/beneficiaries\/([^/]+)\/review$/,
		(req, [ref, id], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			const b = beneficiaryIn(db, c, id!);
			const { decision, note } = (req.body ?? {}) as { decision?: string; note?: string };
			const invalid = () =>
				new HttpError(
					409,
					"INVALID_REVIEW_STATE",
					`${b.reference} can't be reviewed that way from "${b.status.replace("_", " ")}".`,
				);
			if (decision === "start_review") {
				if (b.status !== "registered") throw invalid();
				b.status = "under_review";
			} else if (decision === "approve" || decision === "reject") {
				if (b.status !== "under_review") throw invalid();
				if (decision === "approve" && b.walletAddress === c.adminWallet)
					throw new HttpError(
						409,
						"SELF_PAYMENT_BLOCKED",
						"The organization's own administrator wallet can't be approved as a beneficiary.",
					);
				b.status = decision === "approve" ? "approved" : "rejected";
				b.reviewedAt = now();
				b.reviewNote = str(note) ?? null;
			} else if (decision === "reopen") {
				if (b.status !== "approved" && b.status !== "rejected") throw invalid();
				if (liveAllocation(db, b.id))
					throw new HttpError(
						409,
						"INVALID_REVIEW_STATE",
						`${b.reference} has a live or paid allocation, so it can't be reopened.`,
					);
				b.status = "under_review";
				b.reviewedAt = null;
			} else
				throw new HttpError(400, "VALIDATION_FAILED", "Please fix the highlighted field", [
					{ field: "decision", message: "decision must be one of: start_review, approve, reject, reopen" },
				]);
			b.updatedAt = now();
			return ok(beneficiaryDto(b));
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/beneficiaries\/([^/]+)\/evidence$/,
		(req, [ref, id], db) => {
			const b = beneficiaryIn(db, campaignFor(db, ref!, signedIn(req)), id!);
			const row = addEvidence(b, req.body);
			return ok(
				{ id: row.id, contentType: row.contentType, sizeBytes: row.sizeBytes, sha256: row.sha256, createdAt: row.createdAt },
				201,
			);
		},
	],
	[
		"GET",
		/^\/campaigns\/([^/]+)\/beneficiaries\/([^/]+)\/evidence\/([^/]+)$/,
		(req, [ref, id, fileId], db) => {
			const b = beneficiaryIn(db, campaignFor(db, ref!, signedIn(req)), id!);
			const file = b.evidence.find((e) => e.id === fileId);
			if (!file) throw new HttpError(404, "FILE_NOT_FOUND", "We couldn't find that file.");
			return {
				status: 200,
				body: `Demo evidence placeholder for ${b.reference}: ${file.name}. The real file is downloaded from protected storage once the backend is connected.`,
				headers: { "content-disposition": `attachment; filename="${b.reference}-${file.name}.txt"` },
			};
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/beneficiaries\/([^/]+)\/status-link$/,
		(req, [ref, id], db) => (beneficiaryIn(db, campaignFor(db, ref!, signedIn(req)), id!), ok({ sent: true })),
	],

	// --- Escrow, allocations and actions
	[
		"POST",
		/^\/campaigns\/([^/]+)\/escrow\/fund$/,
		(req, [ref], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			if (c.status !== "active") throw new HttpError(409, "INVALID_CAMPAIGN_STATE", "Only an active campaign can be funded.");
			const amount = parseAmount((req.body as { amount?: string } | null)?.amount);
			if (amount < 10_000_000n) throw new HttpError(400, "AMOUNT_TOO_SMALL", "Fund at least 1 USDC.");
			if (amount > BigInt(db.walletUsdc))
				throw new HttpError(422, "INSUFFICIENT_BALANCE", "Your wallet doesn't hold enough test USDC for this amount.");
			return prepare(c, { kind: "fund", amount }, amount);
		},
	],
	[
		"GET",
		/^\/campaigns\/([^/]+)\/allocations$/,
		(req, [ref], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			return ok(
				page(
					db.allocations.filter((a) => a.campaignReference === c.reference).map((a) => allocationDto(db, a)),
					req.params,
				),
			);
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/allocations$/,
		(req, [ref], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			const items = ((req.body as { items?: { beneficiaryId?: string; amount?: string }[] } | null)?.items ?? []).slice();
			if (!items.length || items.length > 100)
				throw new HttpError(400, "VALIDATION_FAILED", "Allocate to between 1 and 100 beneficiaries at a time.");
			const amounts = items.map((item, i) => parseAmount(item.amount, `items.${i}.amount`));
			const t = campaignTotals(db, c.reference);
			const pool = t.available - t.allocated;
			const total = amounts.reduce((s, a) => s + a, 0n);
			// All or nothing: check every item before writing any.
			const rows = items.map((item, i) => {
				const b = beneficiaryIn(db, c, String(item.beneficiaryId));
				if (b.status !== "approved")
					throw new HttpError(
						409,
						"BENEFICIARY_NOT_APPROVED",
						`${b.reference} isn't approved. Only approved beneficiaries can receive allocations.`,
					);
				if (amounts[i]! > BigInt(c.maxAllocation))
					throw new HttpError(
						409,
						"ALLOCATION_LIMIT_EXCEEDED",
						`The maximum allocation for this campaign is ${dec(c.maxAllocation)} USDC per beneficiary.`,
					);
				if (liveAllocation(db, b.id))
					throw new HttpError(
						409,
						"ALLOCATION_EXISTS",
						`${b.reference} already has an allocation. Cancel it first to change the amount.`,
					);
				return b;
			});
			if (total > pool)
				throw new HttpError(
					409,
					"INSUFFICIENT_FUNDS",
					`Not enough unallocated funds: ${dec(pool > 0n ? pool : 0n)} USDC is available to allocate.`,
				);
			const at = now();
			const created = rows.map((b, i) => {
				const row: AllocationRow = {
					id: nextId("alc"),
					reference: allocationReference(`${c.reference}-${b.reference}-${Date.now()}-${i}`),
					campaignReference: c.reference,
					beneficiaryId: b.id,
					amount: amounts[i]!.toString(),
					status: "allocated",
					payoutTxHash: null,
					paidAt: null,
					cancelledAt: null,
					failureMessage: null,
					createdAt: at,
				};
				db.allocations.unshift(row);
				return allocationDto(db, row);
			});
			return ok(created, 201, "Allocations assigned");
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/escrow\/lock$/,
		(req, [ref], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			const ids = (req.body as { allocationIds?: string[] } | null)?.allocationIds ?? [];
			if (!ids.length || ids.length > 20)
				throw new HttpError(400, "INVALID_LOCK_SIZE", "Lock between 1 and 20 allocations at a time.");
			for (const id of ids) {
				const a = allocationIn(db, c, id);
				if (a.status !== "allocated")
					throw new HttpError(409, "INVALID_ALLOCATION_STATE", `${a.reference} is ${a.status}, not waiting to be locked.`);
			}
			const total = ids.reduce((s, id) => s + BigInt(allocationIn(db, c, id).amount), 0n);
			return prepare(c, { kind: "lock_allocations", allocationIds: ids }, total);
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/allocations\/([^/]+)\/payout$/,
		(req, [ref, id], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			const a = allocationIn(db, c, id!);
			if (a.status === "confirmed")
				throw new HttpError(409, "ALREADY_PAID", `${a.reference} has already been paid. Duplicate payouts are blocked.`);
			if (a.status === "cancelled") throw new HttpError(409, "ALREADY_CANCELLED", `${a.reference} was cancelled.`);
			if (a.status === "processing")
				throw new HttpError(409, "PAYMENT_IN_PROGRESS", `A payout for ${a.reference} is already processing.`);
			if (a.status === "allocated")
				throw new HttpError(409, "ALLOCATION_NOT_LOCKED", `${a.reference} must be locked before it can be paid.`);
			return prepare(c, { kind: "payout", allocationId: a.id }, BigInt(a.amount));
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/allocations\/([^/]+)\/cancel$/,
		(req, [ref, id], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			const a = allocationIn(db, c, id!);
			if (a.status === "confirmed") throw new HttpError(409, "ALREADY_PAID", "Paid allocations can't be cancelled.");
			if (a.status === "cancelled") throw new HttpError(409, "ALREADY_CANCELLED", "This allocation is already cancelled.");
			if (a.status === "processing")
				throw new HttpError(409, "PAYMENT_IN_PROGRESS", "A payout for this allocation is processing.");
			if (a.status === "allocated") {
				a.status = "cancelled";
				a.cancelledAt = now();
				return ok({ status: "cancelled", action: null });
			}
			const prepared = prepare(c, { kind: "cancel_allocation", allocationId: a.id }, BigInt(a.amount));
			return ok({ status: "needs_signature", action: (prepared.body as { data: ChainActionDto }).data });
		},
	],
	[
		"GET",
		/^\/campaigns\/([^/]+)\/actions\/([^/]+)$/,
		(req, [ref, id], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			const action = actions.get(id!);
			if (!action || action.campaignReference !== c.reference)
				throw new HttpError(404, "TRANSACTION_NOT_FOUND", "We couldn't find that transaction.");
			settle(db, action);
			return ok(action.dto);
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/actions\/([^/]+)\/submit$/,
		(req, [ref, id], db) => submit(db, campaignFor(db, ref!, signedIn(req)), id!, req.body),
	],

	// --- Reports
	[
		"POST",
		/^\/campaigns\/([^/]+)\/reconciliation$/,
		(req, [ref], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			const items = db.allocations
				.filter((a) => a.campaignReference === c.reference && a.status === "confirmed")
				.map((a) => {
					const row = db.ledger.find(
						(r) => r.type === "disbursement" && r.status === "confirmed" && r.recipientReference === a.reference,
					);
					const matched = !!row && row.amount === a.amount && row.txHash === a.payoutTxHash;
					return {
						allocationReference: a.reference,
						amount: dec(a.amount),
						transactionHash: a.payoutTxHash,
						matched,
						issue: matched ? null : "No matching payment on Stellar",
					};
				});
			const dto: ReconciliationDto = { reconciled: items.every((i) => i.matched), checkedAt: now(), payouts: { items } };
			return ok(dto, 200, "Reconciliation");
		},
	],
	[
		"GET",
		/^\/campaigns\/([^/]+)\/report\.csv$/,
		(req, [ref], db) => {
			const c = campaignFor(db, ref!, signedIn(req));
			return {
				status: 200,
				body: reportCsv(db, c),
				headers: {
					"content-disposition": `attachment; filename="aidtrace-${c.reference}-report.csv"`,
					"content-type": "text/csv",
				},
			};
		},
	],

	// --- Notifications and wallet
	[
		"GET",
		/^\/notifications$/,
		(req, _m, db) => {
			signedIn(req);
			const list: NotificationDto[] = db.notifications.map((n) => ({
				id: n.id,
				event: n.event,
				message: n.message,
				campaignReference: n.campaignReference,
				readAt: n.readAt,
				createdAt: n.createdAt,
			}));
			return ok(page(list, req.params));
		},
	],
	[
		"GET",
		/^\/notifications\/unread$/,
		(req, _m, db) => (signedIn(req), ok({ count: db.notifications.filter((n) => !n.readAt).length })),
	],
	[
		"POST",
		/^\/notifications\/read-all$/,
		(req, _m, db) => {
			signedIn(req);
			const at = now();
			for (const n of db.notifications) n.readAt ??= at;
			return ok(null);
		},
	],
	[
		"POST",
		/^\/notifications\/([^/]+)\/read$/,
		(req, [id], db) => {
			signedIn(req);
			const n = db.notifications.find((x) => x.id === id);
			if (!n) throw new HttpError(404, "NOTIFICATION_NOT_FOUND", "We couldn't find that notification.");
			n.readAt ??= now();
			return ok(null);
		},
	],
	["GET", /^\/wallet$/, (req, _m, db) => ok(walletDto(db, signedIn(req)))],
	["POST", /^\/wallet\/fund$/, (req) => (signedIn(req), ok({ funded: true }))],
	[
		"POST",
		/^\/wallet\/trustline$/,
		(req) => (
			signedIn(req),
			ok({
				xdr: "MOCK:trustline",
				networkPassphrase: NETWORK_PASSPHRASE,
				expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
			})
		),
	],
	["POST", /^\/wallet\/trustline\/submit$/, (req, _m, db) => ok(walletDto(db, signedIn(req)))],
];

/** Answers one request. */
export function handle(req: MockRequest): MockResponse {
	const db = getDb();
	try {
		for (const [method, pattern, handler] of routes) {
			if (method !== req.method) continue;
			const match = req.path.match(pattern);
			if (!match) continue;
			const res = handler(req, match.slice(1), db);
			saveDb();
			return res;
		}
		throw new HttpError(404, "ROUTE_NOT_FOUND", `No mock route for ${req.method} ${req.path}`);
	} catch (error) {
		saveDb(); // failures still record what happened (failed payouts)
		if (error instanceof HttpError) {
			return {
				status: error.status,
				body: {
					statusCode: error.status,
					message: error.message,
					data: null,
					error: {
						code: error.code,
						fields: error.fields,
						requestId: `mock-${Date.now().toString(36)}`,
						timestamp: now(),
						path: `/api/v1${req.path}`,
					},
				},
			};
		}
		throw error;
	}
}

export { DEMO_ADMIN_WALLET };
