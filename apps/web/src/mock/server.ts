"use client";

import { campaignTotals, DEMO_ADMIN_WALLET, mockTxHash, platformStats, type BeneficiaryRow, type CampaignRow, type LedgerRow, type MockDb } from "@repo/mock/seed";
import { fromStroops, toStroops } from "@repo/stellar/format";
import type {
	AllocationDto,
	BeneficiaryDto,
	CampaignDto,
	LedgerEntryDto,
	NotificationDto,
	OrganizationDto,
	PublicCampaignDto,
	PublicStatsDto,
	ReconciliationRowDto,
} from "@/lib/api/dto";
import { consume } from "./controls";
import { getDb, nextId, saveDb } from "./store";

/**
 * The mock AidTrace backend: the same routes and envelopes `lib/api/endpoints.ts` and `flows.ts` call, answered from
 * the in-browser database. It enforces what the backend and the Soroban contract would: admin-only routes, approval
 * before allocation, the per-beneficiary maximum, available balance, no duplicate payouts, and failed transactions
 * that change no balances.
 */

export interface MockRequest {
	method: string;
	path: string;
	params: Record<string, unknown>;
	body: unknown;
	token: string | null;
}

export interface MockResponse {
	status: number;
	body: unknown;
}

class HttpError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
	) {
		super(message);
	}
}

const ok = (data: unknown, status = 200): MockResponse => ({ status, body: { statusCode: status, message: "OK", data } });
const dec = (stroops: string | bigint) => {
	const d = fromStroops(stroops);
	return d.includes(".") ? d : `${d}.00`;
};
const now = () => new Date().toISOString();

// --- DTO mapping ---------------------------------------------------------------------------------------------------

function totalsDto(db: MockDb, campaignId: string) {
	const t = campaignTotals(db, campaignId);
	return {
		target: dec(t.target),
		raised: dec(t.raised),
		allocated: dec(t.allocated),
		disbursed: dec(t.disbursed),
		available: dec(t.available),
		beneficiariesApproved: t.beneficiariesApproved,
		beneficiariesPaid: t.beneficiariesPaid,
	};
}

function campaignDto(db: MockDb, c: CampaignRow): CampaignDto {
	const org = db.orgs.find((o) => o.id === c.organizationId);
	return {
		id: c.id,
		reference: c.reference,
		title: c.title,
		description: c.description,
		organization: { id: c.organizationId, name: org?.name ?? "", website: org?.website ?? "" },
		category: c.category,
		featured: c.featured,
		adminWallet: c.adminWallet,
		target: dec(c.target),
		maxAllocation: dec(c.maxAllocation),
		beneficiaryTarget: c.beneficiaryTarget,
		eligibility: c.eligibility,
		startsAt: c.startsAt,
		endsAt: c.endsAt,
		status: c.status,
		contractCampaignId: c.contractCampaignId,
		createdAt: c.createdAt,
		totals: totalsDto(db, c.id),
	};
}

function publicCampaignDto(db: MockDb, c: CampaignRow): PublicCampaignDto {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { adminWallet, maxAllocation, contractCampaignId, createdAt, ...rest } = campaignDto(db, c);
	return rest;
}

const allocationDto = (b: BeneficiaryRow): AllocationDto | null =>
	b.allocation && {
		id: b.allocation.id,
		beneficiaryId: b.id,
		campaignId: b.campaignId,
		amount: dec(b.allocation.amount),
		status: b.allocation.status,
		txHash: b.allocation.txHash,
		failureReason: b.allocation.failureReason,
		updatedAt: b.allocation.updatedAt,
	};

const beneficiaryDto = (b: BeneficiaryRow): BeneficiaryDto => ({
	id: b.id,
	reference: b.reference,
	campaignId: b.campaignId,
	name: b.name,
	wallet: b.wallet,
	eligibilityNotes: b.eligibilityNotes,
	evidence: b.evidence.map((e) => ({ id: e.id, name: e.name, contentType: e.contentType, size: e.size, uploadedAt: e.uploadedAt })),
	status: b.status,
	reviewedBy: b.reviewedBy,
	reviewedAt: b.reviewedAt,
	rejectionReason: b.rejectionReason,
	allocation: allocationDto(b),
	createdAt: b.createdAt,
});

