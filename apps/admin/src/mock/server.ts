"use client";

import { campaignTotals, DEMO_PLATFORM_WALLET, LIVE_ALLOCATION, mockTxHash, type CampaignRow } from "@repo/mock/seed";
import { explorer, NETWORK_PASSPHRASE } from "@repo/stellar/network";
import { fromStroops } from "@repo/stellar/format";
import { getDb, saveDb, type AdminDb } from "./store";
import type { TxRow, UserRow } from "./state";

/**
 * The mock of the backend's `/admin/*` API (and the wallet sign-in it needs), answered from the console's own
 * in-browser database. Same envelopes, paging and error format as the real API. Only DEMO_PLATFORM_WALLET is in
 * "ADMIN_WALLETS"; any other wallet signs in but gets 403 on `/admin/*`. Response bodies follow the PROVISIONAL shapes
 * in `lib/api/dto.ts`. No route reveals beneficiary names, contacts or evidence.
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

const ok = (data: unknown, message = "OK", status = 200): MockResponse => ({
	status,
	body: { statusCode: status, message, data },
});
const now = () => new Date().toISOString();
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const dec = (stroops: string | bigint | null) => (stroops === null ? null : fromStroops(stroops));
const has = (text: string | null | undefined, q: string) => !!text && text.toLowerCase().includes(q.toLowerCase());

function page<T>(items: T[], params: Record<string, unknown>) {
	const limit = Math.max(1, Math.min(Number(params.limit ?? 20) || 20, 100));
	const offset = Math.max(0, Number(params.offset ?? 0) || 0);
	const result = items.slice(offset, offset + limit);
	return {
		result,
		paginationMeta: {
			nextPage: offset + limit < items.length,
			previousPage: offset > 0,
			currentPage: Math.floor(offset / limit) + 1,
			totalPage: Math.ceil(items.length / limit),
			totalCount: items.length,
			pageCount: result.length,
		},
	};
}

function oneOf(value: unknown, field: string, allowed: readonly string[]) {
	const v = str(value);
	if (v && !allowed.includes(v))
		throw new HttpError(400, "VALIDATION_FAILED", "Check the highlighted fields.", [
			{ field, message: `${field} must be one of: ${allowed.join(", ")}` },
		]);
	return v;
}

const token = (db: AdminDb, wallet: string, kind: string) => {
	const t = `${kind}.${wallet.slice(0, 6)}.${(db.admin.counter++).toString(36)}${Math.random().toString(36).slice(2, 8)}`;
	db.admin.sessions[t] = wallet;
	return t;
};

function userFor(db: AdminDb, wallet: string): UserRow {
	let user = db.admin.users.find((u) => u.walletAddress === wallet);
	if (!user) {
		user = {
			id: `usr_${(db.admin.counter++).toString(36).padStart(6, "0")}`,
			walletAddress: wallet,
			status: "active",
			organizationId: db.seed.orgs.find((o) => o.adminWallet === wallet)?.id ?? null,
			platformAdmin: wallet === DEMO_PLATFORM_WALLET,
			suspendedReason: null,
			suspendedAt: null,
			lastSignInAt: null,
			createdAt: now(),
		};
		db.admin.users.unshift(user);
	}
	return user;
}

function signedIn(db: AdminDb, req: MockRequest) {
	const wallet = req.token && req.token.startsWith("access.") ? db.admin.sessions[req.token] : undefined;
	if (!wallet) throw new HttpError(401, "UNAUTHORIZED", "Sign in again.");
	return userFor(db, wallet);
}

function platformAdmin(db: AdminDb, req: MockRequest) {
	const user = signedIn(db, req);
	if (!user.platformAdmin || user.status !== "active")
		throw new HttpError(403, "FORBIDDEN", "This wallet isn't a platform administrator.");
	return user;
}

function audit(db: AdminDb, actor: UserRow, action: string, target: string, details: string | null = null) {
	db.admin.audit.unshift({
		id: `aud_${(db.admin.counter++).toString(36).padStart(6, "0")}`,
		action,
		actorWallet: actor.walletAddress,
		target,
		details,
		createdAt: now(),
	});
}

// --- views ---------------------------------------------------------------------------------------------------------

const orgName = (db: AdminDb, id: string | null) => db.seed.orgs.find((o) => o.id === id)?.name ?? null;

const userDto = (db: AdminDb, u: UserRow) => ({
	id: u.id,
	walletAddress: u.walletAddress,
	status: u.status,
	roles: { organizationAdmin: !!u.organizationId, platformAdmin: u.platformAdmin },
	organization: u.organizationId ? { id: u.organizationId, name: orgName(db, u.organizationId) } : null,
	suspendedReason: u.suspendedReason,
	suspendedAt: u.suspendedAt,
	lastSignInAt: u.lastSignInAt,
	createdAt: u.createdAt,
});

function totalsDto(db: AdminDb, reference: string) {
	const t = campaignTotals(db.seed, reference);
	return {
		target: dec(t.target),
		raised: dec(t.raised),
		allocated: dec(t.allocated),
		disbursed: dec(t.disbursed),
		recovered: dec(t.recovered),
		available: dec(t.available),
		beneficiariesApproved: t.beneficiariesApproved,
		beneficiariesPaid: t.beneficiariesPaid,
	};
}

const campaignDto = (db: AdminDb, c: CampaignRow) => ({
	reference: c.reference,
	title: c.title,
	status: c.status,
	featured: c.featured,
	category: c.category,
	organization: { id: c.organizationId, name: orgName(db, c.organizationId) },
	adminWallet: c.adminWallet,
	targetAmount: dec(c.target),
	totals: totalsDto(db, c.reference),
	startsAt: c.startsAt,
	endsAt: c.endsAt,
	createdAt: c.createdAt,
});

const txDto = (t: TxRow) => ({
	id: t.id,
	kind: t.kind,
	status: t.status,
	campaignReference: t.campaignReference,
	amount: dec(t.amount),
	transactionHash: t.status === "prepared" ? null : t.hash,
	explorerUrl: t.ledger ? explorer.tx(t.hash) : null,
	ledger: t.ledger,
	failureCode: t.failureCode,
	createdAt: t.createdAt,
	submittedAt: t.submittedAt,
	confirmedAt: t.confirmedAt,
	checkedAt: t.checkedAt,
});

function escrowBalances(db: AdminDb) {
	const rows: Record<string, unknown>[] = [];
	for (const c of db.seed.campaigns) {
		if (c.status === "draft") continue;
		const t = campaignTotals(db.seed, c.reference);
		const locked = db.seed.allocations
			.filter((a) => a.campaignReference === c.reference && (a.status === "ready" || a.status === "processing"))
			.reduce((sum, a) => sum + BigInt(a.amount), 0n);
		rows.push({
			id: `cb_pool_${c.reference}`,
			balanceId: `00000000${mockTxHash(`pool-${c.reference}`)}`,
			kind: "pool",
			status: "open",
			campaignReference: c.reference,
			allocationReference: null,
			amount: dec(t.available - locked > 0n ? t.available - locked : 0n),
			createdAt: c.startsAt,
			claimedAt: null,
		});
	}
	for (const a of db.seed.allocations) {
		if (a.status !== "ready" && a.status !== "processing" && a.status !== "confirmed") continue;
		rows.push({
			id: `cb_${a.id}`,
			balanceId: `00000000${mockTxHash(`alloc-${a.id}`)}`,
			kind: "allocation",
			status: a.status === "confirmed" ? "claimed" : "open",
			campaignReference: a.campaignReference,
			allocationReference: a.reference,
			amount: dec(a.amount),
			createdAt: a.createdAt,
			claimedAt: a.paidAt,
		});
	}
	return rows;
}

// --- routes --------------------------------------------------------------------------------------------------------

type Handler = (req: MockRequest, match: string[], db: AdminDb) => MockResponse;

const routes: [string, RegExp, Handler][] = [
	// Wallet sign-in (documented flow): challenge → sign → verify.
	[
		"POST",
		/^\/auth\/challenge$/,
		(req, _m, db) => {
			const address = str((req.body as { address?: string })?.address);
			if (!address || !/^G[A-Z2-7]{55}$/.test(address))
				throw new HttpError(400, "VALIDATION_FAILED", "Enter a valid Stellar address.", [
					{ field: "address", message: "Enter a valid Stellar address." },
				]);
			const challengeId = `chl_${(db.admin.counter++).toString(36)}`;
			const transaction = `MOCK-CHALLENGE-${challengeId}-${address}`;
			db.admin.challenges[challengeId] = { address, transaction };
			return ok(
				{
					challengeId,
					transaction,
					networkPassphrase: NETWORK_PASSPHRASE,
					expiresAt: new Date(Date.now() + 300_000).toISOString(),
				},
				"Challenge",
			);
		},
	],
	[
		"POST",
		/^\/auth\/verify$/,
		(req, _m, db) => {
			const body = (req.body ?? {}) as { challengeId?: string; signedTransaction?: string };
			const challenge = body.challengeId ? db.admin.challenges[body.challengeId] : undefined;
			if (!challenge) throw new HttpError(400, "CHALLENGE_EXPIRED", "That sign-in request expired. Try again.");
			delete db.admin.challenges[body.challengeId!];
			if (body.signedTransaction !== `SIGNED:${challenge.transaction}`)
				throw new HttpError(400, "INVALID_SIGNATURE", "The signature doesn't match this wallet.");
			const isNew = !db.admin.users.some((u) => u.walletAddress === challenge.address);
			const user = userFor(db, challenge.address);
			if (user.status === "suspended") throw new HttpError(403, "USER_SUSPENDED", "This account is suspended.");
			user.lastSignInAt = now();
			return ok(
				{
					accessToken: token(db, user.walletAddress, "access"),
					refreshToken: token(db, user.walletAddress, "refresh"),
					tokenType: "Bearer",
					expiresIn: 900,
					newAccount: isNew,
				},
				"Signed in",
			);
		},
	],
	[
		"POST",
		/^\/auth\/refresh$/,
		(req, _m, db) => {
			const refreshToken = str((req.body as { refreshToken?: string })?.refreshToken);
			const wallet = refreshToken?.startsWith("refresh.") ? db.admin.sessions[refreshToken] : undefined;
			if (!wallet) throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Sign in again.");
			delete db.admin.sessions[refreshToken!];
			return ok(
				{
					accessToken: token(db, wallet, "access"),
					refreshToken: token(db, wallet, "refresh"),
					tokenType: "Bearer",
					expiresIn: 900,
				},
				"Refreshed",
			);
		},
	],
	[
		"POST",
		/^\/auth\/logout$/,
		(req, _m, db) => {
			const refreshToken = str((req.body as { refreshToken?: string })?.refreshToken);
			if (refreshToken) delete db.admin.sessions[refreshToken];
			return ok(null, "Signed out");
		},
	],
	[
		"GET",
		/^\/auth\/me$/,
		(req, _m, db) => {
			const u = signedIn(db, req);
			return ok({
				id: u.id,
				walletAddress: u.walletAddress,
				shortAddress: `${u.walletAddress.slice(0, 4)}…${u.walletAddress.slice(-4)}`,
				roles: { organizationAdmin: !!u.organizationId, platformAdmin: u.platformAdmin },
				organization: u.organizationId ? { id: u.organizationId, name: orgName(db, u.organizationId) } : null,
				createdAt: u.createdAt,
			});
		},
	],

	// --- /admin
	["GET", /^\/admin\/me$/, (req, _m, db) => ok(userDto(db, platformAdmin(db, req)), "Admin access confirmed")],
	[
		"GET",
		/^\/admin\/overview$/,
		(req, _m, db) => {
			platformAdmin(db, req);
			const c = db.seed.campaigns;
			let raised = 0n,
				allocated = 0n,
				disbursed = 0n,
				recovered = 0n;
			for (const x of c) {
				const t = campaignTotals(db.seed, x.reference);
				raised += t.raised;
				allocated += t.allocated;
				disbursed += t.disbursed;
				recovered += t.recovered;
			}
			const count = (s: string) => c.filter((x) => x.status === s).length;
			return ok(
				{
					users: { total: db.admin.users.length, suspended: db.admin.users.filter((u) => u.status === "suspended").length },
					organizations: db.seed.orgs.length,
					campaigns: {
						total: c.length,
						draft: count("draft"),
						active: count("active"),
						closed: count("closed"),
						cancelled: count("cancelled"),
					},
					beneficiaries: {
						total: db.seed.beneficiaries.length,
						approved: db.seed.beneficiaries.filter((b) => b.status === "approved").length,
					},
					funds: { raised: dec(raised), allocated: dec(allocated), disbursed: dec(disbursed), recovered: dec(recovered) },
					transactions: {
						pending: db.admin.transactions.filter((t) => t.status === "pending").length,
						failed: db.admin.transactions.filter((t) => t.status === "failed").length,
					},
					openIssues: db.admin.issues.filter((i) => i.status === "open").length,
				},
				"Overview",
			);
		},
	],
	[
		"GET",
		/^\/admin\/system$/,
		(req, _m, db) => {
			platformAdmin(db, req);
			return ok(
				{
					status: "ok",
					checkedAt: now(),
					database: { status: "up", latencyMs: 4 },
					horizon: { status: "up", latestLedger: 1_284_311 + db.admin.counter },
					arbiter: {
						status: "ok",
						address: "GARBITERMOCKMOCKMOCKMOCKMOCKMOCKMOCKMOCKMOCKMOCKMOCKMOCK",
						xlmBalance: "9874.2210000",
					},
					worker: {
						status: "running",
						lastRunAt: db.admin.sweeper.lastRunAt,
						pendingJobs: db.admin.transactions.filter((t) => t.status === "pending").length,
					},
				},
				"System status",
			);
		},
	],
	[
		"GET",
		/^\/admin\/integrity$/,
		(req, _m, db) => {
			platformAdmin(db, req);
			const critical = db.admin.issues.filter((i) => i.status === "open" && i.type === "unexpected_claim").length;
			const open = db.admin.issues.filter((i) => i.status === "open").length;
			return ok(
				{
					healthy: open === 0,
					checkedAt: now(),
					checks: [
						{ name: "Escrow balances match recorded funds", ok: true },
						{ name: "Every paid allocation has one confirmed payout", ok: true },
						{ name: "No unexpected claims", ok: critical === 0, detail: critical ? `${critical} open` : null },
					],
					openIssues: open,
				},
				"Integrity check",
			);
		},
	],
	[
		"GET",
		/^\/admin\/users$/,
		(req, _m, db) => {
			platformAdmin(db, req);
			const q = str(req.params.search);
			const status = oneOf(req.params.status, "status", ["active", "suspended"]);
			let list = db.admin.users;
			if (status) list = list.filter((u) => u.status === status);
			if (q) list = list.filter((u) => u.walletAddress.startsWith(q.toUpperCase()) || has(orgName(db, u.organizationId), q));
			return ok(
				page(
					list.map((u) => userDto(db, u)),
					req.params,
				),
				"Users",
			);
		},
	],
	[
		"GET",
		/^\/admin\/users\/([^/]+)$/,
		(req, [id], db) => {
			platformAdmin(db, req);
			const u = db.admin.users.find((x) => x.id === id);
			if (!u) throw new HttpError(404, "USER_NOT_FOUND", "We couldn't find that user.");
			const campaigns = db.seed.campaigns.filter((c) => c.adminWallet === u.walletAddress).map((c) => c.reference);
			return ok({ ...userDto(db, u), campaigns }, "User");
		},
	],
	[
		"POST",
		/^\/admin\/users\/([^/]+)\/suspend$/,
		(req, [id], db) => {
			const me = platformAdmin(db, req);
			const reason = str((req.body as { reason?: string })?.reason);
			if (!reason)
				throw new HttpError(400, "VALIDATION_FAILED", "Give a reason.", [{ field: "reason", message: "Give a reason." }]);
			const u = db.admin.users.find((x) => x.id === id);
			if (!u) throw new HttpError(404, "USER_NOT_FOUND", "We couldn't find that user.");
			if (u.id === me.id) throw new HttpError(400, "CANNOT_SUSPEND_SELF", "You can't suspend your own account.");
			if (u.platformAdmin) throw new HttpError(400, "CANNOT_SUSPEND_ADMIN", "Platform administrators can't be suspended here.");
			u.status = "suspended";
			u.suspendedReason = reason;
			u.suspendedAt = now();
			for (const [t, w] of Object.entries(db.admin.sessions)) if (w === u.walletAddress) delete db.admin.sessions[t];
			audit(db, me, "user.suspended", u.walletAddress, reason);
			return ok(userDto(db, u), "User suspended");
		},
	],
	[
		"POST",
		/^\/admin\/users\/([^/]+)\/reactivate$/,
		(req, [id], db) => {
			const me = platformAdmin(db, req);
			const u = db.admin.users.find((x) => x.id === id);
			if (!u) throw new HttpError(404, "USER_NOT_FOUND", "We couldn't find that user.");
			u.status = "active";
			u.suspendedReason = null;
			u.suspendedAt = null;
			audit(db, me, "user.reactivated", u.walletAddress);
			return ok(userDto(db, u), "User reactivated");
		},
	],
	[
		"GET",
		/^\/admin\/organizations$/,
		(req, _m, db) => {
			platformAdmin(db, req);
			const q = str(req.params.search);
			let list = db.seed.orgs;
			if (q) list = list.filter((o) => has(o.name, q) || o.adminWallet.startsWith(q.toUpperCase()));
			return ok(
				page(
					list.map((o) => ({
						id: o.id,
						name: o.name,
						websiteUrl: o.websiteUrl,
						adminWallet: o.adminWallet,
						campaigns: db.seed.campaigns.filter((c) => c.organizationId === o.id).length,
						createdAt: o.createdAt,
					})),
					req.params,
				),
				"Organizations",
			);
		},
	],
	[
		"GET",
		/^\/admin\/campaigns$/,
		(req, _m, db) => {
			platformAdmin(db, req);
			const q = str(req.params.search);
			const status = oneOf(req.params.status, "status", ["draft", "active", "closed", "cancelled"]);
			let list = db.seed.campaigns;
			if (status) list = list.filter((c) => c.status === status);
			if (q) list = list.filter((c) => has(c.title, q) || has(c.reference, q) || has(orgName(db, c.organizationId), q));
			return ok(
				page(
					list.map((c) => campaignDto(db, c)),
					req.params,
				),
				"Campaigns",
			);
		},
	],
	[
		"GET",
		/^\/admin\/campaigns\/([^/]+)$/,
		(req, [ref], db) => {
			platformAdmin(db, req);
			const c = db.seed.campaigns.find((x) => x.reference === decodeURIComponent(ref!));
			if (!c) throw new HttpError(404, "CAMPAIGN_NOT_FOUND", "We couldn't find that campaign.");
			const bens = db.seed.beneficiaries.filter((b) => b.campaignReference === c.reference);
			const allocs = db.seed.allocations.filter((a) => a.campaignReference === c.reference);
			const by = <T>(list: T[], key: (x: T) => string) =>
				list.reduce<Record<string, number>>((acc, x) => ({ ...acc, [key(x)]: (acc[key(x)] ?? 0) + 1 }), {});
			return ok(
				{
					...campaignDto(db, c),
					description: c.description,
					eligibilityRequirements: c.eligibilityRequirements,
					maxAllocation: dec(c.maxAllocation),
					beneficiaryTarget: c.beneficiaryTarget,
					beneficiaries: by(bens, (b) => b.status),
					allocations: by(allocs, (a) => a.status),
					openIssues: db.admin.issues.filter((i) => i.campaignReference === c.reference && i.status === "open").length,
					updatedAt: c.updatedAt,
				},
				"Campaign",
			);
		},
	],
	[
		"POST",
		/^\/admin\/campaigns\/([^/]+)\/feature$/,
		(req, [ref], db) => {
			const me = platformAdmin(db, req);
			const featured = (req.body as { featured?: unknown })?.featured;
			if (typeof featured !== "boolean")
				throw new HttpError(400, "VALIDATION_FAILED", "featured must be true or false.", [
					{ field: "featured", message: "featured must be a boolean value" },
				]);
			const c = db.seed.campaigns.find((x) => x.reference === decodeURIComponent(ref!));
			if (!c) throw new HttpError(404, "CAMPAIGN_NOT_FOUND", "We couldn't find that campaign.");
			if (featured && c.status !== "active")
				throw new HttpError(409, "CAMPAIGN_NOT_ACTIVE", "Only active campaigns can be featured.");
			c.featured = featured;
			audit(db, me, featured ? "campaign.featured" : "campaign.unfeatured", c.reference);
			return ok(campaignDto(db, c), "Campaign updated");
		},
	],
	[
		"POST",
		/^\/admin\/campaigns\/([^/]+)\/reconcile$/,
		(req, [ref], db) => {
			const me = platformAdmin(db, req);
			const c = db.seed.campaigns.find((x) => x.reference === decodeURIComponent(ref!));
			if (!c) throw new HttpError(404, "CAMPAIGN_NOT_FOUND", "We couldn't find that campaign.");
			const paid = db.seed.allocations.filter((a) => a.campaignReference === c.reference && a.status === "confirmed");
			const open = db.admin.issues.filter((i) => i.campaignReference === c.reference && i.status === "open").length;
			audit(db, me, "campaign.reconciled", c.reference);
			return ok(
				{
					reference: c.reference,
					reconciled: open === 0,
					checkedAt: now(),
					payoutsChecked: paid.length,
					mismatches: 0,
					openIssues: open,
				},
				"Reconciliation finished",
			);
		},
	],
	[
		"GET",
		/^\/admin\/beneficiaries$/,
		(req, _m, db) => {
			platformAdmin(db, req);
			const campaign = str(req.params.campaign);
			const status = oneOf(req.params.status, "status", ["registered", "under_review", "approved", "rejected"]);
			let list = db.seed.beneficiaries;
			if (campaign) list = list.filter((b) => b.campaignReference === campaign);
			if (status) list = list.filter((b) => b.status === status);
			// References and status only: platform admins never see names, contacts or evidence.
			const rows = list.map((b) => ({
				id: b.id,
				reference: b.reference,
				campaignReference: b.campaignReference,
				status: b.status,
				hasAllocation: db.seed.allocations.some(
					(a) => a.beneficiaryId === b.id && (LIVE_ALLOCATION.includes(a.status) || a.status === "confirmed"),
				),
				evidenceCount: b.evidence.length,
				reviewedAt: b.reviewedAt,
				createdAt: b.createdAt,
			}));
			return ok(page(rows, req.params), "Beneficiaries");
		},
	],
	[
		"GET",
		/^\/admin\/allocations$/,
		(req, _m, db) => {
			platformAdmin(db, req);
			const campaign = str(req.params.campaign);
			const status = oneOf(req.params.status, "status", ["allocated", "ready", "processing", "confirmed", "failed", "cancelled"]);
			let list = db.seed.allocations;
			if (campaign) list = list.filter((a) => a.campaignReference === campaign);
			if (status) list = list.filter((a) => a.status === status);
			const rows = list.map((a) => ({
				id: a.id,
				reference: a.reference,
				campaignReference: a.campaignReference,
				beneficiaryReference: db.seed.beneficiaries.find((b) => b.id === a.beneficiaryId)?.reference ?? null,
				amount: dec(a.amount),
				status: a.status,
				payoutTxHash: a.payoutTxHash,
				failureMessage: a.failureMessage,
				paidAt: a.paidAt,
				cancelledAt: a.cancelledAt,
				createdAt: a.createdAt,
			}));
			return ok(page(rows, req.params), "Allocations");
		},
	],
	[
		"GET",
		/^\/admin\/transactions$/,
		(req, _m, db) => {
			platformAdmin(db, req);
			const campaign = str(req.params.campaign);
			const status = oneOf(req.params.status, "status", ["prepared", "pending", "confirmed", "failed", "expired"]);
			const kind = oneOf(req.params.kind, "kind", ["fund", "lock_allocations", "payout", "cancel_allocation", "recover"]);
			const hash = str(req.params.hash)?.toLowerCase();
			let list = db.admin.transactions;
			if (campaign) list = list.filter((t) => t.campaignReference === campaign);
			if (status) list = list.filter((t) => t.status === status);
			if (kind) list = list.filter((t) => t.kind === kind);
			if (hash) list = list.filter((t) => t.status !== "prepared" && t.hash.startsWith(hash));
			return ok(page(list.map(txDto), req.params), "Transactions");
		},
	],
	[
		"GET",
		/^\/admin\/transactions\/([^/]+)$/,
		(req, [id], db) => {
			platformAdmin(db, req);
			const t = db.admin.transactions.find((x) => x.id === id);
			if (!t) throw new HttpError(404, "TRANSACTION_NOT_FOUND", "We couldn't find that transaction.");
			return ok(txDto(t), "Transaction");
		},
	],
	[
		"POST",
		/^\/admin\/transactions\/([^/]+)\/recheck$/,
		(req, [id], db) => {
			const me = platformAdmin(db, req);
			const t = db.admin.transactions.find((x) => x.id === id);
			if (!t) throw new HttpError(404, "TRANSACTION_NOT_FOUND", "We couldn't find that transaction.");
			if (t.status === "prepared") throw new HttpError(409, "TRANSACTION_NOT_SUBMITTED", "This transaction was never submitted.");
			if (t.status === "pending") settle(db, t);
			t.checkedAt = now();
			audit(db, me, "transaction.rechecked", t.id, t.status);
			return ok(txDto(t), "Transaction re-checked");
		},
	],
	[
		"GET",
		/^\/admin\/escrow-balances$/,
		(req, _m, db) => {
			platformAdmin(db, req);
			const campaign = str(req.params.campaign);
			const status = oneOf(req.params.status, "status", ["open", "claimed"]);
			const kind = oneOf(req.params.kind, "kind", ["pool", "allocation"]);
			let list = escrowBalances(db);
			if (campaign) list = list.filter((b) => b.campaignReference === campaign);
			if (status) list = list.filter((b) => b.status === status);
			if (kind) list = list.filter((b) => b.kind === kind);
			return ok(page(list, req.params), "Escrow balances");
		},
	],
	[
		"POST",
		/^\/admin\/sweeper\/run$/,
		(req, _m, db) => {
			const me = platformAdmin(db, req);
			const pending = db.admin.transactions.filter((t) => t.status === "pending");
			for (const t of pending) settle(db, t);
			db.admin.sweeper = { lastRunAt: now(), settled: pending.length };
			audit(db, me, "sweeper.run", "settlement", `${pending.length} settled`);
			return ok({ ranAt: db.admin.sweeper.lastRunAt, checked: pending.length, settled: pending.length }, "Sweep finished");
		},
	],
	[
		"GET",
		/^\/admin\/reconciliation-issues$/,
		(req, _m, db) => {
			platformAdmin(db, req);
			const campaign = str(req.params.campaign);
			const status = oneOf(req.params.status, "status", ["open", "resolved"]);
			let list = db.admin.issues;
			if (campaign) list = list.filter((i) => i.campaignReference === campaign);
			if (status) list = list.filter((i) => i.status === status);
			return ok(page(list, req.params), "Reconciliation issues");
		},
	],
	[
		"POST",
		/^\/admin\/reconciliation-issues\/([^/]+)\/resolve$/,
		(req, [id], db) => {
			const me = platformAdmin(db, req);
			const note = str((req.body as { note?: string })?.note);
			if (!note) throw new HttpError(400, "VALIDATION_FAILED", "Add a note.", [{ field: "note", message: "Add a note." }]);
			const issue = db.admin.issues.find((i) => i.id === id);
			if (!issue) throw new HttpError(404, "ISSUE_NOT_FOUND", "We couldn't find that issue.");
			if (issue.status === "resolved") throw new HttpError(409, "ISSUE_ALREADY_RESOLVED", "This issue is already resolved.");
			issue.status = "resolved";
			issue.resolvedAt = now();
			issue.resolutionNote = note;
			issue.resolvedBy = me.walletAddress;
			audit(db, me, "issue.resolved", issue.id, note);
			return ok(issue, "Issue resolved");
		},
	],
	["GET", /^\/admin\/audit-log$/, (req, _m, db) => (platformAdmin(db, req), ok(page(db.admin.audit, req.params), "Audit log"))],
	[
		"GET",
		/^\/admin\/access-log$/,
		(req, _m, db) => (platformAdmin(db, req), ok(page(db.admin.access, req.params), "Access log")),
	],
];

/** Settles a pending transaction the way the backend's sweep reads it from Stellar (always confirms in the mock). */
function settle(db: AdminDb, t: TxRow) {
	t.status = "confirmed";
	t.ledger = 1_284_000 + db.admin.counter++;
	t.confirmedAt = now();
	const row = db.seed.ledger.find((r) => r.id === t.id);
	if (row) {
		row.status = "confirmed";
		row.ledger = t.ledger;
	}
}

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
		if (!(error instanceof HttpError)) throw error;
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
					path: `/api/v1${req.path}`,
				},
			},
		};
	}
}
