# AidTrace Frontend Integration Guide

**Audience:** the frontend developer building the AidTrace web app. The backend is in a separate repository, so treat this file as the API contract. If the API behaves differently from this guide, report it rather than working around it.

## 1. Rules that must not be broken

1. **Never submit an escrow transaction to Stellar yourself.** The wallet only signs. Send the signed XDR to the backend's submit route. Most escrow transactions need a second server signature and fail if submitted directly.
2. **Sign the returned XDR unchanged.** Editing the fee, memo, or time bounds changes its hash, and the API rejects it with `400`.
3. **Never ask for a secret key or seed phrase.** Wallet extensions do all signing.
4. **The backend owns state.** After every action, refetch. Never mark something paid, approved, or funded optimistically.
5. **A `200` from submit is not success.** Read `data.status`. Only `confirmed` means it happened.
6. **Amounts are decimal strings.** Send `"100.50"`, never `100.5`. Do not do money math with JavaScript numbers.
7. **Do not call it a smart contract.** AidTrace uses Stellar claimable balances. There is no Soroban contract or contract address to show.
8. **Show the privacy notice** on public ledger pages: *"Names and personal details are never published, but Stellar payments and wallet addresses are publicly visible."*
9. **Never put a beneficiary's name, contact details, or evidence in a URL, analytics event, or client log.**

## 2. Environment

```bash
# Use your framework's public-variable prefix.
NEXT_PUBLIC_AIDTRACE_API_URL=http://localhost:4000/api/v1
```

