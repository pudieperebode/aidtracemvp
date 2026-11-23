/**
 * Mock data for AidTrace, used until the backend is connected (NEXT_PUBLIC_DATA_MODE=mock). Deterministic: the same
 * seed always produces the same campaigns, beneficiaries and ledger, with numbers taken from the Figma frames
 * ("Clean water for every family": 72,000 of 100,000 USDC raised, 94 of 400 beneficiaries paid).
 *
 * Rows are stored the way a backend would: amounts as stroop strings (7 decimals), times as ISO strings. Totals are
 * never stored; `campaignTotals()` derives them from confirmed ledger rows and allocations, so they always reconcile.
 */
import { mockAccountId } from "@repo/stellar/strkey";

export type CampaignCategory = "water" | "food" | "education" | "health";
export type CampaignStatusRow = "draft" | "active" | "funded" | "closed" | "cancelled";
export type BeneficiaryStatusRow = "registered" | "under_review" | "approved" | "rejected" | "allocated" | "paid";
export type PaymentStatusRow = "pending_allocation" | "allocated" | "ready" | "processing" | "confirmed" | "failed" | "cancelled";

export interface OrgRow {
	id: string;
	name: string;
	website: string;
	adminWallet: string;
	createdAt: string;
}

export interface CampaignRow {
	id: string;
	reference: string;
	title: string;
	description: string;
	category: CampaignCategory;
	organizationId: string;
	adminWallet: string;
	target: string;
	maxAllocation: string;
	beneficiaryTarget: number;
	eligibility: string[];
	startsAt: string;
	endsAt: string;
	status: CampaignStatusRow;
	contractCampaignId: string | null;
	featured: boolean;
	createdAt: string;
}

export interface EvidenceRow {
	id: string;
	name: string;
	contentType: string;
	size: number;
	uploadedAt: string;
}

export interface AllocationRow {
	id: string;
	amount: string;
	status: PaymentStatusRow;
	txHash: string | null;
	failureReason: string | null;
	updatedAt: string;
}

export interface BeneficiaryRow {
	id: string;
	reference: string;
	campaignId: string;
	name: string;
	wallet: string;
	eligibilityNotes: string;
	evidence: EvidenceRow[];
	status: BeneficiaryStatusRow;
	reviewedBy: string | null;
	reviewedAt: string | null;
	rejectionReason: string | null;
	allocation: AllocationRow | null;
	createdAt: string;
}

export interface LedgerRow {
	id: string;
	campaignId: string;
	campaignReference: string;
	type: "funding" | "disbursement";
	amount: string;
	status: "pending" | "processing" | "confirmed" | "failed";
	counterpartyRef: string;
	txHash: string;
	timestamp: string;
}

export interface NotificationRow {
	id: string;
	event: string;
	message: string;
	campaignId: string | null;
	readAt: string | null;
	createdAt: string;
}

export interface MockDb {
	version: number;
	orgs: OrgRow[];
	campaigns: CampaignRow[];
	beneficiaries: BeneficiaryRow[];
	ledger: LedgerRow[];
	notifications: NotificationRow[];
	/** Monotonic counters for references. */
	counters: { beneficiary: number; campaign: number; id: number };
}

/** Bump when the seed's shape changes: stored demo data with an older version is replaced. */
export const SEED_VERSION = 4;

/** The demo organization administrator. Mock data only: there is no secret key behind this address. */
export const DEMO_ADMIN_WALLET = mockAccountId("aidtrace-demo-admin");

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

const FIRST = ["Amara", "Daniel", "Grace", "Joseph", "Fatima", "Kwame", "Aisha", "Samuel", "Ngozi", "Ibrahim", "Esther", "Musa", "Chiamaka", "Peter", "Halima", "Yaw", "Blessing", "Tunde", "Zainab", "David", "Mercy", "Emeka", "Rukayat", "John", "Adaeze", "Moses", "Hauwa", "Kofi", "Ruth", "Abdul"];
const LAST = ["Okafor", "Mensah", "Adebayo", "Kamau", "Hassan", "Boateng", "Bello", "Otieno", "Eze", "Abubakar", "Nwosu", "Wanjiru", "Danjuma", "Owusu", "Akinola", "Mwangi", "Ibrahim", "Achieng", "Obi", "Sule"];
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
	category: CampaignCategory;
	org: { name: string; website: string };
	target: number;
	maxAllocation: number;
	beneficiaryTarget: number;
	eligibility: string[];
	startDaysAgo: number;
	durationDays: number;
	status: CampaignStatusRow;
	featured: boolean;
	raised: number;
	counts: { paid: number; ready: number; approved: number; registered: number; under_review: number; rejected: number; failed?: number };
}

