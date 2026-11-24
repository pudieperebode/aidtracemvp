"use client";

import { DEMO_ADMIN_WALLET, DEMO_PLATFORM_WALLET, mockTxHash, type MockDb } from "@repo/mock/seed";
import { mockAccountId } from "@repo/stellar/strkey";

/**
 * Records only the platform side of the backend keeps (users, transactions as submitted, reconciliation issues, audit
 * and access logs), derived once from the shared demo seed. Organizations beyond the seed's one are added so the
 * lists look like a real platform.
 */

export type TxKind = "fund" | "lock_allocations" | "payout" | "cancel_allocation" | "recover";
export type TxStatus = "prepared" | "pending" | "confirmed" | "failed" | "expired";

export interface UserRow {
	id: string;
	walletAddress: string;
	status: "active" | "suspended";
	organizationId: string | null;
	platformAdmin: boolean;
	suspendedReason: string | null;
	suspendedAt: string | null;
	lastSignInAt: string | null;
	createdAt: string;
}

export interface TxRow {
	id: string;
	kind: TxKind;
	status: TxStatus;
	campaignReference: string;
	/** Stroops; null for locks and cancels that move no net amount. */
	amount: string | null;
	hash: string;
	ledger: number | null;
	failureCode: string | null;
	createdAt: string;
	submittedAt: string | null;
	confirmedAt: string | null;
	checkedAt: string | null;
}

export interface IssueRow {
	id: string;
	type: "unexpected_claim" | "amount_mismatch" | "missing_transaction";
	status: "open" | "resolved";
	campaignReference: string;
	message: string;
	detectedAt: string;
	resolvedAt: string | null;
	resolutionNote: string | null;
	resolvedBy: string | null;
}

export interface AuditRow {
	id: string;
	action: string;
	actorWallet: string;
	target: string;
	details: string | null;
	createdAt: string;
}

export interface AccessRow {
	id: string;
	actorWallet: string;
	campaignReference: string;
	beneficiaryReference: string;
	action: string;
	createdAt: string;
}

export interface AdminState {
	users: UserRow[];
	transactions: TxRow[];
	issues: IssueRow[];
	audit: AuditRow[];
	access: AccessRow[];
	/** token → wallet (access and refresh tokens). */
	sessions: Record<string, string>;
	challenges: Record<string, { address: string; transaction: string }>;
	sweeper: { lastRunAt: string | null; settled: number };
	counter: number;
}

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

const EXTRA_ORGS = [
	{ name: "Kibera Health Collective", websiteUrl: "https://kiberahealth.example.org", description: "Community clinics." },
	{ name: "Sahel School Meals", websiteUrl: null, description: "Daily meals for schoolchildren." },
	{ name: "River Delta Relief", websiteUrl: "https://riverdelta.example.org", description: "Flood response." },
];

