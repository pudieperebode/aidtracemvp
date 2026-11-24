import type { AxiosInstance } from "axios";
import { toAllocation, toBeneficiary, toCampaign, toOrganization, toReconciliation } from "./adapters";
import type {
	AllocationDto,
	BeneficiaryDto,
	CampaignDto,
	CancelAllocationDto,
	ChainActionDto,
	Envelope,
	OrganizationDto,
	ReconciliationDto,
	WalletDto,
	WalletTransactionDto,
} from "./dto";
import { getAction } from "./endpoints";
import { ActionError } from "./errors";
import { IS_MOCK } from "@/lib/mode";

/**
 * Every write. Plain functions of an axios instance and a `Signer`, so scripts can run them with a Testnet keypair.
 *
 * Money actions (fund, lock, payout, locked cancel, recover) follow one pattern: the backend prepares a transaction,
 * the admin wallet signs it **unchanged**, and the app sends the signed XDR back to the backend, which co-signs and
 * submits it. The app never submits escrow transactions to Stellar itself. Only `confirmed` means it happened; a
 * `200` with `failed` means no funds moved. The backend owns state: callers refetch afterwards, never guess.
 */

/** Something that can sign a transaction for one account: the connected wallet, or a keypair in scripts. */
export interface Signer {
	address: string;
	sign: (xdr: string, networkPassphrase: string) => Promise<string>;
}

/** Where a money action is: waiting for the wallet, then confirming on Stellar. */
export type ActionStage = "signing" | "submitting";

/** The guide: poll every 3 s (never faster), up to 30 times. The mock backend settles in about a second. */
const POLL_MS = IS_MOCK ? 700 : 3000;
const POLL_TRIES = 30;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ref = (reference: string) => encodeURIComponent(reference);

/**
 * Sign → submit → poll for one prepared action. Resolves only when the backend reports `confirmed`. Throws an
 * `ActionError` for `failed` / `expired` (nothing moved) and for `pending` after the polling window (the backend
 * still settles it: refetch later, never prepare the same payment again).
 */
export async function runAction(
	http: AxiosInstance,
	reference: string,
	prepared: ChainActionDto,
	signer: Signer,
	onStage?: (stage: ActionStage) => void,
): Promise<ChainActionDto> {
	if (prepared.status !== "prepared" || !prepared.transaction)
		throw new ActionError(
			prepared.statusMessage || "This transaction can't be signed any more. Try again.",
			"TRANSACTION_EXPIRED",
		);
	onStage?.("signing");
	const signedTransaction = await signer.sign(prepared.transaction, prepared.networkPassphrase);
	onStage?.("submitting");
	const { data } = await http.post<Envelope<ChainActionDto>>(
		`/campaigns/${ref(reference)}/actions/${encodeURIComponent(prepared.id)}/submit`,
		{ signedTransaction },
	);
	let action = data.data;
	for (let i = 0; i < POLL_TRIES && action.status === "pending"; i++) {
		await wait(POLL_MS);
		action = await getAction(http, reference, prepared.id);
	}
	if (action.status === "confirmed") return action;
	if (action.status === "pending")
		throw new ActionError(
			"Still confirming on Stellar. AidTrace keeps checking; refresh in a minute. Don't send it again.",
			"PENDING",
			action.hash,
		);
	if (action.status === "expired")
		throw new ActionError(
			action.statusMessage || "The transaction expired before it was signed. No funds moved.",
			"TRANSACTION_EXPIRED",
			action.hash,
		);
	throw new ActionError(
		action.statusMessage || "The transaction failed on Stellar. No funds moved.",
		action.failureCode ?? "TRANSACTION_FAILED",
		action.hash,
	);
}

async function prepareAndRun(
	http: AxiosInstance,
	reference: string,
	path: string,
	body: unknown,
	signer: Signer,
	onStage?: (stage: ActionStage) => void,
) {
	const { data } = await http.post<Envelope<ChainActionDto>>(`/campaigns/${ref(reference)}${path}`, body);
	return runAction(http, reference, data.data, signer, onStage);
}

// --- Organizations and campaigns (Deliverable 1) -----------------------------------------------------------------

export interface RegisterOrganizationInput {
	name: string;
	description?: string;
	websiteUrl?: string;
}

/** The signed-in wallet becomes the organization's authorized administrator wallet. One organization per wallet. */
export async function registerOrganization(http: AxiosInstance, input: RegisterOrganizationInput) {
	const { data } = await http.post<Envelope<OrganizationDto>>("/organizations", input);
	return toOrganization(data.data);
}