const PLANS: CampaignPlan[] = [
	{
		reference: "CMP-2026-001",
		title: "Clean water for every family",
		description:
			"Bringing safe, reliable drinking water to households in rural communities. Funds cover household water filters, borehole repairs and hygiene kits, paid directly to verified beneficiaries in USDC.",
		category: "water",
		org: { name: "Water for All Foundation", website: "https://waterforall.org" },
		target: 100_000,
		maxAllocation: 250,
		beneficiaryTarget: 400,
		eligibility: ["Households without access to clean water within 2 km", "Resident in a partner community", "Not receiving support from another water program"],
		startDaysAgo: 82,
		durationDays: 120,
		status: "active",
		featured: true,
		raised: 72_000,
		counts: { paid: 94, ready: 2, approved: 6, registered: 8, under_review: 3, rejected: 2, failed: 1 },
	},
	{
		reference: "CMP-2026-002",
		title: "Community emergency relief",
		description:
			"Rapid cash support for families affected by seasonal flooding: food, shelter repairs and essentials, distributed transparently to approved households.",
		category: "food",
		org: { name: "Community Relief Network", website: "https://communityrelief.network" },
		target: 50_000,
		maxAllocation: 200,
		beneficiaryTarget: 250,
		eligibility: ["Household listed in the district flood assessment", "Lost shelter, crops or livelihood in the last 90 days"],
		startDaysAgo: 45,
		durationDays: 90,
		status: "active",
		featured: true,
		raised: 34_500,
		counts: { paid: 60, ready: 0, approved: 5, registered: 6, under_review: 2, rejected: 1 },
	},
	{
		reference: "CMP-2026-003",
		title: "A brighter start for students",
		description: "Covering school fees, uniforms and learning materials for students from low-income households, paid to guardians' wallets each term.",
		category: "education",
		org: { name: "Future First Initiative", website: "https://futurefirst.org" },
		target: 25_000,
		maxAllocation: 150,
		beneficiaryTarget: 160,
		eligibility: ["Enrolled in a partner primary or secondary school", "Household income below the program threshold"],
		startDaysAgo: 30,
		durationDays: 75,
		status: "active",
		featured: true,
		raised: 18_750,
		counts: { paid: 30, ready: 1, approved: 4, registered: 4, under_review: 1, rejected: 1 },
	},
	{
		reference: "CMP-2026-004",
		title: "Safe births, healthy mothers",
		description: "Delivery kits and transport support for expectant mothers in remote villages. Fully funded and fully disbursed.",
		category: "health",
		org: { name: "Mother & Child Care", website: "https://motherandchild.care" },
		target: 15_000,
		maxAllocation: 150,
		beneficiaryTarget: 100,
		eligibility: ["Expectant mother registered at a partner health post", "Lives more than 10 km from a maternity facility"],
		startDaysAgo: 160,
		durationDays: 90,
		status: "closed",
		featured: false,
		raised: 15_000,
		counts: { paid: 100, ready: 0, approved: 0, registered: 0, under_review: 0, rejected: 2 },
	},
];

