# AidTrace

Transparent aid distribution on Stellar. MVP, **Testnet only**: an organization creates a campaign → registers and
approves beneficiaries → funds the campaign with testnet USDC → allocates → disburses through a Soroban contract →
donors verify everything on a public dashboard and ledger. PRD:
https://docs.google.com/document/d/1uemEqHvXihY4wUw2ZCIvkfXQObdLTgFs2BeRYliUwHY. **Scope and status: `docs/PLAN.md`.
Tests: `docs/TESTING.md`. Design (Figma frames per screen): `docs/DESIGN-PLAN.md`.** Structure mirrors the Stackly
reference repo (github.com/stellardev002/stackly).

**Architecture:** this repo holds the frontend and the Soroban contract. The backend (campaign metadata, protected
beneficiary records, review workflow, contract indexing, reconciliation, notifications) is a separate repo. Until it
exists the app runs on an **in-browser mock backend** (see "Data"). On-chain writes: the backend prepares a Soroban
transaction, the administrator's wallet signs it, the app submits it, then reports the hash to the backend, which
verifies it on chain before balances change.

## Monorepo

Turborepo + pnpm 12 (`packageManager`), Node ≥ 22.

```
apps/landing/       (:3002) marketing site, PRD Screen 1 (Figma "AidTrace Desktop" / "AidTrace Mobile")
apps/web/           (:3000) the app, one shell (sidebar + header) for every screen:
                      public:  /overview, /campaigns, /campaigns/[reference] (+ /apply), /ledger
                      admin:   /campaigns/new, /beneficiaries, /allocation, /reports   (?campaign=REF picks the campaign)
contracts/aidtrace/ Soroban contract scaffold (Rust): campaigns, USDC escrow, allocations, one-time payouts, events
packages/ui/        @repo/ui: design tokens, components, motion, brand, OG card
packages/stellar/   @repo/stellar: network constants, assets, UI data model (campaign.ts), stroop maths, strkey
packages/mock/      @repo/mock: deterministic demo seed + derived totals (used by the mock backend and the landing)
packages/eslint-config, packages/typescript-config
```

`pnpm dev` · `pnpm build` · `pnpm check-types` · `pnpm lint` · `pnpm format` (prettier: tabs, width 130) · contract:
`cd contracts && cargo test` (see `contracts/README.md`).

## Deployment (Vercel Services)

One Vercel project, routed by the root `vercel.json`: `/app` and `/app/*` → `apps/web`, everything else →
`apps/landing`. `apps/web` sets `basePath: "/app"` on every Vercel build (`VERCEL` is set); set `APP_BASE_PATH=""`
once the app has its own domain. Each app's `src/lib/site.ts` derives canonical URLs from
`VERCEL_PROJECT_PRODUCTION_URL`. Landing links into the app with plain `<a>`s (`APP_LINKS`) and redirects bare app
paths to `/app/…`. Turborepo only passes declared env vars to builds: keep `VERCEL*`, `APP_BASE_PATH`,
`API_PROXY_TARGET`, `AIDTRACE_API_URL` and `NEXT_PUBLIC_*` in `turbo.json`.

## Stack

Next.js 16 (App Router, React Compiler, Turbopack), React 19, Tailwind v4, Radix in `@repo/ui`, TanStack Query,
zustand, react-hook-form + zod 4, axios, lucide, sonner, `@stellar/stellar-sdk`, `@creit.tech/stellar-wallets-kit`.
Contract: Rust + `soroban-sdk`.

## Data (`apps/web/src/lib/api`, `apps/web/src/mock`)

- **Mode** (`lib/mode.ts`): `NEXT_PUBLIC_DATA_MODE=mock` (default) or `live`. In mock mode both axios clients use
  `mock/adapter.ts`, which answers every route from `mock/server.ts` (an in-browser backend persisted in localStorage,
  seeded from `@repo/mock/seed`). Endpoints, flows, hooks and screens run the exact same code in both modes. The mock
  enforces the backend + contract rules (admin-only routes, approval before allocation, max per beneficiary,
  available balance, no duplicate payouts, failed transactions that change no balances) and returns the same error
  envelope. Wallet signatures and Stellar submission are simulated in `mock/chain.ts`.
- **Demo panel** (`mock/DemoPanel.tsx`, mock mode only): network speed (fast / realistic), fail the next transaction,
  decline the next signature, reset demo data. Admin sign-in uses the **demo administrator wallet**
  (`DEMO_ADMIN_WALLET`, `features/auth/components/SignInDialog.tsx`).
- **Provisional contract:** paths and shapes in `dto.ts`, `endpoints.ts`, `flows.ts` come from the PRD backend table.
  When the backend publishes OpenAPI, update `dto.ts` + `adapters.ts` (+ paths) and keep `mock/server.ts` in step.
  Live mode: the browser calls `<basePath>/api/v1/*`, rewritten to `API_PROXY_TARGET/v1/*`.
- **Layers:** `dto.ts` → `adapters.ts` (→ `@repo/stellar/campaign`: snake_case, stroop strings, unix seconds) →
  `endpoints.ts` (reads) and `flows.ts` (writes). `publicApi` for public reads and the application form; `api` (bearer
  token, one shared refresh) for administrators.
- **On-chain writes:** `flows.ts` `onChain()` = prepare → sign → submit → `/sync`. Hooks: `useOnChain` / `useFundCampaign`
  / `useBatchPayout` (`features/disbursements/hooks.ts`), `useCreateCampaign`. UI: `TxDialog` + `TxProgress`
  (`lib/tx.ts` stages). Signer: `features/wallet/signer.ts` (demo wallet or Stellar Wallets Kit). Mutations never retry.
