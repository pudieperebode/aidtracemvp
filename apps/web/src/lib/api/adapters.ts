import { decimalToStroops } from "@repo/stellar/format";
import type {
	Allocation,
	Beneficiary,
	BeneficiaryRecord,
	CampaignTotals,
	LedgerEntry,
	ManagedCampaign,
	Organization,
	PublicCampaign,
	PublicStats,
	Reconciliation,
} from "@repo/stellar/campaign";
import type {
	AllocationDto,
	BeneficiaryDetailDto,
	BeneficiaryDto,
	CampaignDto,
	LedgerEntryDto,
	NotificationDto,
	OrganizationDto,
	PaginationMeta,
	PublicCampaignDto,
	PublicStatsDto,
	ReconciliationDto,
	UnreadCountDto,
} from "./dto";

/** Backend DTOs → the UI model in `@repo/stellar/campaign`: decimal strings → stroops, ISO → unix seconds. */

const unix = (iso: string | undefined | null) => (iso ? Math.floor(Date.parse(iso) / 1000) : 0);
const unixOrNull = (iso: string | null | undefined) => (iso ? unix(iso) : null);
const stroops = (decimal: string | null | undefined) => decimalToStroops(decimal || "0");

/** A page of results in the shape the screens use. */
export interface Page<T> {
	results: T[];
	total: number;
}

export const toPage = <D, T>(page: { result: D[]; paginationMeta: PaginationMeta }, map: (d: D) => T): Page<T> => ({
	results: page.result.map(map),
	total: page.paginationMeta.totalCount,
});

export const toTotals = (targetAmount: string, t: CampaignDto["totals"]): CampaignTotals => ({
	target: stroops(targetAmount),
	raised: stroops(t.raised),
	allocated: stroops(t.allocated),
	disbursed: stroops(t.disbursed),
	recovered: stroops(t.recovered),
	available: stroops(t.availableBalance),
	beneficiaries_approved: t.beneficiariesApproved,
	beneficiaries_paid: t.beneficiariesPaid,
});

export const toCampaign = (c: CampaignDto): ManagedCampaign => ({
	reference: c.reference,
	title: c.title,
	description: c.description,
	eligibility_requirements: c.eligibilityRequirements,
	category: c.category ?? null,
	featured: !!c.featured,
	organization: { name: c.organization.name, website_url: c.organization.websiteUrl },
	admin_wallet: c.adminWallet,
	target: stroops(c.targetAmount),
	max_allocation: stroops(c.maxAllocation),
	beneficiary_target: c.beneficiaryTarget,
	starts_at: unix(c.startsAt),
	ends_at: unix(c.endsAt),
	status: c.status,
	display_status: c.displayStatus ?? c.status,
	created_at: unix(c.createdAt),
	updated_at: unix(c.updatedAt),
	totals: toTotals(c.targetAmount, c.totals),
});

export const toPublicCampaign = (c: PublicCampaignDto): PublicCampaign => ({
	reference: c.reference,
	title: c.title,
	description: c.description,
	eligibility_requirements: c.eligibilityRequirements,
	category: c.category ?? null,
	featured: !!c.featured,
	organization: { name: c.organization.name, website_url: c.organization.websiteUrl },
	beneficiary_target: c.beneficiaryTarget,
	starts_at: unix(c.startsAt),
	ends_at: unix(c.endsAt),
	status: c.status,
	display_status: c.displayStatus ?? c.status,
	totals: toTotals(c.targetAmount, c.totals),
});

export const toPublicStats = (s: PublicStatsDto): PublicStats => ({
	campaigns: s.campaigns,
	active_campaigns: s.activeCampaigns,
	organizations: s.organizations,
	target: stroops(s.totalTarget),
	raised: stroops(s.totalRaised),
	disbursed: stroops(s.totalDisbursed),
	beneficiaries_approved: s.beneficiariesApproved ?? 0,
	beneficiaries_paid: s.beneficiariesPaid,
	verified_transactions: s.verifiedTransactions,
});

export const toOrganization = (o: OrganizationDto): Organization => ({
	id: o.id,
	name: o.name,
	description: o.description ?? null,
	website_url: o.websiteUrl ?? null,
	admin_wallet: o.adminWallet ?? null,
});

export const toBeneficiary = (b: BeneficiaryDto): Beneficiary => ({
	id: b.id,
	reference: b.reference,
	full_name: b.fullName ?? null,
	wallet: b.walletAddress,
	status: b.status,
	eligibility_status: b.eligibilityStatus,
	reviewed_at: unixOrNull(b.reviewedAt),
	created_at: unix(b.createdAt),
});

export const toBeneficiaryRecord = (b: BeneficiaryDetailDto): BeneficiaryRecord => ({
	...toBeneficiary(b),
	full_name: b.profile.fullName,
	email: b.profile.email,
	phone: b.profile.phone,
	eligibility_details: b.profile.eligibilityDetails,
	review_note: b.profile.reviewNote,
	evidence: b.evidence.map((e) => ({
		id: e.id,
		content_type: e.contentType,
		size: e.sizeBytes,
		sha256: e.sha256,
		uploaded_at: unix(e.createdAt),
	})),
});

export const toAllocation = (a: AllocationDto): Allocation => ({
	id: a.id,
	reference: a.reference,
	beneficiary_id: a.beneficiaryId,
	beneficiary_reference: a.beneficiaryReference,
	wallet: a.walletAddress,
	amount: stroops(a.amount),
	status: a.status,
	payout_tx_hash: a.payoutTxHash,
	explorer_url: a.explorerUrl,
	paid_at: unixOrNull(a.paidAt),
	cancelled_at: unixOrNull(a.cancelledAt),
	created_at: unix(a.createdAt),
});

export const toLedgerEntry = (e: LedgerEntryDto): LedgerEntry => ({
	id: e.id,
	campaign_reference: e.campaignReference,
	type: e.type,
	amount: stroops(e.amount),
	status: e.status ?? "confirmed",
	recipient_reference: e.recipientReference,
	timestamp: unix(e.timestamp),
	ledger: e.ledger ?? null,
	tx_hash: e.transactionHash,
	explorer_url: e.explorerUrl ?? null,
	failure_code: e.failureCode ?? null,
});

export const toReconciliation = (r: ReconciliationDto): Reconciliation => ({
	reconciled: r.reconciled,
	checked_at: r.checkedAt ? unix(r.checkedAt) : Math.floor(Date.now() / 1000),
	payouts: (r.payouts?.items ?? []).map((p) => ({
		allocation_reference: p.allocationReference,
		amount: stroops(p.amount),
		tx_hash: p.transactionHash ?? null,
		matched: p.matched,
		issue: p.issue ?? null,
	})),
});

export interface AppNotification {
	id: string;
	event: string;
	message: string;
	campaign_reference: string | null;
	read: boolean;
	created_at: Timestamp;
}

type Timestamp = number;

export const toNotification = (n: NotificationDto): AppNotification => ({
	id: n.id,
	event: n.event ?? n.type ?? "update",
	message: n.message ?? n.body ?? n.title ?? "",
	campaign_reference: n.campaignReference ?? null,
	read: !!n.readAt,
	created_at: unix(n.createdAt),
});

export const toUnreadCount = (u: UnreadCountDto): number => (typeof u === "number" ? u : "count" in u ? u.count : u.unread);