/** Splits `total` into donation-sized pieces. */
function donations(total: number, rand: () => number) {
	const sizes = [250, 500, 750, 1000, 1500, 2500, 5000];
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
	const rand = prng(20261123);
	const db: MockDb = { version: SEED_VERSION, orgs: [], campaigns: [], beneficiaries: [], ledger: [], notifications: [], counters: { beneficiary: 100, campaign: PLANS.length, id: 1 } };
	const nextId = (prefix: string) => `${prefix}_${(db.counters.id++).toString(36).padStart(6, "0")}`;

	for (const [index, plan] of PLANS.entries()) {
		const start = now - plan.startDaysAgo * DAY;
		const end = start + plan.durationDays * DAY;
		const elapsed = Math.min(now, end) - start;
		const org: OrgRow = { id: nextId("org"), name: plan.org.name, website: plan.org.website, adminWallet: DEMO_ADMIN_WALLET, createdAt: iso(start - 10 * DAY) };
		db.orgs.push(org);
		const campaign: CampaignRow = {
			id: nextId("cmp"),
			reference: plan.reference,
			title: plan.title,
			description: plan.description,
			category: plan.category,
			organizationId: org.id,
			adminWallet: DEMO_ADMIN_WALLET,
			target: usdc(plan.target),
			maxAllocation: usdc(plan.maxAllocation),
			beneficiaryTarget: plan.beneficiaryTarget,
			eligibility: plan.eligibility,
			startsAt: iso(start),
			endsAt: iso(end),
			status: plan.status,
			contractCampaignId: String(index + 1),
			featured: plan.featured,
			createdAt: iso(start - DAY),
		};
		db.campaigns.push(campaign);

		// Funding: donations spread over the campaign so far.
		for (const [i, amount] of donations(plan.raised, rand).entries()) {
			const at = Math.min(start + Math.floor(rand() * elapsed), now - 30 * 60_000);
			db.ledger.push({
				id: nextId("tx"),
				campaignId: campaign.id,
				campaignReference: campaign.reference,
				type: "funding",
				amount: usdc(amount),
				status: "confirmed",
				counterpartyRef: "Public donor",
				txHash: mockTxHash(`${plan.reference}-fund-${i}`),
				timestamp: iso(at),
			});
		}

		// Beneficiaries by status.
		const order: [BeneficiaryStatusRow | "ready" | "failed", number][] = [
			["paid", plan.counts.paid],
			["ready", plan.counts.ready],
			["failed", plan.counts.failed ?? 0],
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
				const created = start + Math.floor((n / (plan.beneficiaryTarget * 0.4)) * elapsed * 0.7) + Math.floor(rand() * DAY);
				const reviewed = created + Math.floor((1 + rand() * 3) * DAY);
				const name = `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`;
				const ev = EVIDENCE[Math.floor(rand() * EVIDENCE.length)]!;
				const status: BeneficiaryStatusRow = kind === "ready" || kind === "failed" ? "allocated" : kind;
				const beneficiary: BeneficiaryRow = {
					id: nextId("ben"),
					reference,
					campaignId: campaign.id,
					name,
					wallet: mockAccountId(`${plan.reference}-${reference}`),
					eligibilityNotes: NOTES[Math.floor(rand() * NOTES.length)]!,
					evidence: [{ id: nextId("ev"), name: ev.name, contentType: ev.contentType, size: 180_000 + Math.floor(rand() * 900_000), uploadedAt: iso(created) }],
					status,
					reviewedBy: status === "registered" || status === "under_review" ? null : DEMO_ADMIN_WALLET,
					reviewedAt: status === "registered" || status === "under_review" ? null : iso(Math.min(reviewed, now - DAY)),
					rejectionReason: status === "rejected" ? "Outside the campaign's service area." : null,
					allocation: null,
					createdAt: iso(Math.min(created, now - 2 * DAY)),
				};
				if (kind === "paid") {
					const paidAt = Math.min(start + Math.floor(elapsed * (0.2 + 0.8 * (k / Math.max(1, count)))), now - 3_600_000 * (count - k));
					const txHash = mockTxHash(`${plan.reference}-pay-${reference}`);
					beneficiary.allocation = { id: nextId("alloc"), amount: campaign.maxAllocation, status: "confirmed", txHash, failureReason: null, updatedAt: iso(paidAt) };
					db.ledger.push({
						id: nextId("tx"),
						campaignId: campaign.id,
						campaignReference: campaign.reference,
						type: "disbursement",
						amount: campaign.maxAllocation,
						status: "confirmed",
						counterpartyRef: reference,
						txHash,
						timestamp: iso(paidAt),
					});
				} else if (kind === "ready") {
					beneficiary.allocation = { id: nextId("alloc"), amount: campaign.maxAllocation, status: "ready", txHash: null, failureReason: null, updatedAt: iso(now - 5 * 3_600_000) };
				} else if (kind === "failed") {
					const txHash = mockTxHash(`${plan.reference}-fail-${reference}`);
					beneficiary.allocation = {
						id: nextId("alloc"),
						amount: campaign.maxAllocation,
						status: "failed",
						txHash,
						failureReason: "The beneficiary wallet has no USDC trustline. Ask them to add USDC, then retry.",
						updatedAt: iso(now - 26 * 3_600_000),
					};
					db.ledger.push({
						id: nextId("tx"),
						campaignId: campaign.id,
						campaignReference: campaign.reference,
						type: "disbursement",
						amount: campaign.maxAllocation,
						status: "failed",
						counterpartyRef: reference,
						txHash,
						timestamp: iso(now - 26 * 3_600_000),
					});
				}
				db.beneficiaries.push(beneficiary);
			}
		}
	}

	db.ledger.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

	const water = db.campaigns[0]!;
	db.notifications.push(
		{ id: nextId("ntf"), event: "application_received", message: "3 new beneficiary applications for Clean water for every family", campaignId: water.id, readAt: null, createdAt: iso(now - 2 * 3_600_000) },
		{ id: nextId("ntf"), event: "payout_failed", message: "A payout to a beneficiary in Clean water for every family failed. No funds were deducted.", campaignId: water.id, readAt: null, createdAt: iso(now - 26 * 3_600_000) },
		{ id: nextId("ntf"), event: "funding_confirmed", message: "2,500 USDC funding confirmed for Clean water for every family", campaignId: water.id, readAt: iso(now - 40 * 3_600_000), createdAt: iso(now - 2 * DAY) },
	);

	return db;
}

