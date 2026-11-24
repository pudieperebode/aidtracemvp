"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { decimalToStroops } from "@repo/stellar/format";
import { api } from "@/lib/api/client";
import { getWallet } from "@/lib/api/endpoints";
import { enableUsdc, fundWalletWithXlm } from "@/lib/api/flows";
import { useSession } from "@/features/auth/store";
import { useWalletStore } from "@/features/wallet/store";
import { signerFor } from "@/features/wallet/signer";

export interface WalletBalances {
	address: string;
	/** False until the account exists on Testnet (Friendbot). */
	funded: boolean;
	/** Stroops. Null when the wallet has no USDC trustline yet ("Enable USDC"). */
	usdc: string | null;
	xlm: string;
}

/** The signed-in wallet's balances, live from the network (`GET /wallet`). */
export function useWalletBalances() {
	const token = useSession((s) => s.accessToken);
	return useQuery({
		queryKey: ["wallet", token ? "session" : "none"],
		queryFn: async (): Promise<WalletBalances> => {
			const w = await getWallet(api);
			const usdc = w.assets.find((a) => a.code === "USDC" && !a.native);
			const xlm = w.assets.find((a) => a.native);
			return {
				address: w.address,
				funded: w.exists,
				usdc: usdc?.trusted ? decimalToStroops(usdc.balance ?? "0") : null,
				xlm: decimalToStroops(xlm?.balance ?? "0"),
			};
		},
		enabled: !!token,
	});
}

/** Friendbot test XLM through the backend (`POST /wallet/fund`): creates the account on Testnet. */
export function useFundXlm() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => fundWalletWithXlm(api),
		onSettled: () => void queryClient.invalidateQueries({ queryKey: ["wallet"] }),
	});
}

/** Adds the USDC trustline: the backend prepares it, the wallet signs, the backend checks and submits it. */
export function useEnableUsdc() {
	const queryClient = useQueryClient();
	const address = useWalletStore((s) => s.address);
	const walletId = useWalletStore((s) => s.walletId);
	return useMutation({
		mutationFn: () => {
			if (!address) throw new Error("Connect your wallet first.");
			return enableUsdc(api, signerFor(address, walletId));
		},
		onSettled: () => void queryClient.invalidateQueries({ queryKey: ["wallet"] }),
	});
}