const ledgerDto = (r: LedgerRow): LedgerEntryDto => ({
	id: r.id,
	campaignReference: r.campaignReference,
	type: r.type,
	amount: dec(r.amount),
	status: r.status,
	counterpartyRef: r.counterpartyRef,
	txHash: r.txHash,
	timestamp: r.timestamp,
});

function page<T>(items: T[], params: Record<string, unknown>) {
	const limit = Math.min(Number(params.limit ?? 20) || 20, 500);
	const offset = Number(params.offset ?? 0) || 0;
	return { results: items.slice(offset, offset + limit), paginationMeta: { total: items.length, limit, offset } };
}

// --- auth ----------------------------------------------------------------------------------------------------------

const TOKEN_PREFIX = "mock-access.";

function requireAdmin(req: MockRequest) {
	const address = req.token?.startsWith(TOKEN_PREFIX) ? req.token.slice(TOKEN_PREFIX.length) : null;
	if (!address) throw new HttpError(401, "UNAUTHORIZED", "Sign in with the organization administrator wallet to continue.");
	return address;
}

function campaignFor(db: MockDb, id: string, admin: string) {
	const campaign = db.campaigns.find((c) => c.id === id);
	if (!campaign) throw new HttpError(404, "NOT_FOUND", "Campaign not found.");
	if (campaign.adminWallet !== admin) throw new HttpError(403, "FORBIDDEN", "Only this campaign's authorized administrator can do that.");
	return campaign;
}

function beneficiaryIn(db: MockDb, campaign: CampaignRow, id: string) {
	const b = db.beneficiaries.find((x) => x.id === id && x.campaignId === campaign.id);
	if (!b) throw new HttpError(404, "NOT_FOUND", "Beneficiary not found.");
	return b;
}

function notify(db: MockDb, event: string, message: string, campaignId: string | null) {
	db.notifications.unshift({ id: nextId("ntf"), event, message, campaignId, readAt: null, createdAt: now() });
}

// --- on-chain intents (prepare → wallet signs → submit → sync) -------------------------------------------------------

type Intent =
	| { kind: "register"; campaignId: string }
	| { kind: "funding"; campaignId: string; amount: bigint; from: string }
	| { kind: "allocation"; campaignId: string; beneficiaryId: string; amount: bigint }
	| { kind: "cancel"; campaignId: string; beneficiaryId: string }
	| { kind: "payout"; campaignId: string; beneficiaryId: string };

const intents = new Map<string, Intent>();

function prepare(intent: Intent) {
	const id = nextId("intent");
	intents.set(id, intent);
	return ok({ xdr: `MOCK:${id}`, networkPassphrase: "Test SDF Network ; September 2015", intentId: id });
}

function parseAmount(value: unknown) {
	try {
		const stroops = toStroops(String(value ?? ""));
		if (stroops <= 0n) throw new Error();
		return stroops;
	} catch {
		throw new HttpError(400, "INVALID_AMOUNT", "Enter a valid USDC amount greater than 0 (up to 7 decimals).");
	}
}

/** Contract rule checks for an allocation (Deliverable 2). */
function checkAllocation(db: MockDb, campaign: CampaignRow, b: BeneficiaryRow, amount: bigint) {
	if (b.status === "paid" || b.allocation?.status === "confirmed") throw new HttpError(409, "ALREADY_PAID", `${b.reference} has already been paid. Allocations can't change after payout.`);
	if (b.status !== "approved" && b.status !== "allocated") throw new HttpError(422, "NOT_APPROVED", `${b.reference} isn't approved. Only approved beneficiaries can receive allocations.`);
	if (amount > BigInt(campaign.maxAllocation))
		throw new HttpError(422, "EXCEEDS_MAX_ALLOCATION", `The maximum allocation for this campaign is ${dec(campaign.maxAllocation)} USDC per beneficiary.`);
	const t = campaignTotals(db, campaign.id);
	const current = b.allocation && b.allocation.status !== "cancelled" ? BigInt(b.allocation.amount) : 0n;
	if (t.allocated - current + amount > t.available)
		throw new HttpError(422, "INSUFFICIENT_FUNDS", `Not enough unallocated funds. ${dec(t.available - (t.allocated - current))} USDC is available to allocate.`);
}