- The URL includes `/api/v1` and has no trailing slash.
- The frontend's origin must be in the backend's `FRONTEND_URL` or `CORS_ORIGINS`. A browser CORS error usually means it is missing.
- Interactive docs are at `/docs` on the API host when Swagger is enabled.
- Network: **Stellar Testnet**, passphrase `Test SDF Network ; September 2015`. Every prepared transaction also returns `networkPassphrase`.
- Asset: Circle test USDC, `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. Test USDC comes from [faucet.circle.com](https://faucet.circle.com).
- Explorer links are returned by the API. Do not build them yourself.

## 3. Response and error format

Success:

```json
{ "statusCode": 200, "message": "Campaign", "data": {} }
```

Paginated `data`. Query with `?limit=20&offset=0`. `limit` is at most 100.

```json
{
  "result": [],
  "paginationMeta": {
    "nextPage": false,
    "previousPage": false,
    "currentPage": 1,
    "totalPage": 1,
    "totalCount": 0,
    "pageCount": 0
  }
}
```

Every error:

```json
{
  "statusCode": 400,
  "message": "Please fix the 2 highlighted fields",
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "fields": [
      { "field": "title", "message": "title must be longer than or equal to 3 characters" },
      { "field": "items.0.amount", "message": "amount must be a positive amount as text, with up to 7 decimal places, like \"100.50\"" }
    ],
    "requestId": "0197c2a4-...",
    "traceId": "...",
    "timestamp": "2026-11-23T12:00:00.000Z",
    "path": "/api/v1/campaigns"
  }
}
```

- **`message`** is written for users. Show it.
- **`error.code`** is stable. Branch on it, never on `message`.
- **`error.fields`** lists every invalid input. Paths are zero-based, so `items.0.amount` is the first item.
- **`error.retryAfterSeconds`** is present on `429`, along with a `Retry-After` header.
- **`error.requestId`** belongs in support logs.

### Status codes

| Status | Meaning | What to do |
| --- | --- | --- |
| 200, 201, 202 | Success | Read `data` |
| 204 | Success, no body | Only `POST /auth/logout` |
| 400 | Invalid input | Show `error.fields` or `message` |
| 401 | Not signed in, or session ended | Refresh once, then show **Connect wallet** |
| 403 | Signed in but not allowed | Show `message` |
| 404 | Not found, **or not yours** | Show not found. Private routes do not confirm what exists |
| 409 | Valid request, wrong state | Show `message` and refetch |
| 413 | File or body too large | Show `message` |
| 422 | Wallet or account not ready | Show the matching prompt below |
| 429 | Rate limited | Disable the button for `retryAfterSeconds` |
| 500 | Server error | Show `message` and log `requestId` |
| 503 | Stellar or a service is unavailable | Show a retry state |

### Error codes

| Status | Code | UI behavior |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | Show `error.fields` under the inputs |
| 400 | `INVALID_JSON`, `INVALID_ID`, `INVALID_FORMAT`, `INVALID_CHARACTERS`, `OUT_OF_RANGE` | Frontend bug: log it |
| 400 | `INVALID_ADDRESS` | Show under the wallet input |
| 400 | `INVALID_AMOUNT`, `AMOUNT_TOO_SMALL` | Show under the amount input |
| 400 | `INVALID_CAMPAIGN_TERMS`, `INVALID_CAMPAIGN_DATES` | Show on the campaign form |
| 400 | `INVALID_DATE_RANGE`, `INVALID_CAMPAIGN_REFERENCE`, `INVALID_LOCK_SIZE`, `DUPLICATE_BENEFICIARY` | Show `message` |
| 400 | `FILE_REQUIRED`, `UNSUPPORTED_FILE_TYPE` | Show on the upload control |
| 400 | `CHALLENGE_EXPIRED` | Restart wallet sign-in. Each challenge works once and lasts 5 minutes |
| 400 | `INVALID_SIGNATURE`, `SIGNATURE_MISSING`, `INVALID_TRANSACTION` | Say the wallet did not sign the right transaction, then restart the step. Check that the wallet is on Testnet and is the one connected |
| 401 | `UNAUTHORIZED` | Show **Connect wallet** |
| 401 | `INVALID_STATUS_LINK` | Say the link is invalid or was replaced |
| 403 | `ACCOUNT_SUSPENDED` | Show `message` and disconnect |
| 403 | `ADMIN_REQUIRED` | Hide the admin area |
| 404 | `CAMPAIGN_NOT_FOUND`, `BENEFICIARY_NOT_FOUND`, `ALLOCATION_NOT_FOUND`, `TRANSACTION_NOT_FOUND`, `FILE_NOT_FOUND`, `ORGANIZATION_NOT_FOUND`, `USER_NOT_FOUND`, `NOTIFICATION_NOT_FOUND`, `ISSUE_NOT_FOUND`, `ROUTE_NOT_FOUND` | Show not found |
| 409 | `ORGANIZATION_REQUIRED` | Send to organization registration |
| 409 | `ORGANIZATION_EXISTS`, `BENEFICIARY_WALLET_TAKEN`, `ALREADY_EXISTS` | Show `message` |
| 409 | `INVALID_CAMPAIGN_STATE`, `CAMPAIGN_ENDED`, `CAMPAIGN_FUNDED`, `CAMPAIGN_HOLDS_FUNDS`, `ALLOCATIONS_UNSETTLED`, `FIELDS_LOCKED`, `APPLICATIONS_CLOSED` | Show `message` and refetch |
| 409 | `INVALID_REVIEW_STATE`, `WALLET_FROZEN`, `EVIDENCE_LOCKED`, `TOO_MANY_FILES`, `NO_EMAIL_ON_FILE`, `BENEFICIARY_TARGET_REACHED`, `BENEFICIARY_NOT_APPROVED`, `SELF_PAYMENT_BLOCKED` | Show `message` and refetch |
| 409 | `INSUFFICIENT_FUNDS`, `INSUFFICIENT_ESCROW`, `TARGET_EXCEEDED`, `ALLOCATION_LIMIT_EXCEEDED`, `ALLOCATION_EXISTS`, `TOO_MANY_BALANCES` | Show `message` |
| 409 | `INVALID_ALLOCATION_STATE`, `ALLOCATION_NOT_LOCKED`, `ALREADY_PAID`, `ALREADY_CANCELLED`, `INVALID_RECIPIENT`, `NOTHING_TO_LOCK` | Show `message` and refetch |
| 409 | `TRANSACTION_IN_PROGRESS`, `PAYMENT_IN_PROGRESS` | Disable actions, wait a few seconds, refetch |
| 409 | `TRANSACTION_EXPIRED`, `CAMPAIGN_CHANGED` | Offer **Try again**, which prepares a new transaction |
| 409 | `RECOVERY_NOT_REACHED`, `RECOVERY_DATE_PASSED` | Show `message` and refetch |
| 413 | `FILE_TOO_LARGE`, `PAYLOAD_TOO_LARGE` | Show the 5 MB limit |
| 422 | `ACCOUNT_NOT_ACTIVE` | Show an add-XLM prompt (`POST /wallet/fund`) |
| 422 | `TRUSTLINE_MISSING` | Show **Enable USDC** |
| 422 | `INSUFFICIENT_BALANCE` | Show the Circle faucet link |
| 422 | `RECIPIENT_NOT_ACTIVE`, `RECIPIENT_TRUSTLINE_MISSING` | Tell the admin the beneficiary must activate their wallet or enable USDC |
| 429 | `RATE_LIMITED` | Disable the button for `retryAfterSeconds` |
| 500 | `INTERNAL_ERROR` | Show `message` and log `requestId` |
| 503 | `STELLAR_UNAVAILABLE`, `ESCROW_UNAVAILABLE`, `PRIVATE_RECORDS_UNAVAILABLE`, `DATABASE_BUSY`, `SERVICE_UNAVAILABLE` | Show a retry state |

### Failed transactions

A transaction that reaches Stellar and fails returns **`200` with `data.status: "failed"`**. No funds moved. Show `data.statusMessage`, and branch on `data.failureCode`:

`INSUFFICIENT_BALANCE`, `INSUFFICIENT_XLM`, `ESCROW_LOW_RESERVE`, `RECIPIENT_TRUSTLINE_MISSING`, `TRUSTLINE_MISSING`, `RECIPIENT_NOT_ACTIVE`, `RECIPIENT_LIMIT_REACHED`, `ASSET_NOT_AUTHORIZED`, `FUNDS_NOT_CLAIMABLE`, `FUNDS_ALREADY_CLAIMED`, `ACCOUNT_NOT_ACTIVE`, `NETWORK_BUSY`, `WALLET_SEQUENCE_CHANGED`, `TRANSACTION_EXPIRED`, `TRANSACTION_TOO_EARLY`, `SIGNATURE_REJECTED`, `TRANSACTION_FAILED`.

## 4. API client

Save as `lib/aidtrace-api.ts`. It has no dependencies. Keep the refresh token out of URLs and logs. An httpOnly cookie set by your own server is the safest storage. If you keep tokens in the browser, hold the access token in memory.

```ts
const API = process.env.NEXT_PUBLIC_AIDTRACE_API_URL!;

