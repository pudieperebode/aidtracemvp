"use client";

import { latency } from "./controls";

/** The simulated platform-admin wallet: it only ever signs the sign-in challenge (platform admins never move funds). */
export async function demoSign(xdr: string) {
	await latency("sign");
	return `SIGNED:${xdr}`;
}
