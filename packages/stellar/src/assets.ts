/**
 * Assets AidTrace moves. The MVP funds campaigns and pays beneficiaries in Testnet USDC only (PRD §3,
 * Deliverable 2). XLM appears only as the network fee asset and for Friendbot-funded test accounts.
 */

/** Stellar classic assets use 7 decimal places (1 unit = 10^7 stroops). */
export const ASSET_DECIMALS = 7;

export interface StellarAsset {
	code: string;
	/** Absent for the native asset. */
	issuer?: string;
	label: string;
}

export const USDC: StellarAsset = {
	code: "USDC",
	// Circle's Testnet USDC.
	issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
	label: "USDC (Testnet)",
};

export const XLM: StellarAsset = { code: "XLM", label: "XLM (Testnet)" };

/** The one asset campaigns are funded and paid out in. */
export const CAMPAIGN_ASSET = USDC;

/** "USDC:GBBD…" or "XLM", the form records and the indexer use. */
export function assetId(asset: StellarAsset) {
	return asset.issuer ? `${asset.code}:${asset.issuer}` : asset.code;
}

/** "USDC:GBBD…" → "USDC". */
export function assetCode(id: string) {
	return id.split(":")[0] ?? id;
}

export function assetById(id: string): StellarAsset | undefined {
	return [USDC, XLM].find((asset) => assetId(asset) === id);
}
