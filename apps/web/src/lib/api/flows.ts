import type { AxiosInstance } from "axios";
import { Horizon, TransactionBuilder } from "@stellar/stellar-sdk";
import { HORIZON_URL } from "@repo/stellar/network";
import { toBeneficiary, toCampaign } from "./adapters";
import type { BeneficiaryDto, CampaignDto, Envelope, OrganizationDto, PreparedTxDto } from "./dto";
import { isMockXdr, mockSubmit } from "@/mock/chain";

/**
 * Every write. Plain functions of an axios instance and a `Signer`, so scripts can run them with a Testnet keypair.
 * PROVISIONAL paths until the backend publishes its OpenAPI.
 *
 * On-chain writes follow one pattern: the backend prepares the Soroban transaction (`PreparedTxDto`), the admin
 * wallet signs it, the app submits it, then reports the hash to the backend (`…/sync`), which verifies the result on
 * chain before any balance changes. A submitted hash is never treated as proof of payment (Deliverable 2).
 */

/** Something that can sign a transaction for one account: the connected wallet, or a keypair in scripts. */
export interface Signer {
	address: string;
	sign: (xdr: string, networkPassphrase: string) => Promise<string>;
}

const horizon = new Horizon.Server(HORIZON_URL);

/** Signs a prepared transaction, submits it to Testnet and returns its hash. */
async function signAndSubmit(prepared: PreparedTxDto, signer: Signer): Promise<string> {
	const signed = await signer.sign(prepared.xdr, prepared.networkPassphrase);
	// Mock mode: the mock backend prepared a placeholder transaction; "submit" waits a ledger and returns a hash.
	if (isMockXdr(prepared.xdr)) return mockSubmit(signed);
	const tx = TransactionBuilder.fromXDR(signed, prepared.networkPassphrase);
	const result = await horizon.submitTransaction(tx);
	return result.hash;
}

/** Prepare → sign → submit → sync. Returns the backend's verdict after it checked the hash on chain. */
async function onChain<T>(http: AxiosInstance, path: string, body: unknown, signer: Signer): Promise<{ hash: string; result: T }> {
	const { data: prepared } = await http.post<Envelope<PreparedTxDto>>(path, body);
	const hash = await signAndSubmit(prepared.data, signer);
	const { data } = await http.post<Envelope<T>>(`${path}/sync`, { intentId: prepared.data.intentId, txHash: hash });
	return { hash, result: data.data };
}

// --- Organizations and campaigns (Deliverable 1) -----------------------------------------------------------------

export interface RegisterOrganizationInput {
	name: string;
}

/** The signed-in wallet becomes the organization's authorized administrator. */
export async function registerOrganization(http: AxiosInstance, input: RegisterOrganizationInput) {
	const { data } = await http.post<Envelope<OrganizationDto>>("/organizations", input);
	return data.data;
}

export interface CreateCampaignInput {
	title: string;
	description: string;
	organizationName: string;
	organizationWebsite: string;
	category: "water" | "food" | "education" | "health";
	/** Decimal USDC strings ("2000"). */
	target: string;
	maxAllocation: string;
	beneficiaryTarget: number;
	eligibility: string[];
	/** ISO dates. */
	startsAt: string;
	endsAt: string;
}

/** Creates the campaign off-chain (draft), then registers it in the Soroban contract with the admin wallet. `onDraft` lets the UI show the reference before signing. */
export async function createCampaign(http: AxiosInstance, input: CreateCampaignInput, signer: Signer, onDraft?: (draft: { id: string; reference: string }) => void) {
	const { data } = await http.post<Envelope<CampaignDto>>("/campaigns", input);
	onDraft?.({ id: data.data.id, reference: data.data.reference });
	const { result, hash } = await onChain<CampaignDto>(http, `/campaigns/${data.data.id}/register`, {}, signer);
	return { campaign: toCampaign(result), hash };
}

