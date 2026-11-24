# Testing

PRD §8 scenarios. There is no smart contract: authorization, accounting and duplicate protection are enforced by the
backend (separate repo) and mirrored by this repo's mock backend, so the frontend flows can be tested end to end.

| # | Scenario | Expected | Covered by |
|---|---|---|---|
| 1 | Create campaign | Campaign registered | backend, web flow (E2E) |
| 2 | Register beneficiary | Record created | backend, web flow (E2E) |
| 3 | Approve eligible beneficiary | Approval recorded | backend, web flow (E2E) |
| 4 | Fund campaign with testnet USDC | Balance updated | backend, web flow (E2E) |
| 5 | Allocate to approved beneficiary | Allocation recorded | backend, web flow (E2E) |
| 6 | Allocate to unapproved beneficiary | Rejected | backend (approval check), mock |
| 7 | Execute authorized payout | Beneficiary receives funds | backend, web flow (E2E) |
| 8 | Unauthorized payout | Rejected | backend (wallet signature + admin role) |
| 9 | Insufficient campaign balance | Payment blocked | backend, web (available-funds check) |
| 10 | Duplicate disbursement | Rejected | backend (`ALREADY_PAID`), mock |
| 11 | Invalid payout amount | Rejected | backend, web schema |
| 12 | Failed token transfer | State consistent | backend, web flow (E2E: failed transaction moves nothing) |
| 13 | Multiple beneficiary payouts | Correct balances | web flow (E2E batch) |
| 14 | Verify transaction history | Matches on-chain | backend reconciliation, admin console |
| 15 | Generate public financial report | Accurate totals | backend CSV |
| 16 | Access protected beneficiary data without auth | Denied | backend; admin console never shows names |

## Required evidence (PRD §8)

Record here as they are produced: funding and disbursement transaction hashes (Testnet), unauthorized / duplicate
attempt results, frontend integration runs, reconciliation results, public report validation, and known limitations.

## Last run

_None recorded yet._
