# Design plan

Source: Figma file "Aidtrace" (`hM0o7zLxyLnYeqvcz4pFm5`, a copy of `HvxWVvrHQwSNZUNGFCF7nO`), page "Design".
App frames are 1440×1000 desktop and 390 wide mobile. The app frames carry a placeholder product name
("Commonfund"); the build uses AidTrace.

## Tokens

From the file's colour and text styles; values in `packages/ui/src/styles/globals.css`.

| Style | Token |
|---|---|
| Graphite Normal #292929 / Darker #0E0E0E / Light #EAEAEA | `ink` / `night` / `line` |
| Verdigris Normal #0E9F9A / Dark #0B7774 / Darker #053836 / Light #E7F5F5 / Light:active #B4E1E0 | `brand` / `brand-dark` / `brand-deep` / `brand-soft` / `brand-tint` |
| Autumn Leaf Normal #F26A1B / Dark #B65014 / Darker #552509 / Light #FEF0E8 / Light:active #FBD1B8 | `accent` / `accent-dark` / `accent-deep` / `accent-soft` / `accent-tint` |
| Golden Pollen Normal #FFC93C / Darker #594615 / Light #FFFAEC / Light:active #FFEEC3 | `pollen` / `pollen-deep` / `pollen-soft` / `pollen-tint` |
| In Motion / Under Review #6A4CC7 | `review` |
| Instrument Sans (headings 500, text 400), DM Mono | `font-sans`, `font-mono` |

## Screens

| Screen | Figma frame (desktop / mobile) | Route | Built |
|---|---|---|---|
| 1 Landing (marketing) | AidTrace Desktop `15:79103` / AidTrace Mobile `15:79261` | `apps/landing` `/` | ✅ |
| 1 Overview (app) | Landing / Desktop `8:65449` / Mobile `8:65453` | `/overview` (+ `/campaigns`) | ✅ |
| 2 Create campaign | `8:65456` / `8:65461` | `/campaigns/new` | ✅ |
| 3 Beneficiary registration | `8:65465` / `8:65469` | `/beneficiaries`, `/campaigns/[ref]/apply` | ✅ |
| 4 Fund allocation | `8:65472` / `8:65476` | `/allocation` | ✅ |
| 5 Campaign dashboard | `8:65479` / `8:65483` | `/campaigns/[ref]` | ✅ |
| 6 Public ledger | `8:65486` / `8:65490` | `/ledger` | ✅ |
| 7 Reports | `8:65493` / `8:65497` | `/reports` | ✅ |
| Empty / Error / Loading states | `8:69511` / `8:69563` / `8:69615` | every data screen | ✅ |

## Added where the design had no frame

- Admin sign-in dialog (demo wallet in mock mode, Varial / xBull in live mode) and the admin gate on admin screens.
- Transaction dialogs (`TxDialog` + `TxProgress`: approve in wallet → recording on Stellar → confirmed / failed),
  the batch payout dialog, Fund campaign dialog, Reject-with-reason and evidence dialogs.
- Funding planner preview and max allocation per beneficiary on Create campaign (PRD §6, Deliverable 1).
- Reconciliation table and campaign picker on Reports; beneficiary application page.
- App and landing 404 / error / global error pages, brand loader, toasts, social cards, mobile drawer, Demo panel.