export interface CreateCampaignInput {
	title: string;
	description: string;
	eligibilityRequirements: string;
	/** Optional, 2 to 40 characters ("Food security"). */
	category?: string;
	/** Decimal USDC strings ("2000"). */
	targetAmount: string;
	maxAllocation: string;
	beneficiaryTarget: number;
	/** ISO 8601. */
	startsAt: string;
	endsAt: string;
}

/** Creates a `draft`. */
export async function createCampaign(http: AxiosInstance, input: CreateCampaignInput) {
	const { data } = await http.post<Envelope<CampaignDto>>("/campaigns", input);
	return toCampaign(data.data);
}

/** `draft` → `active`. No signature. After publishing only title, description, category and end date can change. */
export async function publishCampaign(http: AxiosInstance, reference: string) {
	const { data } = await http.post<Envelope<CampaignDto>>(`/campaigns/${ref(reference)}/publish`);
	return toCampaign(data.data);
}

export async function updateCampaign(http: AxiosInstance, reference: string, input: Partial<CreateCampaignInput>) {
	const { data } = await http.patch<Envelope<CampaignDto>>(`/campaigns/${ref(reference)}`, input);
	return toCampaign(data.data);
}

// --- Beneficiaries (Deliverable 1) ---------------------------------------------------------------------------------

export interface BeneficiaryInput {
	fullName: string;
	email?: string;
	phone?: string;
	walletAddress: string;
	eligibilityDetails: string;
}

const optional = (input: BeneficiaryInput) => ({ ...input, email: input.email || undefined, phone: input.phone || undefined });

/**
 * Public application, with up to 5 evidence files (multipart field `files`; one bad file rejects the whole
 * application). Always `202 { received: true }`, even when this wallet already applied, so the form reveals nothing.
 */
export async function applyToCampaign(
	http: AxiosInstance,
	reference: string,
	input: BeneficiaryInput & { email: string },
	files: File[] = [],
) {
	const path = `/public/campaigns/${ref(reference)}/applications`;
	if (!files.length) return void (await http.post(path, optional(input)));
	const form = new FormData();
	for (const [key, value] of Object.entries(optional(input))) if (value) form.set(key, value);
	for (const file of files) form.append("files", file);
	await http.post(path, form, { headers: { "Content-Type": "multipart/form-data" } });
}

/** An administrator registers a beneficiary directly; evidence is uploaded file by file afterwards. */
export async function registerBeneficiary(http: AxiosInstance, reference: string, input: BeneficiaryInput) {
	const { data } = await http.post<Envelope<BeneficiaryDto>>(`/campaigns/${ref(reference)}/beneficiaries`, optional(input));
	return toBeneficiary(data.data);
}

const fileForm = (file: File) => {
	const form = new FormData();
	form.set("file", file);
	return form;
};

/** PDF, PNG or JPEG, up to 5 MB, at most 5 per application. Frozen once a decision is made. */
export async function uploadBeneficiaryEvidence(http: AxiosInstance, reference: string, beneficiaryId: string, file: File) {
	await http.post(`/campaigns/${ref(reference)}/beneficiaries/${encodeURIComponent(beneficiaryId)}/evidence`, fileForm(file), {
		headers: { "Content-Type": "multipart/form-data" },
	});
}

/** The applicant's own evidence upload, from the private status page. */
export async function uploadApplicationEvidence(http: AxiosInstance, token: string, file: File) {
	await http.post("/applications/me/evidence", fileForm(file), {
		headers: { "Content-Type": "multipart/form-data", "x-application-token": token },
	});
}

export type ReviewDecision = "start_review" | "approve" | "reject" | "reopen";

/** `registered → start_review → under_review → approve | reject`; `reopen` returns a decision to review. The note is shown to the applicant. */
export async function reviewBeneficiary(
	http: AxiosInstance,
	reference: string,
	beneficiaryId: string,
	decision: ReviewDecision,
	note?: string,
) {
	const { data } = await http.post<Envelope<BeneficiaryDto>>(
		`/campaigns/${ref(reference)}/beneficiaries/${encodeURIComponent(beneficiaryId)}/review`,
		{
			decision,
			note: note || undefined,
		},
	);
	return toBeneficiary(data.data);
}

/** Sends the applicant a new private status link; the old one stops working. */
export async function resendStatusLink(http: AxiosInstance, reference: string, beneficiaryId: string) {
	await http.post(`/campaigns/${ref(reference)}/beneficiaries/${encodeURIComponent(beneficiaryId)}/status-link`);
}

/** Downloads a file (evidence, CSV) through the authenticated client. Never opened in an iframe. */
async function download(http: AxiosInstance, path: string, fallbackName: string, type: string) {
	const res = await http.get(path, { responseType: "blob" });
	const name = /filename="?([^";]+)"?/.exec(String(res.headers?.["content-disposition"] ?? ""))?.[1];
	const blob =
		res.data instanceof Blob
			? res.data
			: new Blob([typeof res.data === "string" ? res.data : JSON.stringify(res.data)], { type });
	const url = URL.createObjectURL(blob);
	const a = Object.assign(document.createElement("a"), { href: url, download: name ?? fallbackName });
	a.click();
	URL.revokeObjectURL(url);
}

