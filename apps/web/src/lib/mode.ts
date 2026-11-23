/**
 * Where data comes from. `mock` (the default until the backend is live): an in-browser mock backend
 * (`src/mock`) answers every API call through the same axios client, and wallet signatures are simulated by a demo
 * administrator wallet. `live`: the real backend through the `/api/v1` proxy and real Stellar wallets.
 * Switch with NEXT_PUBLIC_DATA_MODE=live once the backend is deployed; nothing else changes.
 */
export const DATA_MODE: "mock" | "live" = process.env.NEXT_PUBLIC_DATA_MODE === "live" ? "live" : "mock";

export const IS_MOCK = DATA_MODE === "mock";