function checkPayout(db: MockDb, campaign: CampaignRow, b: BeneficiaryRow) {
	if (b.status === "paid" || b.allocation?.status === "confirmed") throw new HttpError(409, "ALREADY_PAID", `${b.reference} has already been paid. Duplicate payouts are blocked by the contract.`);
	if (!b.allocation || b.allocation.status === "cancelled" || b.allocation.status === "pending_allocation") throw new HttpError(422, "NO_ALLOCATION", `${b.reference} has no authorized allocation to pay.`);
	if (b.allocation.status === "processing") throw new HttpError(409, "IN_PROGRESS", `A payout to ${b.reference} is already processing.`);
	const t = campaignTotals(db, campaign.id);
	if (BigInt(b.allocation.amount) > t.available) throw new HttpError(422, "INSUFFICIENT_FUNDS", "The campaign balance can't cover this payout. Fund the campaign first.");
}

function sync(db: MockDb, admin: string, intentId: string, txHash: string): MockResponse {
	const intent = intents.get(intentId);
	if (!intent) throw new HttpError(404, "NOT_FOUND", "This transaction request expired. Start again.");
	intents.delete(intentId);
	const campaign = campaignFor(db, intent.campaignId, admin);
	const failed = consume("failNext");
	const at = now();

	if (intent.kind === "register") {
		if (failed) throw new HttpError(422, "TX_FAILED", "The registration transaction failed on Stellar (simulated). The campaign is still a draft; try again.");
		campaign.status = "active";
		campaign.contractCampaignId = String(db.campaigns.filter((c) => c.contractCampaignId).length + 1);
		notify(db, "campaign_registered", `${campaign.title} is live and registered on Stellar`, campaign.id);
		return ok(campaignDto(db, campaign));
	}

	if (intent.kind === "funding") {
		const row: LedgerRow = {
			id: nextId("tx"),
			campaignId: campaign.id,
			campaignReference: campaign.reference,
			type: "funding",
			amount: intent.amount.toString(),
			status: failed ? "failed" : "confirmed",
			counterpartyRef: "Organization funding",
			txHash,
			timestamp: at,
		};
		db.ledger.unshift(row);
		if (failed) throw new HttpError(422, "TX_FAILED", "The funding transaction failed on Stellar (simulated). Nothing left your wallet and the campaign balance is unchanged.");
		notify(db, "funding_confirmed", `${dec(intent.amount)} USDC funding confirmed for ${campaign.title}`, campaign.id);
		const t = campaignTotals(db, campaign.id);
		if (campaign.status === "active" && t.raised >= t.target) campaign.status = "funded";
		return ok(campaignDto(db, campaign));
	}

	const b = beneficiaryIn(db, campaign, intent.beneficiaryId);

	if (intent.kind === "allocation") {
		if (failed) throw new HttpError(422, "TX_FAILED", `The allocation for ${b.reference} failed on Stellar (simulated). Nothing changed.`);
		checkAllocation(db, campaign, b, intent.amount);
		b.allocation = { id: b.allocation?.id ?? nextId("alloc"), amount: intent.amount.toString(), status: "ready", txHash: null, failureReason: null, updatedAt: at };
		b.status = "allocated";
		return ok(beneficiaryDto(b));
	}

	if (intent.kind === "cancel") {
		if (failed) throw new HttpError(422, "TX_FAILED", "Cancelling the allocation failed on Stellar (simulated). It is unchanged.");
		if (!b.allocation || b.allocation.status === "confirmed") throw new HttpError(409, "ALREADY_PAID", "Paid allocations can't be cancelled.");
		b.allocation = { ...b.allocation, status: "cancelled", updatedAt: at };
		b.status = "approved";
		return ok(beneficiaryDto(b));
	}

	// payout
	checkPayout(db, campaign, b);
	const allocation = b.allocation!;
	db.ledger.unshift({
		id: nextId("tx"),
		campaignId: campaign.id,
		campaignReference: campaign.reference,
		type: "disbursement",
		amount: allocation.amount,
		status: failed ? "failed" : "confirmed",
		counterpartyRef: b.reference,
		txHash,
		timestamp: at,
	});
	if (failed) {
		b.allocation = { ...allocation, status: "failed", txHash, failureReason: "The transaction failed on Stellar (simulated). No funds left the campaign; retry the payout.", updatedAt: at };
		notify(db, "payout_failed", `Payout to ${b.reference} failed. No funds were deducted.`, campaign.id);
		throw new HttpError(422, "TX_FAILED", `The payout to ${b.reference} failed on Stellar (simulated). No funds were deducted from the campaign.`);
	}
	b.allocation = { ...allocation, status: "confirmed", txHash, failureReason: null, updatedAt: at };
	b.status = "paid";
	notify(db, "payout_confirmed", `${dec(allocation.amount)} USDC paid to ${b.reference}`, campaign.id);
	return ok(beneficiaryDto(b));
}

