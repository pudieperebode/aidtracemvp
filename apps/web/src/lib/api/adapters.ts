import { decimalToStroops } from "@repo/stellar/format";
import type { Allocation, BeneficiaryRecord, Campaign, CampaignTotals, LedgerEntry, PublicCampaign, PublicStats, ReconciliationRow } from "@repo/stellar/campaign";
import type {
	AllocationDto,
	BeneficiaryDto,
	CampaignDto,
	CampaignTotalsDto,
	LedgerEntryDto,
	PublicCampaignDto,
	PublicStatsDto,
	ReconciliationRowDto,
} from "./dto";

/** Backend DTOs → the UI model in `@repo/stellar/campaign`: decimal strings → stroops, ISO → unix seconds. */

const unix = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const unixOrNull = (iso: string | null) => (iso ? unix(iso) : null);

export const toTotals = (t: CampaignTotalsDto): CampaignTotals => ({
	target: decimalToStroops(t.target),
	raised: decimalToStroops(t.raised),
	allocated: decimalToStroops(t.allocated),
	disbursed: decimalToStroops(t.disbursed),
	available: decimalToStroops(t.available),
	beneficiaries_approved: t.beneficiariesApproved,
	beneficiaries_paid: t.beneficiariesPaid,
});

export const toCampaign = (c: CampaignDto): Campaign & { totals: CampaignTotals } => ({
	id: c.id,
	reference: c.reference,
	title: c.title,
	description: c.description,
	organization: c.organization,
	category: c.category,
	featured: c.featured,
	admin_wallet: c.adminWallet,
	target: decimalToStroops(c.target),
	max_allocation: decimalToStroops(c.maxAllocation),
	beneficiary_target: c.beneficiaryTarget,
	eligibility: c.eligibility,
	starts_at: unix(c.startsAt),
	ends_at: unix(c.endsAt),
	status: c.status,
	contract_campaign_id: c.contractCampaignId,
	created_at: unix(c.createdAt),
	totals: toTotals(c.totals),
});

export const toPublicCampaign = (c: PublicCampaignDto): PublicCampaign => ({
	id: c.id,
	reference: c.reference,
	title: c.title,
	description: c.description,
	organization: c.organization,
	category: c.category,
	featured: c.featured,
	beneficiary_target: c.beneficiaryTarget,
	eligibility: c.eligibility,
	starts_at: unix(c.startsAt),
	ends_at: unix(c.endsAt),
	status: c.status,
	totals: toTotals(c.totals),
});

export const toPublicStats = (s: PublicStatsDto): PublicStats => ({
	campaigns: s.campaigns,
	active_campaigns: s.activeCampaigns,
	target: decimalToStroops(s.target),
	raised: decimalToStroops(s.raised),
	disbursed: decimalToStroops(s.disbursed),
	beneficiaries_approved: s.beneficiariesApproved,
	beneficiaries_paid: s.beneficiariesPaid,
});

export const toAllocation = (a: AllocationDto): Allocation => ({
	id: a.id,
	beneficiary_id: a.beneficiaryId,
	campaign_id: a.campaignId,
	amount: decimalToStroops(a.amount),
	status: a.status,
	tx_hash: a.txHash,
	failure_reason: a.failureReason,
	updated_at: unix(a.updatedAt),
});

export const toBeneficiary = (b: BeneficiaryDto): BeneficiaryRecord => ({
	id: b.id,
	reference: b.reference,
	campaign_id: b.campaignId,
	name: b.name,
	wallet: b.wallet,
	eligibility_notes: b.eligibilityNotes,
	evidence: b.evidence.map((e) => ({ id: e.id, name: e.name, content_type: e.contentType, size: e.size, uploaded_at: unix(e.uploadedAt) })),
	status: b.status,
	reviewed_by: b.reviewedBy,
	reviewed_at: unixOrNull(b.reviewedAt),
	rejection_reason: b.rejectionReason,
	allocation: b.allocation ? toAllocation(b.allocation) : null,
	created_at: unix(b.createdAt),
});

export const toLedgerEntry = (e: LedgerEntryDto): LedgerEntry => ({
	id: e.id,
	campaign_reference: e.campaignReference,
	type: e.type,
	amount: decimalToStroops(e.amount),
	status: e.status,
	counterparty_ref: e.counterpartyRef,
	tx_hash: e.txHash,
	timestamp: unix(e.timestamp),
});

export const toReconciliationRow = (r: ReconciliationRowDto): ReconciliationRow => ({
	beneficiary_reference: r.beneficiaryReference,
	allocated: decimalToStroops(r.allocated),
	paid: decimalToStroops(r.paid),
	tx_hash: r.txHash,
	matched: r.matched,
});
