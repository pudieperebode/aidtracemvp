# AidTrace MVP: plan

Source: the PRD (linked from CLAUDE.md). Design: see [DESIGN-PLAN.md](DESIGN-PLAN.md). API contract:
[FRONTEND_INTEGRATION (2).md](<FRONTEND_INTEGRATION (2).md>) and the live OpenAPI at
https://api.aidtrace.africa/docs.

**Definition of done (PRD §13):** an organization creates a campaign, registers beneficiaries, reviews eligibility and
approves allocations; an authorized administrator funds the campaign and disburses testnet USDC to approved wallets on
Stellar; the backend enforces authorization, keeps accurate accounting and prevents unauthorized or duplicate payouts;
the public dashboard shows funding, disbursements, balances and verified history without exposing beneficiary records.

## Architecture

There is no smart contract. The backend holds campaign funds in Stellar claimable balances and owns every rule.

```
 Browser (apps/web, apps/admin)                Backend (separate repo)                    Stellar Testnet
 Wallets Kit ── signs challenge tx ──────────► /auth/challenge → /auth/verify (JWT)
             ── signs prepared tx unchanged ─► /campaigns/…/actions/{id}/submit ──submits──► claimable balances
 <basePath>/api/v1 (Next proxy) ─────────────► /api/v1 reads + off-chain writes ◄──settles── (pool + one per allocation)
 apps/landing (server fetch) ────────────────► /api/v1/public/* (featured, stats)
```

- Backend: campaigns, protected beneficiary records and evidence, review decisions, escrow (claimable balances),
  settlement sweep, reconciliation, notifications, reports, platform administration, access and audit logs.
- The UI marks a payout "Paid" only after the backend reports the transaction `confirmed`.

## Screens → routes

| PRD screen | Route | Feature component |
|---|---|---|
| 1 Landing & Public Campaigns | `apps/landing` `/`, app `/overview` | `features/landing/*`, `campaigns/Overview` |
| — Public campaign list | `/campaigns` | `campaigns/CampaignList` |
| 2 Create Campaign | `/campaigns/new` | `campaigns/CreateCampaign` |
| 3 Beneficiary Registration & Approval | `/beneficiaries`, `/campaigns/[ref]/apply`, `/applications/status` | `beneficiaries/*` |
| 4 Fund Allocation & Disbursement | `/allocation` (Fund campaign dialog) | `disbursements/FundAllocation` |
| 5 Public Campaign Dashboard | `/campaigns/[ref]` | `campaigns/CampaignDashboard` |
| 6 Public Transaction Ledger | `/ledger` | `ledger/PublicLedger` |
| 7 Reports & Financial Reconciliation | `/reports` | `reports/Reports` |
| — Platform administration | `apps/admin` (`/admin` on Vercel) | `apps/admin/src/features/*` |

## Status (MVP checklist, PRD §12)

- [x] Monorepo, shared packages, routes, data model, API layer against the live backend, wallet sign-in
- [x] Design applied (Figma "Aidtrace"): landing + all 7 app screens, desktop and mobile, empty / error / loading states
- [x] Mock backend (NEXT_PUBLIC_DATA_MODE=mock) with simulated wallet + Stellar: every flow can be walked end to end
- [x] Organization and campaign registration (backend API)
- [x] Beneficiary registration, eligibility review and private applicant status page (backend API)
- [x] Funding, allocation, escrow lock and payouts through the backend's prepare → sign → submit flow
- [x] Public dashboard, ledger with explorer links, CSV reports, reconciliation (backend API)
- [x] Platform-admin console (`apps/admin`) on the backend's `/admin` API
- [ ] Confirm the PROVISIONAL response shapes (`dto.ts` in both apps) against real data
- [ ] Run the full flow in live mode on Testnet with real wallets; record hashes in TESTING.md
- [ ] Submit GitHub repository, deployed MVP URL and technical report

## Open questions

- WalletConnect: create AidTrace's own Reown project id (`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`).
- The backend's `FRONTEND_URL` must include the app's `/app` base path for emailed status links.

## Out of scope (PRD)

Advanced identity verification, automated KYC, humanitarian operations beyond the aid lifecycle, mainnet and
real-value transactions.