/** Registers an existing draft on chain (retry after a declined or failed registration). */
export async function registerCampaign(http: AxiosInstance, id: string, signer: Signer) {
	const { result } = await onChain<CampaignDto>(http, `/campaigns/${id}/register`, {}, signer);
	return toCampaign(result);
}

export async function updateCampaign(http: AxiosInstance, id: string, input: Partial<Pick<CreateCampaignInput, "title" | "description" | "eligibility" | "endsAt">>) {
	const { data } = await http.patch<Envelope<CampaignDto>>(`/campaigns/${id}`, input);
	return toCampaign(data.data);
}

// --- Beneficiaries (Deliverable 1) ---------------------------------------------------------------------------------

export interface BeneficiaryInput {
	name: string;
	wallet: string;
	eligibilityNotes: string;
	/** Supporting evidence, uploaded to protected storage. */
	evidence: File[];
}

function beneficiaryForm(input: BeneficiaryInput) {
	const form = new FormData();
	form.set("name", input.name);
	form.set("wallet", input.wallet);
	form.set("eligibilityNotes", input.eligibilityNotes);
	for (const file of input.evidence) form.append("evidence", file);
	return form;
}

/** Public application form (no session): the record starts as `registered`. */
export async function applyAsBeneficiary(http: AxiosInstance, campaignReference: string, input: BeneficiaryInput) {
	const { data } = await http.post<Envelope<{ reference: string }>>(`/public/campaigns/${encodeURIComponent(campaignReference)}/applications`, beneficiaryForm(input), {
		headers: { "Content-Type": "multipart/form-data" },
	});
	return data.data;
}

/** An administrator registers a beneficiary directly. */
export async function registerBeneficiary(http: AxiosInstance, campaignId: string, input: BeneficiaryInput) {
	const { data } = await http.post<Envelope<BeneficiaryDto>>(`/campaigns/${campaignId}/beneficiaries`, beneficiaryForm(input), {
		headers: { "Content-Type": "multipart/form-data" },
	});
	return toBeneficiary(data.data);
}

export type ReviewDecision = { decision: "under_review" } | { decision: "approved" } | { decision: "rejected"; reason: string };

export async function reviewBeneficiary(http: AxiosInstance, campaignId: string, beneficiaryId: string, review: ReviewDecision) {
	const { data } = await http.post<Envelope<BeneficiaryDto>>(`/campaigns/${campaignId}/beneficiaries/${beneficiaryId}/review`, review);
	return toBeneficiary(data.data);
}

// --- Funding, allocation and disbursement (Deliverable 2) ----------------------------------------------------------

/** The admin wallet deposits Testnet USDC into the campaign's contract escrow. */
export function fundCampaign(http: AxiosInstance, campaignId: string, amount: string, signer: Signer) {
	return onChain<CampaignDto>(http, `/campaigns/${campaignId}/funding`, { amount }, signer);
}

/** Records an approved beneficiary's allocation in the contract (wallet + amount). */
export function allocate(http: AxiosInstance, campaignId: string, beneficiaryId: string, amount: string, signer: Signer) {
	return onChain<BeneficiaryDto>(http, `/campaigns/${campaignId}/beneficiaries/${beneficiaryId}/allocation`, { amount }, signer);
}

/** Cancels an unpaid allocation (`cancelled`); funds stay in escrow. */
export function cancelAllocation(http: AxiosInstance, campaignId: string, beneficiaryId: string, signer: Signer) {
	return onChain<BeneficiaryDto>(http, `/campaigns/${campaignId}/beneficiaries/${beneficiaryId}/allocation/cancel`, {}, signer);
}

/** Executes one authorized payout. The contract rejects duplicates, unapproved wallets and insufficient balance. */
export function disburse(http: AxiosInstance, campaignId: string, beneficiaryId: string, signer: Signer) {
	return onChain<BeneficiaryDto>(http, `/campaigns/${campaignId}/beneficiaries/${beneficiaryId}/payout`, {}, signer);
}

export async function markNotificationsRead(http: AxiosInstance) {
	await http.post("/notifications/read-all");
}
