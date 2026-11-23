"use client";

import { mockTxHash } from "@repo/mock/seed";
import { consume, latency } from "./controls";

/**
 * Simulated wallet + Stellar Testnet for mock mode. The demo wallet "approves" after a short pause (or declines when
 * the Demo panel says so); submission waits about one ledger close and returns a transaction hash. Whether the
 * transaction succeeds is decided by the mock backend at `/sync`, as the real backend verifies results on chain.
 */

export const isMockXdr = (xdr: string) => xdr.startsWith("MOCK:");

export async function demoSign(xdr: string) {
	await latency("sign");
	if (consume("declineNext")) throw new Error("Request declined in the wallet (simulated). Nothing was submitted.");
	return `SIGNED:${xdr}`;
}

export async function demoSignMessage() {
	await latency("sign");
	if (consume("declineNext")) throw new Error("Sign-in declined in the wallet (simulated).");
	return "bW9jay1zaWduYXR1cmU=";
}

export async function mockSubmit(signedXdr: string) {
	await latency("ledger");
	return mockTxHash(`${signedXdr}:${Date.now()}`);
}