// --- derived figures -----------------------------------------------------------------------------------------------

export interface Totals {
	target: bigint;
	raised: bigint;
	allocated: bigint;
	disbursed: bigint;
	available: bigint;
	beneficiariesApproved: number;
	beneficiariesPaid: number;
}

const OPEN_ALLOCATION: PaymentStatusRow[] = ["allocated", "ready", "processing", "failed"];

/** Totals from confirmed ledger rows and open allocations: the numbers always reconcile. */
export function campaignTotals(db: MockDb, campaignId: string): Totals {
	const campaign = db.campaigns.find((c) => c.id === campaignId);
	let raised = 0n;
	let disbursed = 0n;
	for (const row of db.ledger) {
		if (row.campaignId !== campaignId || row.status !== "confirmed") continue;
		if (row.type === "funding") raised += BigInt(row.amount);
		else disbursed += BigInt(row.amount);
	}
	let allocated = 0n;
	let approved = 0;
	let paid = 0;
	for (const b of db.beneficiaries) {
		if (b.campaignId !== campaignId) continue;
		if (b.status === "approved" || b.status === "allocated" || b.status === "paid") approved++;
		if (b.status === "paid") paid++;
		if (b.allocation && OPEN_ALLOCATION.includes(b.allocation.status)) allocated += BigInt(b.allocation.amount);
	}
	return { target: BigInt(campaign?.target ?? "0"), raised, allocated, disbursed, available: raised - disbursed, beneficiariesApproved: approved, beneficiariesPaid: paid };
}

export interface PlatformStats {
	campaigns: number;
	activeCampaigns: number;
	target: bigint;
	raised: bigint;
	disbursed: bigint;
	beneficiariesApproved: number;
	beneficiariesPaid: number;
}

export function platformStats(db: MockDb): PlatformStats {
	const stats: PlatformStats = { campaigns: 0, activeCampaigns: 0, target: 0n, raised: 0n, disbursed: 0n, beneficiariesApproved: 0, beneficiariesPaid: 0 };
	for (const c of db.campaigns) {
		if (c.status === "draft") continue;
		const t = campaignTotals(db, c.id);
		stats.campaigns++;
		if (c.status === "active") stats.activeCampaigns++;
		stats.target += t.target;
		stats.raised += t.raised;
		stats.disbursed += t.disbursed;
		stats.beneficiariesApproved += t.beneficiariesApproved;
		stats.beneficiariesPaid += t.beneficiariesPaid;
	}
	return stats;
}