export interface FieldError { field: string; message: string }

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: FieldError[] = [],
    readonly retryAfterSeconds?: number,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

export interface Tokens { accessToken: string; refreshToken: string }

let tokens: Tokens | null = null;
export const setTokens = (next: Tokens | null) => { tokens = next; };

let refreshing: Promise<boolean> | null = null;

// Refresh tokens are single use: concurrent 401s must share one refresh.
const refresh = () => (refreshing ??= (async () => {
  try {
    if (!tokens) return false;
    const res = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!res.ok) { tokens = null; return false; }
    tokens = (await res.json()).data;
    return true;
  } finally {
    refreshing = null;
  }
})());

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown; headers?: Record<string, string> } = {},
  retried = false,
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined && { 'content-type': 'application/json' }),
      ...(tokens && { authorization: `Bearer ${tokens.accessToken}` }),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (res.status === 401 && tokens && !retried && (await refresh()))
    return api<T>(path, init, true);
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok)
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'INTERNAL_ERROR',
      body?.message ?? 'Something went wrong. Please try again',
      body?.error?.fields ?? [],
      body?.error?.retryAfterSeconds,
      body?.error?.requestId,
    );
  return body.data as T;
}

/** For CSV reports and evidence files. */
export async function download(path: string, fallbackName: string) {
  const res = await fetch(`${API}${path}`, {
    headers: tokens ? { authorization: `Bearer ${tokens.accessToken}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.code ?? 'INTERNAL_ERROR', body?.message ?? 'Download failed');
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1];
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: name ?? fallbackName });
  a.click();
  URL.revokeObjectURL(url);
}
```

### Types

```ts
export type CampaignStatus = 'draft' | 'active' | 'closed' | 'cancelled';
export type ApplicationStatus = 'registered' | 'under_review' | 'approved' | 'rejected';
export type AllocationStatus = 'allocated' | 'ready' | 'processing' | 'confirmed' | 'failed' | 'cancelled';
export type ActionKind = 'fund' | 'lock_allocations' | 'payout' | 'cancel_allocation' | 'recover';
export type ActionStatus = 'prepared' | 'pending' | 'confirmed' | 'failed' | 'expired';

export interface Campaign {
  reference: string; // AT-1001
  title: string;
  description: string;
  eligibilityRequirements: string;
  category: string | null;
  featured: boolean;
  organization: { name: string; websiteUrl: string | null };
  adminWallet: string;
  asset: string;
  network: string;
  targetAmount: string;
  maxAllocation: string;
  beneficiaryTarget: number;
  startsAt: string;
  endsAt: string;
  status: CampaignStatus;
  /** What to show: `funded` means still active and the target is reached. */
  displayStatus: CampaignStatus | 'funded';
  totals: {
    raised: string;
    allocated: string;
    disbursed: string;
    recovered: string;
    availableBalance: string;
    remainingToTarget: string;
    fundingProgressPercent: number;
    beneficiariesApproved: number;
    beneficiariesPaid: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Beneficiary {
  id: string;
  reference: string; // BNF-...
  walletAddress: string;
  /** In the organization list only. Each name shown is logged. */
  fullName?: string;
  status: ApplicationStatus;
  eligibilityStatus: 'pending' | 'eligible' | 'ineligible';
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BeneficiaryDetail extends Beneficiary {
  profile: {
    fullName: string;
    email: string | null;
    phone: string | null;
    eligibilityDetails: string;
    reviewNote: string | null;
  };
  evidence: { id: string; contentType: string; sizeBytes: number; sha256: string; createdAt: string }[];
}

export interface Allocation {
  id: string;
  reference: string; // ALC-..., shown publicly
  beneficiaryId: string;
  beneficiaryReference: string;
  walletAddress: string;
  amount: string;
  status: AllocationStatus;
  payoutTxHash: string | null;
  explorerUrl: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface ChainAction {
  id: string;
  kind: ActionKind;
  status: ActionStatus;
  hash: string;
  amount: string | null;
  transaction: string | null; // XDR to sign; only while `prepared`
  networkPassphrase: string;
  expiresAt: string;
  ledger: number | null;
  explorerUrl: string | null;
  statusMessage: string;
  failureCode: string | null;
  failureCodes: string[] | null;
}

export interface LedgerEntry {
  id: string;
  campaignReference: string;
  type: 'funding' | 'disbursement' | 'recovery';
  amount: string;
  status: 'confirmed' | 'pending' | 'failed';
  recipientReference: string | null;
  timestamp: string;
  ledger: number | null;
  transactionHash: string;
  /** Null for an attempt Stellar rejected before it reached a ledger. */
  explorerUrl: string | null;
  /** Set when `status` is `failed`. */
  failureCode: string | null;
}
```

## 5. Wallet sign-in

There are no email accounts or passwords. **The wallet is the account.** The first sign-in creates it, and an administrator's organization belongs to that wallet.

Use [Stellar Wallets Kit](https://stellarwalletskit.dev) or Freighter. The example uses Freighter:

```ts
import { getAddress, requestAccess, signTransaction } from '@stellar/freighter-api';

export async function signXdr(xdr: string, networkPassphrase: string, address: string) {
  const result = await signTransaction(xdr, { networkPassphrase, address });
  if (result.error) throw new Error('The wallet did not sign the transaction');
  return result.signedTxXdr;
}

export async function connectWallet() {
  const access = await requestAccess();
  if (access.error) throw new Error('Wallet access was refused');
  const { address } = await getAddress();
  const challenge = await api<{ challengeId: string; transaction: string; networkPassphrase: string }>(
    '/auth/challenge',
    { method: 'POST', json: { address } },
  );
  const signedTransaction = await signXdr(challenge.transaction, challenge.networkPassphrase, address);
  const session = await api<Tokens & { newAccount: boolean }>('/auth/verify', {
    method: 'POST',
    json: { challengeId: challenge.challengeId, signedTransaction },
  });
  setTokens(session);
  return { address, newAccount: session.newAccount };
}
```

Check your installed Freighter version's return shape, since it has changed between releases.

**What the user signs:** a transaction with sequence number 0, which Stellar always rejects, so signing it can never move funds. It contains a random value and your site's domain (`web_auth_domain`). Tell users: *"Sign this message to prove you own this wallet. It cannot move any funds."*

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/auth/challenge` | `{ address }` | Returns `{ challengeId, transaction, networkPassphrase, expiresAt }`. Valid 5 minutes |
| POST | `/auth/verify` | `{ challengeId, signedTransaction }` | Returns tokens and `newAccount`. Each challenge works once, even if the signature was wrong |
| POST | `/auth/refresh` | `{ refreshToken }` | **Single use.** Store the new pair every time |
| POST | `/auth/logout` | `{ refreshToken }` | `204` |
| POST | `/auth/logout-all` | none | Ends every session of this wallet |
| GET | `/auth/me` | | The wallet, its roles, and its organization |

The access token lasts 15 minutes. Send it as `Authorization: Bearer <token>`.

`GET /auth/me` decides which screens to show:

```json
{
  "id": "0197c2a4-...",
  "walletAddress": "GCEZ...74JZ",
  "shortAddress": "GCEZ…74JZ",
  "roles": { "organizationAdmin": true, "platformAdmin": false },
  "organization": { "id": "0197c2a4-...", "name": "Harvest Relief Foundation" },
  "createdAt": "2026-11-23T12:00:00.000Z"
}
```

| `roles` | Show |
| --- | --- |
| `organizationAdmin: false` | **Register organization** |
| `organizationAdmin: true` | The organization dashboard |
| `platformAdmin: true` | The admin area (section 14) |

**When the wallet changes:** if the wallet extension switches to another account, call `POST /auth/logout` and sign in again. A different wallet is a different account.

## 6. Wallet setup

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/wallet` | The signed-in wallet and its balances |
| POST | `/wallet/fund` | Friendbot test XLM |
| POST | `/wallet/trustline` | `{ asset: "USDC" }`. Returns `{ xdr, networkPassphrase, expiresAt }` to sign |
| POST | `/wallet/trustline/submit` | `{ signedXdr }` |

New administrator onboarding, in order:

1. **Connect wallet** (section 5).
2. **Get test XLM** if `GET /wallet` shows `exists: false`.
3. **Enable USDC** if the USDC line shows `trusted: false`.
4. **Get test USDC** from [faucet.circle.com](https://faucet.circle.com).
5. **Register organization** with `POST /organizations`.

The UI needs screens or prompts for steps 2 to 5. Without them, an administrator cannot fund a campaign.

## 7. The transaction flow

Every money action uses the same three steps. Build this once.

```ts
export async function runAction(
  reference: string,
  prepare: () => Promise<ChainAction>,
  walletAddress: string,
): Promise<ChainAction> {
  const prepared = await prepare();
  const signed = await signXdr(prepared.transaction!, prepared.networkPassphrase, walletAddress);
  let action = await api<ChainAction>(
    `/campaigns/${reference}/actions/${prepared.id}/submit`,
    { method: 'POST', json: { signedTransaction: signed } },
  );
  // `pending` means the outcome is not known yet. Never prepare the payment again.
  for (let i = 0; i < 30 && action.status === 'pending'; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    action = await api<ChainAction>(`/campaigns/${reference}/actions/${prepared.id}`);
  }
  return action;
}
```

| `status` | Show |
| --- | --- |
| `prepared` | Waiting for the wallet signature |
| `pending` | Confirming on Stellar. Keep the button disabled |
| `confirmed` | Success, with `explorerUrl` |
| `failed` | `statusMessage`. No funds moved. Offer retry |
| `expired` | Expired. No funds moved. Offer **Try again** |

A prepared transaction expires after 5 minutes, and preparing a new one for the campaign replaces it. If the user closes the page during `pending`, the backend still settles it.

## 8. Organizations and campaigns

| Method | Path | Body or query |
| --- | --- | --- |
| POST | `/organizations` | `name, description?, websiteUrl?`. The signed-in wallet becomes its administrator wallet |
| GET, PATCH | `/organizations/me` | |
| POST | `/campaigns` | See below. Creates a `draft` |
| GET | `/campaigns` | Your campaigns, paginated |
| GET, PATCH | `/campaigns/{reference}` | |
| POST | `/campaigns/{reference}/publish` | `draft` → `active` |
| POST | `/campaigns/{reference}/close` | Needs no unsettled allocations and no funds in escrow |
| POST | `/campaigns/{reference}/cancel` | Only if it never received funds |

```json
{
  "title": "School Meals Relief",
  "description": "Monthly food support for 20 displaced families.",
  "eligibilityRequirements": "Registered household in the affected district.",
  "category": "Food security",
  "targetAmount": "2000",
  "maxAllocation": "100",
  "beneficiaryTarget": 20,
  "startsAt": "2027-01-01T00:00:00.000Z",
  "endsAt": "2027-03-01T00:00:00.000Z"
}
```

| Field | Rule |
| --- | --- |
| `title` | 3 to 140 characters |
| `description` | 10 to 5,000 |
| `eligibilityRequirements` | 3 to 5,000 |
| `category` | Optional, 2 to 40 characters |
| `targetAmount`, `maxAllocation` | Decimal strings. `maxAllocation` cannot exceed the target |
| `beneficiaryTarget` | Whole number, 1 to 100,000 |
| `startsAt`, `endsAt` | ISO 8601. End must be after start |

After publishing, only `title`, `description`, `category`, and `endsAt` can change. Only a platform admin can set `featured`.

## 9. Beneficiaries

### Public application

```
POST /public/campaigns/{reference}/applications
```

Body: `fullName` (2 to 120), `email`, `phone?`, `walletAddress`, `eligibilityDetails` (3 to 4,000).

Send it as JSON, or as `multipart/form-data` with the same fields plus up to 5 evidence files in `files` (PDF, PNG or JPEG, 5 MB each). One bad file rejects the whole application with `UNSUPPORTED_FILE_TYPE`.

It returns `202` with `{ "received": true }`, **even if this wallet already applied**. It does not return the `BNF-` reference: that goes in the email and on the status page. This stops the form from revealing who is seeking aid, so always show: *"Application received. Check your email for your private status link."* Do not say the application was definitely created.

The email links to:

```
{FRONTEND_URL}/applications/status#token=...
```

**You must build this page.** The token is in the URL fragment so it is never sent to a server. On load:

```ts
const token = new URLSearchParams(location.hash.slice(1)).get('token');
history.replaceState(null, '', location.pathname); // Remove it from the address bar.
const status = await api('/applications/me', { headers: { 'x-application-token': token! } });
```

Keep the token in memory only. Do not load third-party scripts on this page.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/applications/me` | Status, note, and `canAddEvidence`. Needs `x-application-token` |
| POST | `/applications/me/evidence` | Multipart field `file`. Needs `x-application-token` |

### Admin

Base path: `/campaigns/{reference}/beneficiaries`

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/` | Register. Same body as the application, with `email` optional |
| GET | `/?status=` | List with `fullName`. No contact details or evidence. Each name shown is logged |
| GET | `/{id}` | Full protected record. **Every view is logged** |
| POST | `/{id}/review` | `{ decision, note? }`. The note is shown to the applicant |
| PATCH | `/{id}/wallet` | `{ walletAddress }`. Only before a decision |
| POST | `/{id}/status-link` | Sends a new link. The old one stops working |
| POST | `/{id}/evidence` | Multipart field `file` |
| GET | `/{id}/evidence/{fileId}` | Download with `download()`. Do not open it in an iframe |

```
registered → (start_review) → under_review → (approve)  → approved
                                           → (reject)   → rejected
approved or rejected → (reopen) → under_review
```

- Evidence must be PDF, PNG, or JPEG, up to 5 MB, with at most 5 files per application.
- The wallet and evidence freeze once a decision is made.
- `reopen` is refused while the beneficiary has a live or paid allocation.
- The organization's own admin wallet cannot be approved.

## 10. Funding, allocation, and payouts

The full lifecycle:

```
Fund → Allocate → Lock → Pay
```

| Method | Path | Body | Signature |
| --- | --- | --- | --- |
| GET | `/campaigns/{reference}/escrow` | | |
| POST | `/campaigns/{reference}/escrow/fund` | `{ amount }`, at least 1 USDC | Yes |
| POST | `/campaigns/{reference}/allocations` | `{ items: [{ beneficiaryId, amount }] }`, up to 100 | **No** |
| GET | `/campaigns/{reference}/allocations` | Paginated | |
| POST | `/campaigns/{reference}/escrow/lock` | `{ allocationIds }`, up to 20 | Yes |
| POST | `/campaigns/{reference}/allocations/{id}/payout` | | Yes |
| POST | `/campaigns/{reference}/allocations/{id}/cancel` | | Only if locked |
| POST | `/campaigns/{reference}/escrow/recover` | | Yes |
| GET | `/campaigns/{reference}/actions/{id}` | | |
| POST | `/campaigns/{reference}/actions/{id}/submit` | `{ signedTransaction }` | |

Allocation status maps to the brief's payment lifecycle:

| API `status` | Show as | Next action |
| --- | --- | --- |
| Approved, no allocation | Pending Allocation | Allocate |
| `allocated` | Allocated | Lock, or cancel |
| `ready` | Ready for Payment | **Execute Payment**, or cancel |
| `processing` | Processing | Wait |
| `confirmed` | Confirmed | Show explorer link |
| `failed` | Failed | Retry payout, or cancel |
| `cancelled` | Cancelled | Can allocate again |

**Batch payouts** run one at a time, because each transaction uses the wallet's next sequence number:

```ts
for (const allocation of selected) {
  const result = await runAction(
    reference,
    () => api(`/campaigns/${reference}/allocations/${allocation.id}/payout`, { method: 'POST' }),
    walletAddress,
  );
  // Show each result. Stop if the user rejects a signature.
  if (result.status === 'pending') break; // Do not move on until it settles.
}
```

Each payout opens a wallet prompt. Say so before starting.

**Cancel** returns either `{ "status": "cancelled", "action": null }`, which is done, or `{ "status": "needs_signature", "action": ChainAction }`, which must be signed and submitted.

**Recovery:** funds stay locked until `nextRecoveryAt` from `GET /escrow`, 90 days after funding by default. After that date, only `recover` is possible for those balances, and they return to the admin wallet.

## 11. Public pages

No token needed.

| Method | Path | For |
| --- | --- | --- |
| GET | `/public/stats` | Landing page statistics: `totalTarget`, `totalRaised`, `totalDisbursed`, `beneficiariesApproved`, `beneficiariesPaid`, `campaigns`, `activeCampaigns`, `organizations`, `verifiedTransactions` |
| GET | `/public/campaigns?search=&status=&category=&featured=` | Campaign list, featured first. `status` is `active`, `funded` or `closed` |
| GET | `/public/campaigns/{reference}` | Campaign dashboard |
| GET | `/public/campaigns/{reference}/ledger` | Campaign transactions |
| GET | `/public/ledger` | All transactions |
| GET | `/public/campaigns/{reference}/report` | Financial summary |
| GET | `/public/campaigns/{reference}/report.csv` | CSV download |

Ledger filters: `search` (hash, campaign reference, recipient reference, or title), `type` (`funding`, `disbursement`, `recovery`), `status` (`confirmed`, `pending`, `failed`), `from`, `to`, `limit`, `offset`. `pending` and `failed` rows are funding and payout attempts submitted to Stellar. A failed one moved no funds, and totals count confirmed rows only. Dates are ISO 8601, and a plain date in `to` covers that whole day.

`recipientReference` is a random allocation reference. Show it instead of any name.

## 12. Organization reports

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/campaigns/{reference}/report` | Summary plus all allocations |
| GET | `/campaigns/{reference}/report.csv` | CSV with allocation references |
| POST | `/campaigns/{reference}/reconciliation` | Checks payouts, ledger, and balances on Stellar. Can take several seconds |

Show `reconciled: true` as verified. On `false`, list the `payouts.items` where `matched` is `false`.

## 13. Notifications

| Method | Path |
| --- | --- |
| GET | `/notifications` |
| GET | `/notifications/unread` |
| POST | `/notifications/{id}/read` |
| POST | `/notifications/read-all` |

## 14. Admin dashboard

All routes are under `/admin` and need a wallet listed in the backend's `ADMIN_WALLETS`. Show the area when `GET /auth/me` returns `roles.platformAdmin: true`. A `403` means no access.

| Method | Path | Screen |
| --- | --- | --- |
| GET | `/admin/overview` | Platform totals |
| GET | `/admin/system` | Services, arbiter, and background worker |
| GET | `/admin/integrity` | Accounting health. Alert when `healthy` is `false` |
| GET | `/admin/users?search=&status=` | Users. Search by wallet address or organization name |
| GET | `/admin/users/{id}` | User detail |
| POST | `/admin/users/{id}/suspend` | `{ reason }`. Ask for confirmation |
| POST | `/admin/users/{id}/reactivate` | |
| GET | `/admin/organizations?search=` | Organizations |
| GET | `/admin/campaigns?search=&status=` | All campaigns, including drafts |
| GET | `/admin/campaigns/{reference}` | Full campaign record |
| POST | `/admin/campaigns/{reference}/feature` | `{ featured }`. Shows it on the landing page |
| POST | `/admin/campaigns/{reference}/reconcile` | On-chain check |
| GET | `/admin/beneficiaries?campaign=&status=` | References and status only |
| GET | `/admin/allocations?campaign=&status=` | Allocations |
| GET | `/admin/transactions?campaign=&status=&kind=&hash=` | Transactions |
| GET | `/admin/transactions/{id}` | Transaction detail |
| POST | `/admin/transactions/{id}/recheck` | Reads the result from Stellar |
| GET | `/admin/escrow-balances?campaign=&status=&kind=` | Claimable balances |
| GET | `/admin/reconciliation-issues?campaign=&status=` | Treat `unexpected_claim` as critical |
| POST | `/admin/reconciliation-issues/{id}/resolve` | `{ note }`. Records the review only |
| POST | `/admin/sweeper/run` | Runs settlement now |
| GET | `/admin/audit-log` | Admin actions |
| GET | `/admin/access-log` | Who opened protected records |

Platform admins **cannot** sign, move funds, approve beneficiaries, or read beneficiary names, contacts, or evidence. Do not design screens that assume they can.

## 15. Rate limits

| Scope | Limit |
| --- | --- |
| Every route | 60 burst, then 1 per second, per user or IP |
| Wallet sign-in (challenge and verify) | 10 burst, then 1 per 6 seconds, per IP |
| Public application, applicant evidence | 5 burst, then 1 per minute |
| Prepare fund, lock, payout, recover | 30 burst, then 1 per 2 seconds |
| CSV exports | 10 burst, then 1 per 6 seconds |

Do not poll faster than every 3 seconds.

## 16. Screen checklist

- **Landing:** `/public/stats`, `/public/campaigns`.
- **Connect wallet and onboarding:** section 6.
- **Create campaign:** organization check, form with `error.fields`, publish.
- **Beneficiaries:** list by status, protected detail, evidence, approve and reject.
- **Applicant:** public form, private status page, evidence upload.
- **Allocation and disbursement:** escrow balance, allocate, lock, execute payment, confirmation.
- **Public dashboard:** totals, progress bar, verified activity, privacy notice.
- **Public ledger:** search, filters, explorer links.
- **Reports:** summary, reconciliation, CSV.
- **Admin:** section 14.
- **Every screen:** loading, empty, pending, approved, failed, and completed states.