export const downloadEvidence = (
	http: AxiosInstance,
	reference: string,
	beneficiaryId: string,
	fileId: string,
	fallbackName: string,
) =>
	download(
		http,
		`/campaigns/${ref(reference)}/beneficiaries/${encodeURIComponent(beneficiaryId)}/evidence/${encodeURIComponent(fileId)}`,
		fallbackName,
		"application/octet-stream",
	);

// --- Funding, allocation and disbursement (Deliverable 2) ----------------------------------------------------------

/** The admin wallet locks Testnet USDC (at least 1) in the campaign's escrow pool. */
export const fundCampaign = (
	http: AxiosInstance,
	reference: string,
	amount: string,
	signer: Signer,
	onStage?: (stage: ActionStage) => void,
) => prepareAndRun(http, reference, "/escrow/fund", { amount }, signer, onStage);

/** Assigns amounts to approved beneficiaries. Off-chain, no signature, all or nothing, up to 100 items. */
export async function createAllocations(
	http: AxiosInstance,
	reference: string,
	items: { beneficiaryId: string; amount: string }[],
) {
	const { data } = await http.post<Envelope<AllocationDto[] | { result?: AllocationDto[]; items?: AllocationDto[] }>>(
		`/campaigns/${ref(reference)}/allocations`,
		{ items },
	);
	const list = Array.isArray(data.data) ? data.data : (data.data?.result ?? data.data?.items ?? []);
	return list.map(toAllocation);
}

/** Locks allocations into one claimable balance each ("Ready for payment"). One signature for up to 20. */
export const lockAllocations = (
	http: AxiosInstance,
	reference: string,
	allocationIds: string[],
	signer: Signer,
	onStage?: (stage: ActionStage) => void,
) => prepareAndRun(http, reference, "/escrow/lock", { allocationIds }, signer, onStage);

/** Pays one locked allocation. Batches run one at a time (each uses the wallet's next sequence number). */
export const payout = (
	http: AxiosInstance,
	reference: string,
	allocationId: string,
	signer: Signer,
	onStage?: (stage: ActionStage) => void,
) => prepareAndRun(http, reference, `/allocations/${encodeURIComponent(allocationId)}/payout`, {}, signer, onStage);

/** Cancels an unpaid allocation: at once when unlocked; a locked one returns a transaction that moves its funds back to the pool. */
export async function cancelAllocation(
	http: AxiosInstance,
	reference: string,
	allocationId: string,
	signer: Signer,
	onStage?: (stage: ActionStage) => void,
) {
	const { data } = await http.post<Envelope<CancelAllocationDto>>(
		`/campaigns/${ref(reference)}/allocations/${encodeURIComponent(allocationId)}/cancel`,
	);
	if (data.data.status === "needs_signature") await runAction(http, reference, data.data.action, signer, onStage);
}

// --- Reports -------------------------------------------------------------------------------------------------------

/** Checks payouts, ledger and balances on Stellar. Can take several seconds; rate limited. */
export async function reconcileCampaign(http: AxiosInstance, reference: string) {
	const { data } = await http.post<Envelope<ReconciliationDto>>(`/campaigns/${ref(reference)}/reconciliation`);
	return toReconciliation(data.data);
}

/** The organization CSV (allocation references only, never names). */
export const downloadReportCsv = (http: AxiosInstance, reference: string, fallbackName: string) =>
	download(http, `/campaigns/${ref(reference)}/report.csv`, fallbackName, "text/csv");

// --- Wallet readiness ------------------------------------------------------------------------------------------------

/** Friendbot test XLM for the signed-in wallet (creates the account on Testnet). */
export async function fundWalletWithXlm(http: AxiosInstance) {
	await http.post("/wallet/fund");
}

/** Enables USDC: the backend prepares the trustline, the wallet signs, the backend checks and submits it. */
export async function enableUsdc(http: AxiosInstance, signer: Signer) {
	const { data: prepared } = await http.post<Envelope<WalletTransactionDto>>("/wallet/trustline", { asset: "USDC" });
	const signedXdr = await signer.sign(prepared.data.xdr, prepared.data.networkPassphrase);
	const { data } = await http.post<Envelope<WalletDto>>("/wallet/trustline/submit", { signedXdr });
	return data.data;
}

export async function markNotificationsRead(http: AxiosInstance) {
	await http.post("/notifications/read-all");
}
