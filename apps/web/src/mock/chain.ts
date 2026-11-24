"use client";

import { consume, latency } from "./controls";

/**
 * The simulated administrator wallet for mock mode. It "signs" after a short pause (or declines when the Demo panel
 * says so). Like a real wallet it only signs: the signed transaction goes back to the (mock) backend, which submits
 * it and settles it after about one ledger close.
 */
export async function demoSign(xdr: string) {
	await latency("sign");
	if (consume("declineNext")) throw new Error("Request declined in the wallet (simulated). Nothing was submitted.");
	return `SIGNED:${xdr}`;
}
