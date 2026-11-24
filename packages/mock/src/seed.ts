/**
 * Mock data for AidTrace, used until the app runs against the backend (NEXT_PUBLIC_DATA_MODE=mock). Deterministic: the
 * same seed always produces the same campaigns, beneficiaries, allocations and ledger, with numbers taken from the
 * Figma frames ("Clean water for every family": 72,000 of 100,000 USDC raised, 94 of 400 beneficiaries paid).
 *
 * Rows mirror the AidTrace backend: campaigns keyed by reference (`AT-1001`), beneficiaries `BNF-…`, allocations with a
 * random public `ALC-…` reference, and a ledger of submitted transactions (confirmed, pending or failed). Amounts are
 * stroop strings (7 decimals), times ISO strings. Totals are never stored; `campaignTotals()` derives them from
 * confirmed rows only, so they always reconcile.
 */
import { mockAccountId } from "@repo/stellar/strkey";

export type CampaignStatusRow = "draft" | "active" | "closed" | "cancelled";
export type BeneficiaryStatusRow = "registered" | "under_review" | "approved" | "rejected";
export type AllocationStatusRow = "allocated" | "ready" | "processing" | "confirmed" | "failed" | "cancelled";

export interface OrgRow {
	id: string;
	name: string;
	description: string | null;
	websiteUrl: string | null;
	adminWallet: string;
	createdAt: string;
}

export interface CampaignRow {
	reference: string;
	title: string;
	description: string;
	eligibilityRequirements: string;
	category: string | null;
	featured: boolean;
	organizationId: string;
	adminWallet: string;
	target: string;
	maxAllocation: string;
	beneficiaryTarget: number;
	startsAt: string;
	endsAt: string;
	status: CampaignStatusRow;
	createdAt: string;
	updatedAt: string;
}

export interface EvidenceRow {
	id: string;
	name: string;
	contentType: string;
	sizeBytes: number;
	sha256: string;
	createdAt: string;
}

export interface BeneficiaryRow {
	id: string;
	reference: string;
	campaignReference: string;
	fullName: string;
	email: string | null;
	phone: string | null;
	walletAddress: string;
	eligibilityDetails: string;
	reviewNote: string | null;
	evidence: EvidenceRow[];
	status: BeneficiaryStatusRow;
	reviewedAt: string | null;
	createdAt: string;
	updatedAt: string;
	/** The applicant's private status-link token (emailed by the real backend). */
	statusToken: string;
}

export interface AllocationRow {
	id: string;
	/** Random public reference: the only recipient identifier on the public ledger. */
	reference: string;
	campaignReference: string;
	beneficiaryId: string;
	amount: string;
	status: AllocationStatusRow;
	payoutTxHash: string | null;
	paidAt: string | null;
	cancelledAt: string | null;
	failureMessage: string | null;
	createdAt: string;
}

/** A transaction submitted to Stellar. Only `confirmed` rows move money or count in totals. */
export interface LedgerRow {
	id: string;
	campaignReference: string;
	type: "funding" | "disbursement" | "recovery";
	amount: string;
	status: "confirmed" | "pending" | "failed";
	recipientReference: string | null;
	txHash: string;
	ledger: number | null;
	failureCode: string | null;
	timestamp: string;
}

export interface NotificationRow {
	id: string;
	event: string;
	message: string;
	campaignReference: string | null;
	readAt: string | null;
	createdAt: string;
}

export interface MockDb {
	version: number;
	orgs: OrgRow[];
	campaigns: CampaignRow[];
	beneficiaries: BeneficiaryRow[];
	allocations: AllocationRow[];
	ledger: LedgerRow[];
	notifications: NotificationRow[];
	/** The demo administrator wallet's Testnet USDC (stroops). */
	walletUsdc: string;
	/** Monotonic counters for references and ids. */
	counters: { beneficiary: number; campaign: number; id: number; ledger: number };
}