// --- request parsing -------------------------------------------------------------------------------------------------

type Form = { name: string; wallet: string; eligibilityNotes: string; evidence: { name: string; type: string; size: number }[] };

function readForm(body: unknown): Form {
	if (typeof FormData !== "undefined" && body instanceof FormData) {
		const files = body.getAll("evidence").filter((f): f is File => typeof f !== "string");
		return {
			name: String(body.get("name") ?? ""),
			wallet: String(body.get("wallet") ?? ""),
			eligibilityNotes: String(body.get("eligibilityNotes") ?? ""),
			evidence: files.map((f) => ({ name: f.name, type: f.type || "application/octet-stream", size: f.size })),
		};
	}
	const b = (body ?? {}) as Partial<Form>;
	return { name: b.name ?? "", wallet: b.wallet ?? "", eligibilityNotes: b.eligibilityNotes ?? "", evidence: [] };
}

function addBeneficiary(db: MockDb, campaign: CampaignRow, form: Form) {
	if (form.name.trim().length < 2 || form.eligibilityNotes.trim().length < 10) throw new HttpError(400, "VALIDATION", "Name and eligibility details are required.");
	if (!/^G[A-Z2-7]{55}$/.test(form.wallet.trim())) throw new HttpError(400, "INVALID_WALLET", "Enter a valid Stellar account address (starts with G).");
	if (db.beneficiaries.some((b) => b.campaignId === campaign.id && b.wallet === form.wallet.trim()))
		throw new HttpError(409, "DUPLICATE_WALLET", "This wallet is already registered for this campaign.");
	db.counters.beneficiary++;
	const at = now();
	const row: BeneficiaryRow = {
		id: nextId("ben"),
		reference: `BNF-${db.counters.beneficiary.toString().padStart(5, "0")}`,
		campaignId: campaign.id,
		name: form.name.trim(),
		wallet: form.wallet.trim(),
		eligibilityNotes: form.eligibilityNotes.trim(),
		evidence: form.evidence.map((f) => ({ id: nextId("ev"), name: f.name, contentType: f.type, size: f.size, uploadedAt: at })),
		status: "registered",
		reviewedBy: null,
		reviewedAt: null,
		rejectionReason: null,
		allocation: null,
		createdAt: at,
	};
	db.beneficiaries.unshift(row);
	return row;
}

const includes = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle.toLowerCase());
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

// --- router --------------------------------------------------------------------------------------------------------

type Handler = (req: MockRequest, m: string[], db: MockDb) => MockResponse;

