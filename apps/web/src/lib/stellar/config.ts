/**
 * This app's Stellar settings. Network-wide constants (passphrase, explorer, assets) live in
 * `@repo/stellar`; only what differs per deployment is read from env here.
 */

export { NETWORK_PASSPHRASE, STELLAR_NETWORK, explorer } from "@repo/stellar/network";
export { USDC, XLM, CAMPAIGN_ASSET, assetId, assetCode, assetById } from "@repo/stellar/assets";
export { fromStroops, toStroops, shortKey, formatAmount } from "@repo/stellar/format";
