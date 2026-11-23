# Testing

PRD §8 "Smart Contract Testing & Validation". Where each scenario is covered:

| # | Scenario | Expected | Covered by |
|---|---|---|---|
| 1 | Create campaign | Campaign registered | contract `s01`, backend, web flow |
| 2 | Register beneficiary | Record created | backend, web flow |
| 3 | Approve eligible beneficiary | Approval recorded | backend, web flow |
| 4 | Fund campaign with testnet USDC | Balance updated | contract `s04`, web flow |
| 5 | Allocate to approved beneficiary | Allocation recorded | contract `s05` |
| 6 | Allocate to unapproved beneficiary | Rejected | backend (approval check) + contract `s06` (admin auth) |
| 7 | Execute authorized payout | Beneficiary receives funds | contract `s07`, web flow |
| 8 | Unauthorized payout | Rejected | contract `s08` |
| 9 | Insufficient campaign balance | Payment blocked | contract `s09` |
| 10 | Duplicate disbursement | Rejected | contract `s10` |
| 11 | Invalid payout amount | Rejected | contract `s11`, web schema |
| 12 | Failed token transfer | State consistent | contract `s12` |
| 13 | Multiple beneficiary payouts | Correct balances | contract `s13` |
| 14 | Verify transaction history | Matches on-chain | contract `s14`, backend indexer |
| 15 | Generate public financial report | Accurate totals | backend, `features/reports/csv.ts` |
| 16 | Access protected beneficiary data without auth | Denied | backend |

## Required evidence (PRD §8)

Record here as they are produced: contract test output, funding and disbursement transaction hashes (Testnet),
unauthorized / duplicate attempt results, frontend-to-contract integration runs, reconciliation results, public
report validation, and known limitations.

## Last run

_None yet._