/** Bump when the seed's shape changes: stored demo data with an older version is replaced. */
export const SEED_VERSION = 6;

/** The demo organization administrator. Mock data only: there is no secret key behind this address. */
export const DEMO_ADMIN_WALLET = mockAccountId("aidtrace-demo-admin");

/** The demo platform administrator (apps/admin): in the backend's ADMIN_WALLETS, with no organization. Mock only. */
export const DEMO_PLATFORM_WALLET = mockAccountId("aidtrace-demo-platform");

// --- helpers -------------------------------------------------------------------------------------------------------

const UNIT = 10_000_000n;
export const usdc = (whole: number) => (BigInt(Math.round(whole * 100)) * (UNIT / 100n)).toString();

function prng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A 64-hex Stellar-style transaction hash, deterministic per seed string. */
export function mockTxHash(seed: string) {
	let out = "";
	let h = 2166136261;
	for (let i = 0; out.length < 64; i++) {
		for (const ch of `${seed}#${i}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
		out += (h >>> 0).toString(16).padStart(8, "0");
	}
	return out.slice(0, 64);
}

const BASE32 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A random-looking public allocation reference ("ALC-7KQ2M9"), deterministic per seed string. */
export function allocationReference(seed: string) {
	const hex = mockTxHash(`alc:${seed}`);
	let out = "";
	for (let i = 0; i < 6; i++) out += BASE32[parseInt(hex.slice(i * 2, i * 2 + 2), 16) % BASE32.length];
	return `ALC-${out}`;
}

const FIRST = [
	"Amara",
	"Daniel",
	"Grace",
	"Joseph",
	"Fatima",
	"Kwame",
	"Aisha",
	"Samuel",
	"Ngozi",
	"Ibrahim",
	"Esther",
	"Musa",
	"Chiamaka",
	"Peter",
	"Halima",
	"Yaw",
	"Blessing",
	"Tunde",
	"Zainab",
	"David",
	"Mercy",
	"Emeka",
	"Rukayat",
	"John",
	"Adaeze",
	"Moses",
	"Hauwa",
	"Kofi",
	"Ruth",
	"Abdul",
];
const LAST = [
	"Okafor",
	"Mensah",
	"Adebayo",
	"Kamau",
	"Hassan",
	"Boateng",
	"Bello",
	"Otieno",
	"Eze",
	"Abubakar",
	"Nwosu",
	"Wanjiru",
	"Danjuma",
	"Owusu",
	"Akinola",
	"Mwangi",
	"Ibrahim",
	"Achieng",
	"Obi",
	"Sule",
];
const NOTES = [
	"Household of six without a protected water source within 2 km. Assessed by the community field officer.",
	"Single-parent household; income below the program threshold. Referral letter from the local clinic attached.",
	"Displaced family registered with the community relief desk. Verified by two community leaders.",
	"Student enrolled at a partner school; fees outstanding for the current term.",
	"Elderly caregiver supporting three grandchildren; meets the vulnerability criteria.",
	"Household affected by the recent flooding; listed in the district needs assessment.",
];
const EVIDENCE = [
	{ name: "household-assessment.pdf", contentType: "application/pdf" },
	{ name: "community-letter.jpg", contentType: "image/jpeg" },
	{ name: "school-enrolment.pdf", contentType: "application/pdf" },
	{ name: "referral-note.png", contentType: "image/png" },
];

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

interface CampaignPlan {
	reference: string;
	title: string;
	description: string;
	org: { name: string; description: string; websiteUrl: string };
	category: string;
	featured: boolean;
	target: number;
	maxAllocation: number;
	beneficiaryTarget: number;
	eligibility: string;
	startDaysAgo: number;
	durationDays: number;
	status: CampaignStatusRow;
	raised: number;
	counts: {
		paid: number;
		ready: number;
		allocated: number;
		failed: number;
		approved: number;
		registered: number;
		under_review: number;
		rejected: number;
	};
}

const PLANS: CampaignPlan[] = [
	{
		reference: "AT-1001",
		title: "Clean water for every family",
		description:
			"Bringing safe, reliable drinking water to households in rural communities. Funds cover household water filters, borehole repairs and hygiene kits, paid directly to verified beneficiaries in USDC.",
		org: {
			name: "Water for All Foundation",
			description: "Safe water and sanitation for rural communities.",
			websiteUrl: "https://waterforall.org",
		},
		category: "Clean water",
		featured: true,
		target: 100_000,
		maxAllocation: 250,
		beneficiaryTarget: 400,
		eligibility:
			"Households without access to clean water within 2 km.\nResident in a partner community.\nNot receiving support from another water program.",
		startDaysAgo: 82,
		durationDays: 120,
		status: "active",
		raised: 72_000,
		counts: { paid: 94, ready: 2, allocated: 1, failed: 1, approved: 6, registered: 8, under_review: 3, rejected: 2 },
	},
	{
		reference: "AT-1002",
		title: "Community emergency relief",
		description:
			"Rapid cash support for families affected by seasonal flooding: food, shelter repairs and essentials, distributed transparently to approved households.",
		org: {
			name: "Water for All Foundation",
			description: "Safe water and sanitation for rural communities.",
			websiteUrl: "https://waterforall.org",
		},
		category: "Emergency relief",
		featured: true,
		target: 50_000,
		maxAllocation: 200,
		beneficiaryTarget: 250,
		eligibility: "Household listed in the district flood assessment.\nLost shelter, crops or livelihood in the last 90 days.",
		startDaysAgo: 45,
		durationDays: 90,
		status: "active",
		raised: 34_500,
		counts: { paid: 60, ready: 0, allocated: 0, failed: 0, approved: 5, registered: 6, under_review: 2, rejected: 1 },
	},
	{
		reference: "AT-1003",
		title: "A brighter start for students",
		description:
			"Covering school fees, uniforms and learning materials for students from low-income households, paid to guardians' wallets each term.",
		org: {
			name: "Water for All Foundation",
			description: "Safe water and sanitation for rural communities.",
			websiteUrl: "https://waterforall.org",
		},
		category: "Education",
		featured: true,
		target: 25_000,
		maxAllocation: 150,
		beneficiaryTarget: 160,
		eligibility: "Enrolled in a partner primary or secondary school.\nHousehold income below the program threshold.",
		startDaysAgo: 30,
		durationDays: 75,
		status: "active",
		raised: 18_750,
		counts: { paid: 30, ready: 1, allocated: 0, failed: 0, approved: 4, registered: 4, under_review: 1, rejected: 1 },
	},
	{
		reference: "AT-1004",
		title: "Safe births, healthy mothers",
		description:
			"Delivery kits and transport support for expectant mothers in remote villages. Fully funded and fully disbursed.",
		org: {
			name: "Water for All Foundation",
			description: "Safe water and sanitation for rural communities.",
			websiteUrl: "https://waterforall.org",
		},
		category: "Health",
		featured: false,
		target: 15_000,
		maxAllocation: 150,
		beneficiaryTarget: 100,
		eligibility: "Expectant mother registered at a partner health post.\nLives more than 10 km from a maternity facility.",
		startDaysAgo: 160,
		durationDays: 90,
		status: "closed",
		raised: 15_000,
		counts: { paid: 100, ready: 0, allocated: 0, failed: 0, approved: 0, registered: 0, under_review: 0, rejected: 2 },
	},
];

/** Splits `total` into funding deposits. */
function deposits(total: number, rand: () => number) {
	const sizes = [1000, 2500, 5000, 7500, 10_000];
	const out: number[] = [];
	let left = total;
	while (left > 0) {
		const pick = sizes[Math.floor(rand() * sizes.length)]!;
		const amount = Math.min(pick, left);
		out.push(amount);
		left -= amount;
	}
	return out;
}

export function createSeed(now = Date.now()): MockDb {
	const rand = prng(20261124);
	const db: MockDb = {
		version: SEED_VERSION,
		orgs: [],
		campaigns: [],
		beneficiaries: [],
		allocations: [],
		ledger: [],
		notifications: [],
		walletUsdc: usdc(250_000),
		counters: { beneficiary: 100, campaign: 1000 + PLANS.length, id: 1, ledger: 0 },
	};
	const nextId = (prefix: string) => `${prefix}_${(db.counters.id++).toString(36).padStart(6, "0")}`;
	const org: OrgRow = { id: nextId("org"), ...PLANS[0]!.org, adminWallet: DEMO_ADMIN_WALLET, createdAt: iso(now - 200 * DAY) };
	db.orgs.push(org);

	for (const plan of PLANS) {
		const start = now - plan.startDaysAgo * DAY;
		const end = start + plan.durationDays * DAY;
		const elapsed = Math.min(now, end) - start;
		const campaign: CampaignRow = {
			reference: plan.reference,
			title: plan.title,
			description: plan.description,
			eligibilityRequirements: plan.eligibility,
			category: plan.category,
			featured: plan.featured,
			organizationId: org.id,
			adminWallet: DEMO_ADMIN_WALLET,
			target: usdc(plan.target),
			maxAllocation: usdc(plan.maxAllocation),
			beneficiaryTarget: plan.beneficiaryTarget,
			startsAt: iso(start),
			endsAt: iso(end),
			status: plan.status,
			createdAt: iso(start - DAY),
			updatedAt: iso(start),
		};
		db.campaigns.push(campaign);

		// Funding: the administrator's deposits into escrow over the campaign so far.
		for (const [i, amount] of deposits(plan.raised, rand).entries()) {
			const at = Math.min(start + Math.floor(rand() * elapsed * 0.8), now - 30 * 60_000);
			db.ledger.push({
				id: nextId("tx"),
				campaignReference: campaign.reference,
				type: "funding",
				amount: usdc(amount),
				status: "confirmed",
				recipientReference: null,
				txHash: mockTxHash(`${plan.reference}-fund-${i}`),
				ledger: 0,
				failureCode: null,
				timestamp: iso(at),
			});
		}

		const order: ["paid" | "ready" | "allocated" | "failed" | BeneficiaryStatusRow, number][] = [
			["paid", plan.counts.paid],
			["ready", plan.counts.ready],
			["allocated", plan.counts.allocated],
			["failed", plan.counts.failed],
			["approved", plan.counts.approved],
			["under_review", plan.counts.under_review],
			["rejected", plan.counts.rejected],
			["registered", plan.counts.registered],
		];
		let n = 0;
		for (const [kind, count] of order) {
			for (let k = 0; k < count; k++, n++) {
				db.counters.beneficiary++;
				const reference = `BNF-${db.counters.beneficiary.toString().padStart(5, "0")}`;
				const created = Math.min(
					start + Math.floor((n / (plan.beneficiaryTarget * 0.4)) * elapsed * 0.7) + Math.floor(rand() * DAY),
					now - 2 * DAY,
				);
				const reviewed = Math.min(created + Math.floor((1 + rand() * 3) * DAY), now - DAY);
				const first = FIRST[Math.floor(rand() * FIRST.length)]!;
				const last = LAST[Math.floor(rand() * LAST.length)]!;
				const ev = EVIDENCE[Math.floor(rand() * EVIDENCE.length)]!;
				const status: BeneficiaryStatusRow =
					kind === "paid" || kind === "ready" || kind === "allocated" || kind === "failed" ? "approved" : kind;
				const decided = status === "approved" || status === "rejected";
				const beneficiary: BeneficiaryRow = {
					id: nextId("ben"),
					reference,
					campaignReference: campaign.reference,
					fullName: `${first} ${last}`,
					email: rand() < 0.8 ? `${first}.${last}@example.org`.toLowerCase() : null,
					phone: rand() < 0.5 ? `+234 80${Math.floor(10_000_000 + rand() * 89_999_999)}` : null,
					walletAddress: mockAccountId(`${plan.reference}-${reference}`),
					eligibilityDetails: NOTES[Math.floor(rand() * NOTES.length)]!,
					reviewNote: status === "rejected" ? "Outside the campaign's service area." : null,
					evidence: [
						{
							id: nextId("ev"),
							name: ev.name,
							contentType: ev.contentType,
							sizeBytes: 180_000 + Math.floor(rand() * 900_000),
							sha256: mockTxHash(`ev-${reference}`),
							createdAt: iso(created),
						},
					],
					status,
					reviewedAt: decided ? iso(reviewed) : null,
					createdAt: iso(created),
					updatedAt: iso(decided ? reviewed : created),
					statusToken: mockTxHash(`token-${reference}`).slice(0, 40),
				};
				db.beneficiaries.push(beneficiary);
				if (kind !== "paid" && kind !== "ready" && kind !== "allocated" && kind !== "failed") continue;

				const allocation: AllocationRow = {
					id: nextId("alc"),
					reference: allocationReference(`${plan.reference}-${reference}`),
					campaignReference: campaign.reference,
					beneficiaryId: beneficiary.id,
					amount: campaign.maxAllocation,
					status: kind === "paid" ? "confirmed" : kind,
					payoutTxHash: null,
					paidAt: null,
					cancelledAt: null,
					failureMessage:
						kind === "failed"
							? "The beneficiary wallet has no USDC trustline. Ask them to enable USDC, then retry the payout."
							: null,
					createdAt: iso(Math.max(reviewed, now - 5 * DAY)),
				};
				if (kind === "paid") {
					const paidAt = Math.min(
						start + Math.floor(elapsed * (0.2 + 0.8 * (k / Math.max(1, count)))),
						now - 3_600_000 * (count - k),
					);
					allocation.createdAt = iso(paidAt - 2 * 3_600_000);
					allocation.payoutTxHash = mockTxHash(`${plan.reference}-pay-${reference}`);
					allocation.paidAt = iso(paidAt);
					db.ledger.push({
						id: nextId("tx"),
						campaignReference: campaign.reference,
						type: "disbursement",
						amount: allocation.amount,
						status: "confirmed",
						recipientReference: allocation.reference,
						txHash: allocation.payoutTxHash,
						ledger: 0,
						failureCode: null,
						timestamp: allocation.paidAt,
					});
				} else if (kind === "failed") {
					// The failed attempt is on the public ledger (it moved nothing and isn't counted in totals).
					db.ledger.push({
						id: nextId("tx"),
						campaignReference: campaign.reference,
						type: "disbursement",
						amount: allocation.amount,
						status: "failed",
						recipientReference: allocation.reference,
						txHash: mockTxHash(`${plan.reference}-fail-${reference}`),
						ledger: null,
						failureCode: "RECIPIENT_TRUSTLINE_MISSING",
						timestamp: iso(now - 26 * 3_600_000),
					});
				}
				db.allocations.push(allocation);
			}
		}
	}

	// Ledger numbers follow time, like Stellar's.
	db.ledger.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
	for (const row of db.ledger)
		if (row.status === "confirmed") row.ledger = 1_250_000 + Math.floor((Date.parse(row.timestamp) - (now - 200 * DAY)) / 5000);
	db.counters.ledger = Math.max(1_250_000, ...db.ledger.map((r) => r.ledger ?? 0));
	db.ledger.reverse();
	db.allocations.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

	const water = db.campaigns[0]!;
	db.notifications.push(
		{
			id: nextId("ntf"),
			event: "application_received",
			message: "3 new beneficiary applications for Clean water for every family",
			campaignReference: water.reference,
			readAt: null,
			createdAt: iso(now - 2 * 3_600_000),
		},
		{
			id: nextId("ntf"),
			event: "payout_failed",
			message: "A payout for Clean water for every family failed. No funds moved.",
			campaignReference: water.reference,
			readAt: null,
			createdAt: iso(now - 26 * 3_600_000),
		},
		{
			id: nextId("ntf"),
			event: "funding_confirmed",
			message: "5,000 USDC funding confirmed for Clean water for every family",
			campaignReference: water.reference,
			readAt: iso(now - 40 * 3_600_000),
			createdAt: iso(now - 2 * DAY),
		},
	);

	return db;
}

// --- derived figures -----------------------------------------------------------------------------------------------

export interface Totals {
	target: bigint;
	raised: bigint;
	allocated: bigint;
	disbursed: bigint;
	recovered: bigint;
	available: bigint;
	beneficiariesApproved: number;
	beneficiariesPaid: number;
}

/** Allocations that still hold (or will hold) campaign funds. */
export const LIVE_ALLOCATION: AllocationStatusRow[] = ["allocated", "ready", "processing", "failed"];

/** Totals from confirmed ledger rows and open allocations: the numbers always reconcile. */
export function campaignTotals(db: MockDb, reference: string): Totals {
	const campaign = db.campaigns.find((c) => c.reference === reference);
	let raised = 0n;
	let disbursed = 0n;
	let recovered = 0n;
	for (const row of db.ledger) {
		if (row.campaignReference !== reference || row.status !== "confirmed") continue;
		if (row.type === "funding") raised += BigInt(row.amount);
		else if (row.type === "disbursement") disbursed += BigInt(row.amount);
		else recovered += BigInt(row.amount);
	}
	let allocated = 0n;
	const paid = new Set<string>();
	for (const a of db.allocations) {
		if (a.campaignReference !== reference) continue;
		if (LIVE_ALLOCATION.includes(a.status)) allocated += BigInt(a.amount);
		if (a.status === "confirmed") paid.add(a.beneficiaryId);
	}
	const approved = db.beneficiaries.filter((b) => b.campaignReference === reference && b.status === "approved").length;
	return {
		target: BigInt(campaign?.target ?? "0"),
		raised,
		allocated,
		disbursed,
		recovered,
		available: raised - disbursed - recovered,
		beneficiariesApproved: approved,
		beneficiariesPaid: paid.size,
	};
}

export interface PlatformStats {
	campaigns: number;
	activeCampaigns: number;
	organizations: number;
	target: bigint;
	raised: bigint;
	disbursed: bigint;
	beneficiariesApproved: number;
	beneficiariesPaid: number;
	verifiedTransactions: number;
}

/** `GET /public/stats`: public campaigns only (no drafts or cancelled ones). */
export function platformStats(db: MockDb): PlatformStats {
	const stats: PlatformStats = {
		campaigns: 0,
		activeCampaigns: 0,
		organizations: 0,
		target: 0n,
		raised: 0n,
		disbursed: 0n,
		beneficiariesApproved: 0,
		beneficiariesPaid: 0,
		verifiedTransactions: 0,
	};
	const orgs = new Set<string>();
	for (const c of db.campaigns) {
		if (c.status === "draft" || c.status === "cancelled") continue;
		const t = campaignTotals(db, c.reference);
		stats.campaigns++;
		if (c.status === "active") stats.activeCampaigns++;
		orgs.add(c.organizationId);
		stats.target += t.target;
		stats.raised += t.raised;
		stats.disbursed += t.disbursed;
		stats.beneficiariesApproved += t.beneficiariesApproved;
		stats.beneficiariesPaid += t.beneficiariesPaid;
	}
	stats.organizations = orgs.size;
	stats.verifiedTransactions = db.ledger.filter((r) => r.status === "confirmed").length;
	return stats;
}