export function buildAdminState(seed: MockDb, now = Date.now()): AdminState {
	let counter = 1;
	const id = (prefix: string) => `${prefix}_${(counter++).toString(36).padStart(6, "0")}`;

	for (const [i, org] of EXTRA_ORGS.entries())
		seed.orgs.push({
			id: `org_x${i + 1}`,
			...org,
			adminWallet: mockAccountId(`aidtrace-org-${i + 1}`),
			createdAt: iso(now - (120 - i * 30) * DAY),
		});

	const users: UserRow[] = [
		{
			id: id("usr"),
			walletAddress: DEMO_PLATFORM_WALLET,
			status: "active",
			organizationId: null,
			platformAdmin: true,
			suspendedReason: null,
			suspendedAt: null,
			lastSignInAt: iso(now - DAY),
			createdAt: iso(now - 220 * DAY),
		},
		...seed.orgs.map((o, i): UserRow => ({
			id: id("usr"),
			walletAddress: o.adminWallet,
			status: "active",
			organizationId: o.id,
			platformAdmin: false,
			suspendedReason: null,
			suspendedAt: null,
			lastSignInAt: iso(now - (i + 1) * 3 * DAY),
			createdAt: o.createdAt,
		})),
		...[1, 2, 3].map((n): UserRow => ({
			id: id("usr"),
			walletAddress: mockAccountId(`aidtrace-user-${n}`),
			status: n === 3 ? "suspended" : "active",
			organizationId: null,
			platformAdmin: false,
			suspendedReason: n === 3 ? "Repeated sign-in attempts from a reported wallet." : null,
			suspendedAt: n === 3 ? iso(now - 10 * DAY) : null,
			lastSignInAt: n === 2 ? null : iso(now - n * 6 * DAY),
			createdAt: iso(now - n * 15 * DAY),
		})),
	];

	const kindOf = { funding: "fund", disbursement: "payout", recovery: "recover" } as const;
	const transactions: TxRow[] = seed.ledger.map((r) => ({
		id: r.id,
		kind: kindOf[r.type],
		status: r.status,
		campaignReference: r.campaignReference,
		amount: r.amount,
		hash: r.txHash,
		ledger: r.ledger,
		failureCode: r.failureCode,
		createdAt: r.timestamp,
		submittedAt: r.timestamp,
		confirmedAt: r.status === "confirmed" ? r.timestamp : null,
		checkedAt: null,
	}));
	const first = seed.campaigns[0]?.reference ?? "AT-1001";
	transactions.push(
		{
			id: id("act"),
			kind: "lock_allocations",
			status: "expired",
			campaignReference: first,
			amount: null,
			hash: mockTxHash("expired-lock"),
			ledger: null,
			failureCode: "TRANSACTION_EXPIRED",
			createdAt: iso(now - 2 * DAY),
			submittedAt: null,
			confirmedAt: null,
			checkedAt: null,
		},
		{
			id: id("act"),
			kind: "fund",
			status: "prepared",
			campaignReference: first,
			amount: "1000000000",
			hash: mockTxHash("prepared-fund"),
			ledger: null,
			failureCode: null,
			createdAt: iso(now - 3_600_000),
			submittedAt: null,
			confirmedAt: null,
			checkedAt: null,
		},
	);
	transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

	const second = seed.campaigns[1]?.reference ?? first;
	const issues: IssueRow[] = [
		{
			id: id("iss"),
			type: "unexpected_claim",
			status: "open",
			campaignReference: second,
			message: "A claimable balance was claimed by an account that is not the allocation's beneficiary wallet.",
			detectedAt: iso(now - 5 * 3_600_000),
			resolvedAt: null,
			resolutionNote: null,
			resolvedBy: null,
		},
		{
			id: id("iss"),
			type: "amount_mismatch",
			status: "resolved",
			campaignReference: first,
			message: "Pool balance on Stellar differed from the recorded available funds by 0.0000001 USDC.",
			detectedAt: iso(now - 9 * DAY),
			resolvedAt: iso(now - 8 * DAY),
			resolutionNote: "Rounding on a testnet reset. Balances match after resync.",
			resolvedBy: DEMO_PLATFORM_WALLET,
		},
	];

	const viewed = seed.beneficiaries.slice(0, 6);
	const access: AccessRow[] = viewed.map((b, i) => ({
		id: id("acc"),
		actorWallet: DEMO_ADMIN_WALLET,
		campaignReference: b.campaignReference,
		beneficiaryReference: b.reference,
		action: i % 3 === 2 ? "evidence_downloaded" : "record_viewed",
		createdAt: iso(now - (i + 1) * 7_200_000),
	}));

	const audit: AuditRow[] = [
		{
			id: id("aud"),
			action: "issue.resolved",
			actorWallet: DEMO_PLATFORM_WALLET,
			target: issues[1]!.id,
			details: issues[1]!.resolutionNote,
			createdAt: issues[1]!.resolvedAt!,
		},
		{
			id: id("aud"),
			action: "user.suspended",
			actorWallet: DEMO_PLATFORM_WALLET,
			target: users[users.length - 1]!.walletAddress,
			details: users[users.length - 1]!.suspendedReason,
			createdAt: users[users.length - 1]!.suspendedAt!,
		},
	];

	return {
		users,
		transactions,
		issues,
		audit,
		access,
		sessions: {},
		challenges: {},
		sweeper: { lastRunAt: null, settled: 0 },
		counter,
	};
}
