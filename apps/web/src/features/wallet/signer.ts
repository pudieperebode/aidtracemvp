"use client";

import type { Signer } from "@/lib/api/flows";
import { demoSign } from "@/mock/chain";
import { walletSigner } from "@/features/wallet/kit";

/** The kit id for the simulated administrator wallet in mock mode. */
export const DEMO_WALLET_ID = "demo";

/** The `Signer` for the connected wallet: the demo wallet in mock mode, otherwise a real wallet through the kit. */
export function signerFor(address: string, walletId: string | null): Signer {
	if (walletId === DEMO_WALLET_ID) return { address, sign: (xdr) => demoSign(xdr) };
	return walletSigner(address);
}
