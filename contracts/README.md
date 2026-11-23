# AidTrace Soroban contract

`aidtrace/`: campaign funding, allocation and disbursement in testnet USDC (PRD Deliverable 2). It's a scaffold for
now: the interface, storage layout, errors and events are defined, and the function bodies are `todo!()`.
`src/test.rs` lists the PRD §8 scenarios as ignored tests.

## Setup

Requires Rust (stable), the `wasm32v1-none` target and the Stellar CLI.

```bash
rustup target add wasm32v1-none
cargo install --locked stellar-cli
cd contracts/aidtrace && cargo add soroban-sdk && cargo add soroban-sdk --dev --features testutils   # pin latest
```

## Build, test, deploy (Testnet)

```bash
cd contracts
cargo test
stellar contract build
stellar keys generate aidtrace-deployer --network testnet --fund
stellar contract deploy --wasm target/wasm32v1-none/release/aidtrace.wasm --source aidtrace-deployer --network testnet
# USDC Stellar Asset Contract id for Circle's Testnet USDC:
stellar contract id asset --asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --network testnet
stellar contract invoke --id <CONTRACT_ID> --source aidtrace-deployer --network testnet -- init --token <USDC_SAC_ID>
```

Put the contract id in `apps/web/.env.local` as `NEXT_PUBLIC_AIDTRACE_CONTRACT_ID` and give it to the backend, then
record it in `docs/PLAN.md`.

## Rules the contract enforces

- Every write for a campaign requires the campaign administrator's auth (funding requires the funder's).
- Allocations: amount > 0, ≤ `max_allocation`, and within `raised − disbursed − allocated`.
- One allocation per beneficiary reference per campaign; payout moves it `Allocated → Paid` exactly once.
- State changes and the token transfer happen in the same invocation, so a failed transfer reverts both.
- Only privacy-safe references, wallets and amounts are stored. No personal data.
