/**
 * Stages of a wallet-signed action (fund campaign, lock allocations, execute payout), shown by `TxProgress`.
 * `rejected`: declined in the wallet, nothing sent. `failed`: sent but Stellar didn't confirm it; no funds moved.
 * `pending`: submitted, the outcome isn't known yet; the backend keeps settling it, so it must not be sent again.
 * Only `confirmed` (the backend reports it confirmed on Stellar) may update balances in the UI (Deliverable 2).
 */
export type TxStage = "idle" | "signing" | "submitting" | "confirmed" | "pending" | "rejected" | "failed";