- **Amounts** are stroop strings; never float maths (`@repo/stellar/money`, `lib/format.ts`: `usd`, `fixed2`, `usdc`).

## Domain rules (PRD)

- Testnet USDC (Circle, `GBBD47…LFLA5`) only. XLM only for fees / Friendbot.
- Statuses and their chip labels live only in `features/*/status.ts`: beneficiary Pending · Under review · Approved ·
  Rejected · Allocated · Paid; payment Pending · Allocated · Ready · Processing · Paid · Failed · Cancelled; ledger
  Donation / Payment × Pending · Processing · Completed (Paid for payouts) · Failed.
- **A UI status is never proof of payment.** "Paid"/balances come from backend-verified chain data.
- **Privacy:** public screens, CSVs and the contract use beneficiary references only (`BNF-00042`). Names and evidence
  exist only on `BeneficiaryRecord` (admin). Always state that on-chain transfers and wallets are publicly observable.

## Design system (`packages/ui`)

Source: Figma "Aidtrace" (see `docs/DESIGN-PLAN.md`). Tokens in `src/styles/globals.css`: Graphite (`ink` #292929,
`night`, `muted`, `subtle`, `line`, `line-strong`, `field`, `page` #F6F6F6), Verdigris (`brand` #0E9F9A, `brand-dark`
#0B7774, `brand-deep`, `brand-soft`, `brand-tint`), Autumn Leaf (`accent` #F26A1B CTA, `accent-soft` active nav /
pending / reject, `accent-tint`, `accent-deep`), Golden Pollen (`pollen` #FFC93C, `pollen-soft`, `pollen-tint`,
`pollen-deep`), In Motion (`review` #6A4CC7 progress + under review), plus `success` / `warning` / `danger`. Radii:
`rounded-control` 5, `rounded-card` 8, `rounded-panel` 17. Fonts: Instrument Sans (+ DM Mono for hashes/addresses).
Type: `display`, `h-landing`, `h-landing-card` (landing); `h-page`, `h-section`, `stat-value`, `caption`, `label` (app).

Components: `button` (primary · accent · outline · ghost · approve · reject · danger · pill variants; `ArrowBadge`),
`brand` (`AidTraceMark`, `AidTraceLogo`, `AidTraceWordmark`, `BrandLoader`), `surface` (`Panel`, `PanelHeader`,
`Notice`, `Chip`, `DetailRow`, `StatCard`, `MiniBars`, `ProgressBar`), `field` (`Field`, `Input`, `Textarea`,
`AffixInput`, `SearchInput`), `sheet`, `dialog`, `popover`, `switch`, `checkbox`, `skeleton`, `spinner`, `sonner`,
`og-card`. App components: `DataTable` (+ `Pagination`, `FilterSelect`; tables become stacked cards below `md`),
`states` (`EmptyState`, `ErrorState`, skeletons), `TxDialog`, `TxProgress`, `HashLink` / `HashBox`, `PageHeader`.

Motion (all off for reduced motion): `.animate-rise` (stagger `--i`), `.animate-page`, `.animate-pop`, `.animate-signal`
(live statuses), `.animate-check`, `.animate-fill` (progress bars), `.animate-bars` (stat mini charts), `.animate-trace`
(`BrandLoader`), `.animate-record` (new ledger rows), `.reveal` (landing), `.shimmer`; `CountUp` / `CountUpUsd` for stats.

## Conventions

- Feature folders: `src/features/<domain>/{hooks.ts, components/, schema.ts, status.ts}`; route files stay thin
  server components (metadata + `await params/searchParams` via `lib/params.ts`) rendering one feature component.
  Admin screens wrap their feature in `AdminGate`.
- Every data screen handles loading (skeletons), empty (`EmptyState`), error (`ErrorState` + retry) and not-found.
- Check layouts at 390, 820 and 1440 wide. Sidebar from `lg`, drawer (`Sheet`) below.
- Imports `@/…` inside an app, `@repo/<pkg>/…` across packages. Named exports; route files default exports.
- Every `<form>` using `handleSubmit` needs `noValidate`. Use `useWatch`, not `watch()` (React Compiler).
- Never `setState` synchronously in `useEffect`; never read `ref.current` during render; no `Date.now()` in render
  (`useNow()`); admin-dependent UI waits for `useHydrated()`.

## Landmines

1. pnpm strict linking: import only declared dependencies; `next/*` stays in the apps.
2. Restart the dev server after `pnpm install`. Turbo needs `pnpm` on PATH (`corepack enable`).
3. New dependency with build scripts → `allowBuilds` in `pnpm-workspace.yaml`.
4. Don't `next build` into `.next` while `pnpm dev` runs (`NEXT_DIST_DIR=.next-verify`).
5. Next 16 error boundaries get `retry()`. Route params are Promises (`PageProps<"/route/[id]">`).
6. Keep `@radix-ui/*` on one release.
7. App tsconfigs target ES2020: `@repo/stellar` uses BigInt literals.
8. Stellar Wallets Kit touches `window` on import: dynamic import only (`kit.ts`).
9. `muted` is the secondary-text token; shadcn's muted surface is `bg-page`.
10. Zustand v5 selectors: one field per selector.
11. Bump `SEED_VERSION` in `packages/mock/src/seed.ts` when the seed changes (stored demo data is replaced).
12. Model timestamps are unix **seconds**; `lib/format.ts` accepts seconds or milliseconds.