const routes: [string, RegExp, Handler][] = [
	// Public
	[
		"GET",
		/^\/public\/stats$/,
		(_r, _m, db) => {
			const s = platformStats(db);
			const dto: PublicStatsDto = {
				campaigns: s.campaigns,
				activeCampaigns: s.activeCampaigns,
				target: dec(s.target),
				raised: dec(s.raised),
				disbursed: dec(s.disbursed),
				beneficiariesApproved: s.beneficiariesApproved,
				beneficiariesPaid: s.beneficiariesPaid,
			};
			return ok(dto);
		},
	],
	[
		"GET",
		/^\/public\/campaigns$/,
		(req, _m, db) => {
			const q = str(req.params.q);
			const status = str(req.params.status);
			let list = db.campaigns.filter((c) => c.status !== "draft");
			if (req.params.featured === true || req.params.featured === "true") list = list.filter((c) => c.featured);
			if (status) list = list.filter((c) => c.status === status);
			if (q) list = list.filter((c) => includes(`${c.title} ${c.reference} ${c.description}`, q));
			return ok(page(list.map((c) => publicCampaignDto(db, c)), req.params));
		},
	],
	[
		"GET",
		/^\/public\/campaigns\/([^/]+)$/,
		(_r, [ref], db) => {
			const c = db.campaigns.find((x) => x.reference === decodeURIComponent(ref!) && x.status !== "draft");
			if (!c) throw new HttpError(404, "NOT_FOUND", "We couldn't find a public campaign with that reference.");
			return ok(publicCampaignDto(db, c));
		},
	],
	[
		"POST",
		/^\/public\/campaigns\/([^/]+)\/applications$/,
		(req, [ref], db) => {
			const c = db.campaigns.find((x) => x.reference === decodeURIComponent(ref!));
			if (!c || c.status !== "active") throw new HttpError(422, "CLOSED", "This campaign isn't accepting applications.");
			const row = addBeneficiary(db, c, readForm(req.body));
			notify(db, "application_received", `New beneficiary application ${row.reference} for ${c.title}`, c.id);
			return ok({ reference: row.reference }, 201);
		},
	],
	[
		"GET",
		/^\/public\/ledger$/,
		(req, _m, db) => {
			const { campaign, type, status, q, from, to } = req.params as Record<string, string | undefined>;
			let list = db.ledger;
			if (campaign) list = list.filter((r) => r.campaignReference === campaign);
			if (type) list = list.filter((r) => r.type === type);
			if (status) list = list.filter((r) => r.status === status);
			if (from) list = list.filter((r) => r.timestamp >= from);
			if (to) list = list.filter((r) => r.timestamp <= to);
			if (q) list = list.filter((r) => includes(`${r.txHash} ${r.campaignReference} ${r.counterpartyRef}`, q));
			return ok(page(list.map(ledgerDto), req.params));
		},
	],

	// Auth
	["POST", /^\/auth\/challenge$/, () => ok({ nonce: nextId("nonce"), message: `AidTrace sign-in\nNonce: ${Date.now()}\nNetwork: Stellar Testnet` })],
	[
		"POST",
		/^\/auth\/login$/,
		(req) => {
			const { address } = (req.body ?? {}) as { address?: string };
			if (!address) throw new HttpError(400, "VALIDATION", "Missing address.");
			return ok({ accessToken: `${TOKEN_PREFIX}${address}`, refreshToken: `mock-refresh.${address}.${Date.now()}` });
		},
	],
	[
		"POST",
		/^\/auth\/refresh$/,
		(req) => {
			const { refreshToken } = (req.body ?? {}) as { refreshToken?: string };
			const address = refreshToken?.split(".")[1];
			if (!address) throw new HttpError(401, "UNAUTHORIZED", "Session expired.");
			return ok({ accessToken: `${TOKEN_PREFIX}${address}`, refreshToken: `mock-refresh.${address}.${Date.now()}` });
		},
	],
	["POST", /^\/auth\/logout$/, () => ok(null)],
	[
		"GET",
		/^\/auth\/me$/,
		(req, _m, db) => {
			const address = requireAdmin(req);
			return ok({ address, role: "org_admin", organizationId: db.orgs.find((o) => o.adminWallet === address)?.id ?? null });
		},
	],

	// Organizations
	[
		"GET",
		/^\/organizations\/me$/,
		(req, _m, db) => {
			const address = requireAdmin(req);
			const org = db.orgs.find((o) => o.adminWallet === address);
			return ok(org ? ({ id: org.id, name: org.name, website: org.website, adminWallet: org.adminWallet, createdAt: org.createdAt } satisfies OrganizationDto) : null);
		},
	],

	// Campaigns (admin)
	[
		"GET",
		/^\/campaigns$/,
		(req, _m, db) => {
			const admin = requireAdmin(req);
			const status = str(req.params.status);
			let list = db.campaigns.filter((c) => c.adminWallet === admin);
			if (status) list = list.filter((c) => c.status === status);
			return ok(page(list.map((c) => campaignDto(db, c)), req.params));
		},
	],
	[
		"POST",
		/^\/campaigns$/,
		(req, _m, db) => {
			const admin = requireAdmin(req);
			const b = (req.body ?? {}) as Record<string, unknown>;
			const title = String(b.title ?? "").trim();
			if (title.length < 3) throw new HttpError(400, "VALIDATION", "Give the campaign a title.");
			const target = parseAmount(b.target);
			const maxAllocation = parseAmount(b.maxAllocation);
			const orgName = String(b.organizationName ?? "").trim() || "Your organization";
			let org = db.orgs.find((o) => o.adminWallet === admin && o.name === orgName);
			if (!org) {
				org = { id: nextId("org"), name: orgName, website: String(b.organizationWebsite ?? ""), adminWallet: admin, createdAt: now() };
				db.orgs.push(org);
			}
			db.counters.campaign++;
			const year = new Date().getUTCFullYear();
			const row: CampaignRow = {
				id: nextId("cmp"),
				reference: `CMP-${year}-${db.counters.campaign.toString().padStart(3, "0")}`,
				title,
				description: String(b.description ?? ""),
				category: (["water", "food", "education", "health"].includes(String(b.category)) ? b.category : "water") as CampaignRow["category"],
				organizationId: org.id,
				adminWallet: admin,
				target: target.toString(),
				maxAllocation: maxAllocation.toString(),
				beneficiaryTarget: Number(b.beneficiaryTarget) || 1,
				eligibility: Array.isArray(b.eligibility) ? (b.eligibility as string[]) : [],
				startsAt: new Date(String(b.startsAt)).toISOString(),
				endsAt: new Date(String(b.endsAt)).toISOString(),
				status: "draft",
				contractCampaignId: null,
				featured: false,
				createdAt: now(),
			};
			db.campaigns.unshift(row);
			return ok(campaignDto(db, row), 201);
		},
	],
	["GET", /^\/campaigns\/([^/]+)$/, (req, [id], db) => ok(campaignDto(db, campaignFor(db, id!, requireAdmin(req))))],
	[
		"PATCH",
		/^\/campaigns\/([^/]+)$/,
		(req, [id], db) => {
			const c = campaignFor(db, id!, requireAdmin(req));
			const b = (req.body ?? {}) as Partial<CampaignRow>;
			if (b.title) c.title = b.title;
			if (b.description) c.description = b.description;
			if (b.eligibility) c.eligibility = b.eligibility;
			if (b.endsAt) c.endsAt = new Date(b.endsAt).toISOString();
			return ok(campaignDto(db, c));
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/register$/,
		(req, [id], db) => {
			const c = campaignFor(db, id!, requireAdmin(req));
			if (c.status !== "draft") throw new HttpError(409, "ALREADY_REGISTERED", "This campaign is already registered on chain.");
			return prepare({ kind: "register", campaignId: c.id });
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/funding$/,
		(req, [id], db) => {
			const admin = requireAdmin(req);
			const c = campaignFor(db, id!, admin);
			if (c.status === "closed" || c.status === "cancelled" || c.status === "draft") throw new HttpError(422, "CLOSED", "Only active campaigns can be funded.");
			const amount = parseAmount((req.body as { amount?: string })?.amount);
			if (amount > BigInt(walletUsdc(db))) throw new HttpError(422, "INSUFFICIENT_WALLET_BALANCE", "Your wallet doesn't hold enough Testnet USDC for this amount.");
			return prepare({ kind: "funding", campaignId: c.id, amount, from: admin });
		},
	],
	[
		"GET",
		/^\/campaigns\/([^/]+)\/beneficiaries$/,
		(req, [id], db) => {
			const c = campaignFor(db, id!, requireAdmin(req));
			const status = str(req.params.status);
			const q = str(req.params.q);
			let list = db.beneficiaries.filter((b) => b.campaignId === c.id);
			if (status) list = list.filter((b) => status.split(",").includes(b.status));
			if (q) list = list.filter((b) => includes(`${b.reference} ${b.name} ${b.wallet}`, q));
			// Work first: applications waiting for review, then approved / allocated, then settled records; newest first.
			const rank: Record<string, number> = { registered: 0, under_review: 1, approved: 2, allocated: 3, paid: 4, rejected: 5 };
			list = [...list].sort((a, b) => rank[a.status]! - rank[b.status]! || b.createdAt.localeCompare(a.createdAt));
			return ok(page(list.map(beneficiaryDto), req.params));
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/beneficiaries$/,
		(req, [id], db) => {
			const c = campaignFor(db, id!, requireAdmin(req));
			return ok(beneficiaryDto(addBeneficiary(db, c, readForm(req.body))), 201);
		},
	],
	["GET", /^\/campaigns\/([^/]+)\/beneficiaries\/([^/]+)$/, (req, [id, bid], db) => ok(beneficiaryDto(beneficiaryIn(db, campaignFor(db, id!, requireAdmin(req)), bid!)))],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/beneficiaries\/([^/]+)\/review$/,
		(req, [id, bid], db) => {
			const admin = requireAdmin(req);
			const b = beneficiaryIn(db, campaignFor(db, id!, admin), bid!);
			const review = (req.body ?? {}) as { decision?: string; reason?: string };
			if (!["registered", "under_review"].includes(b.status)) throw new HttpError(409, "ALREADY_REVIEWED", `${b.reference} has already been ${b.status.replace("_", " ")}.`);
			if (review.decision === "rejected" && !review.reason?.trim()) throw new HttpError(400, "VALIDATION", "Give a reason for the rejection.");
			if (review.decision === "under_review") b.status = "under_review";
			else if (review.decision === "approved") {
				b.status = "approved";
				b.reviewedBy = admin;
				b.reviewedAt = now();
			} else if (review.decision === "rejected") {
				b.status = "rejected";
				b.reviewedBy = admin;
				b.reviewedAt = now();
				b.rejectionReason = review.reason!.trim();
			} else throw new HttpError(400, "VALIDATION", "Unknown decision.");
			return ok(beneficiaryDto(b));
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/beneficiaries\/([^/]+)\/allocation$/,
		(req, [id, bid], db) => {
			const c = campaignFor(db, id!, requireAdmin(req));
			const b = beneficiaryIn(db, c, bid!);
			const amount = parseAmount((req.body as { amount?: string })?.amount);
			checkAllocation(db, c, b, amount);
			return prepare({ kind: "allocation", campaignId: c.id, beneficiaryId: b.id, amount });
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/beneficiaries\/([^/]+)\/allocation\/cancel$/,
		(req, [id, bid], db) => {
			const c = campaignFor(db, id!, requireAdmin(req));
			const b = beneficiaryIn(db, c, bid!);
			if (!b.allocation || b.allocation.status === "confirmed" || b.allocation.status === "cancelled") throw new HttpError(409, "NOT_CANCELLABLE", "Only unpaid allocations can be cancelled.");
			return prepare({ kind: "cancel", campaignId: c.id, beneficiaryId: b.id });
		},
	],
	[
		"POST",
		/^\/campaigns\/([^/]+)\/beneficiaries\/([^/]+)\/payout$/,
		(req, [id, bid], db) => {
			const c = campaignFor(db, id!, requireAdmin(req));
			const b = beneficiaryIn(db, c, bid!);
			checkPayout(db, c, b);
			return prepare({ kind: "payout", campaignId: c.id, beneficiaryId: b.id });
		},
	],
	[
		"GET",
		/^\/campaigns\/([^/]+)\/reconciliation$/,
		(req, [id], db) => {
			const c = campaignFor(db, id!, requireAdmin(req));
			const rows: ReconciliationRowDto[] = db.beneficiaries
				.filter((b) => b.campaignId === c.id && b.allocation && b.allocation.status !== "cancelled")
				.map((b) => {
					const paid = db.ledger
						.filter((r) => r.campaignId === c.id && r.type === "disbursement" && r.status === "confirmed" && r.counterpartyRef === b.reference)
						.reduce((sum, r) => sum + BigInt(r.amount), 0n);
					const allocated = BigInt(b.allocation!.amount);
					const confirmed = b.allocation!.status === "confirmed";
					return { beneficiaryReference: b.reference, allocated: dec(allocated), paid: dec(paid), txHash: confirmed ? b.allocation!.txHash : null, matched: confirmed ? paid === allocated : paid === 0n };
				});
			return ok(rows);
		},
	],

	// Notifications + wallet
	[
		"GET",
		/^\/notifications$/,
		(req, _m, db) => {
			requireAdmin(req);
			const list: NotificationDto[] = db.notifications.map((n) => ({ ...n, campaignReference: db.campaigns.find((c) => c.id === n.campaignId)?.reference ?? null }));
			return ok(page(list, req.params));
		},
	],
	["GET", /^\/notifications\/unread-count$/, (req, _m, db) => (requireAdmin(req), ok({ count: db.notifications.filter((n) => !n.readAt).length }))],
	[
		"POST",
		/^\/notifications\/read-all$/,
		(req, _m, db) => {
			requireAdmin(req);
			const at = now();
			for (const n of db.notifications) n.readAt ??= at;
			return ok(null);
		},
	],
	[
		"GET",
		/^\/stellar\/balances$/,
		(req, _m, db) => {
			const address = requireAdmin(req);
			return ok({ address, funded: true, balances: [{ code: "XLM", balance: "9984.3500000" }, { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", balance: fromStroops(walletUsdc(db)) }] });
		},
	],
];

/** The demo administrator wallet's Testnet USDC: 250,000 minus what it has funded campaigns with. */
function walletUsdc(db: MockDb) {
	const spent = db.ledger.filter((r) => r.type === "funding" && r.status === "confirmed" && r.counterpartyRef === "Organization funding").reduce((s, r) => s + BigInt(r.amount), 0n);
	return (250_000n * 10_000_000n - spent).toString();
}

/** Answers one request. Sync calls (`…/sync`) run the prepared intent. */
export function handle(req: MockRequest): MockResponse {
	const db = getDb();
	try {
		if (req.method === "POST" && req.path.endsWith("/sync")) {
			const admin = requireAdmin(req);
			const { intentId, txHash } = (req.body ?? {}) as { intentId?: string; txHash?: string };
			const res = sync(db, admin, String(intentId), txHash ?? mockTxHash(String(intentId)));
			saveDb();
			return res;
		}
		for (const [method, pattern, handler] of routes) {
			if (method !== req.method) continue;
			const match = req.path.match(pattern);
			if (!match) continue;
			const res = handler(req, match.slice(1), db);
			if (method !== "GET") saveDb();
			return res;
		}
		throw new HttpError(404, "NOT_FOUND", `No mock route for ${req.method} ${req.path}`);
	} catch (error) {
		saveDb(); // failures still record what happened (failed ledger rows, failed allocations)
		if (error instanceof HttpError) return { status: error.status, body: { statusCode: error.status, code: error.code, message: error.message, requestId: `mock-${Date.now().toString(36)}` } };
		throw error;
	}
}

export { DEMO_ADMIN_WALLET };
