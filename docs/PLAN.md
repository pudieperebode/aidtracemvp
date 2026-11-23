# AidTrace MVP: plan

Source: the PRD (linked from CLAUDE.md). Design: see [DESIGN-PLAN.md](DESIGN-PLAN.md).

**Definition of done (PRD §13):** an organization creates a campaign, registers beneficiaries, reviews eligibility and
approves allocations; an authorized administrator funds the campaign and disburses testnet USDC to approved wallets
through Stellar and Soroban; the contract enforces authorization, keeps accurate accounting and prevents unauthorized
or duplicate payouts; the public dashboard shows funding, disbursements, balances and verified history without
exposing beneficiary records.

## Architecture

```
 Browser (apps/web)                          Stellar Testnet                      Backend (separate repo)
 Wallets Kit ── signMessage ───────────────────────────────────────────────────► /auth (JWT, org admins only)
           ── signs prepared tx ──► AidTrace contract ◄── prepared by /campaigns/…/{register,funding,allocation,payout}
                                    (USDC escrow, allocations,   ──events──► indexer → public ledger, reconciliation
                                     one-time payouts)
 /app/api/v1 (Next proxy) ─────────────────────────────────────────────────────► /v1 reads + off-chain writes
 apps/landing (server fetch) ──────────────────────────────────────────────────► /v1/public/* (featured, stats)
```

- Off-chain (backend): campaign metadata, protected beneficiary records and evidence, review decisions,
  notifications, reconciliation, report data.
- On-chain (contract): campaign registration + admin, USDC balances, allocations by beneficiary reference, payouts.
- The UI marks a payout "Paid" only after the backend verified the transaction on chain.

## Screens → routes

| PRD screen | Route | Feature component |
|---|---|---|
| 1 Landing & Public Campaigns | `apps/landing` `/`, app `/overview` | `features/landing/*`, `campaigns/Overview` |
| — Public campaign list | `/campaigns` | `campaigns/CampaignList` |
| 2 Create Campaign | `/campaigns/new` | `campaigns/CreateCampaign` |
| 3 Beneficiary Registration & Approval | `/beneficiaries`, `/campaigns/[ref]/apply` | `beneficiaries/Beneficiaries`, `ApplyForm` |
| 4 Fund Allocation & Disbursement | `/allocation` (Fund campaign dialog) | `disbursements/FundAllocation` |
| 5 Public Campaign Dashboard | `/campaigns/[ref]` | `campaigns/CampaignDashboard` |
| 6 Public Transaction Ledger | `/ledger` (`?campaign=&type=&status=&q=`) | `ledger/PublicLedger` |
| 7 Reports & Financial Reconciliation | `/reports` | `reports/Reports` |
| — Admin sign-in | "Admin" button / admin gate | `auth/SignInDialog` (demo or `wallet/ConnectModal`) |
| — Notifications | bell in the header (admins) | `notifications/hooks` |

## Status (MVP checklist, PRD §12)

- [x] Monorepo, shared packages, routes, data model, provisional API layer, wallet sign-in, contract scaffold
- [x] Design applied (Figma "Aidtrace"): landing + all 7 app screens, desktop and mobile, empty / error / loading states
- [x] Full mock backend (NEXT_PUBLIC_DATA_MODE=mock) with simulated wallet + Stellar: every flow can be walked end to end
- [x] Complete Figma designs (applied)
- [~] Organization and campaign registration (UI + mock done; needs backend)
- [~] Beneficiary registration and eligibility review (UI + mock done; needs backend)
- [ ] Beneficiary approval and wallet registration
- [ ] Deploy Soroban campaign funding and disbursement contract on Stellar Testnet (contract id: _tbd_)
- [ ] Stellar wallet connectivity and testnet USDC (funding flow)
- [~] Beneficiary allocations and authorized payouts (UI + mock done; needs contract + backend)
- [ ] Prevent unauthorized and duplicate disbursements (contract tests)
- [~] Organization financial dashboard (Reports; mock data)
- [~] Public campaign transparency dashboard (mock data)
- [~] Searchable transaction history and explorer links (mock data)
- [x] Downloadable CSV financial reports (public-safe fields only)
- [ ] Protect sensitive beneficiary information (backend access control + public types)
- [ ] Automated contract and integration tests
- [ ] Submit GitHub repository, deployed MVP URL, contract address and technical report

## Open questions

- Backend: base URL, OpenAPI document, and whether it matches the provisional paths in `apps/web/src/lib/api`.
- Who can fund a campaign: only the administrator wallet (PRD "authorized wallets"), or any donor wallet too?
- Beneficiary applications: public self-service form (current routes) or administrator-entered only?
- WalletConnect: create AidTrace's own Reown project id (`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`).

## Out of scope (PRD)

Advanced identity verification, automated KYC, humanitarian operations beyond the aid lifecycle, mainnet and
real-value transactions.
