# AidTrace

Transparent aid distribution, beneficiary payments and public fund tracking on Stellar (Testnet). Organizations
create campaigns, approve beneficiaries and disburse USDC through a Soroban contract; donors verify every transaction
on a public dashboard and ledger, without seeing beneficiary data.

Turborepo + pnpm monorepo:

| Path | What | Dev URL |
|---|---|---|
| `apps/landing` | Public site (Screen 1) | http://localhost:3002 |
| `apps/web` | The app: overview, campaign dashboards, public ledger, and admin screens (create campaign, beneficiaries, fund allocation, reports) | http://localhost:3000 |
| `contracts/aidtrace` | Soroban contract: campaign escrow, allocations, payouts | — |
| `packages/ui` | `@repo/ui`: design tokens (Figma "Aidtrace"), components, motion, brand | — |
| `packages/stellar` | `@repo/stellar`: network constants, assets, the data model, stroop maths | — |
| `packages/mock` | `@repo/mock`: deterministic demo data (campaigns, beneficiaries, ledger) | — |
| `packages/eslint-config`, `packages/typescript-config` | Shared configs | — |

Until the backend (separate repo) is live, both apps run on **mock data**: an in-browser mock backend with a simulated
wallet and Stellar network, so every flow (create campaign → register → approve → fund → pay → report) can be
walked end to end. Sign in with the **Admin** button (demo administrator wallet); use the **Demo** panel to slow the
network, force a failed transaction or a declined signature, or reset the data. Switch to the real backend with
`NEXT_PUBLIC_DATA_MODE=live` and `API_PROXY_TARGET` (`apps/web/.env.example`).

## Getting started

Requires Node ≥ 22 and pnpm 12 (`corepack enable` picks the version from `package.json`).

```bash
pnpm install
pnpm dev                     # landing on :3002, app on :3000
```

Organization administrators need a Stellar wallet set to **Testnet** (Varial, formerly Freighter, recommended), test
XLM from Friendbot, and Testnet USDC from https://faucet.circle.com (choose Stellar).

## Checks

```bash
pnpm check-types
pnpm lint
pnpm build
cd contracts && cargo test   # see contracts/README.md
```

Conventions, data flow and deployment: [CLAUDE.md](CLAUDE.md). Scope and status: [docs/PLAN.md](docs/PLAN.md). Test
scenarios: [docs/TESTING.md](docs/TESTING.md). Design: [docs/DESIGN-PLAN.md](docs/DESIGN-PLAN.md).
