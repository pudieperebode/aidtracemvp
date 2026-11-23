/**
 * Stages of a wallet-signed action (fund campaign, register on chain, execute payout), shown by `TxProgress`.
 * `rejected`: declined in the wallet, nothing sent. `failed`: sent but not confirmed on chain.
 * Only `confirmed` (a Stellar transaction the backend has verified) may update balances in the UI (Deliverable 2).
 */
export type TxStage = "idle" | "signing" | "submitting" | "confirmed" | "rejected" | "failed";
