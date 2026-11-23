"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DEMO_ADMIN_WALLET } from "@repo/mock/seed";
import { login, logout } from "@/lib/api/auth";
import { publicApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { useSession } from "@/features/auth/store";
import { disconnectWallet } from "@/features/wallet/kit";
import { useWalletStore } from "@/features/wallet/store";
import { DEMO_WALLET_ID } from "@/features/wallet/signer";
import { demoSignMessage } from "@/mock/chain";

/** Signs out: revokes the refresh token on the backend, forgets the session and the wallet, drops cached data. */
export function useSignOut() {
	const queryClient = useQueryClient();
	return useCallback(async () => {
		const { refreshToken, clear } = useSession.getState();
		const walletId = useWalletStore.getState().walletId;
		if (refreshToken) await logout(publicApi, refreshToken);
		clear();
		useWalletStore.getState().disconnect();
		if (walletId !== DEMO_WALLET_ID) disconnectWallet().catch(() => {}); // best effort: the WalletConnect relay may be unreachable
		queryClient.clear();
	}, [queryClient]);
}

/**
 * Mock mode: sign in as the demo organization administrator. Runs the same challenge → sign → login sequence as a
 * real wallet, with the signature simulated.
 */
export function useDemoSignIn() {
	const queryClient = useQueryClient();
	const [state, setState] = useState<{ status: "idle" | "signing" | "error"; error?: string }>({ status: "idle" });
	const signIn = useCallback(async () => {
		setState({ status: "signing" });
		try {
			const tokens = await login(publicApi, DEMO_ADMIN_WALLET, () => demoSignMessage());
			useSession.getState().setTokens(DEMO_ADMIN_WALLET, tokens);
			useWalletStore.getState().setConnected(DEMO_ADMIN_WALLET, DEMO_WALLET_ID);
			queryClient.clear();
			setState({ status: "idle" });
			return true;
		} catch (error) {
			setState({ status: "error", error: errorMessage(error) });
			return false;
		}
	}, [queryClient]);
	return { signIn, ...state };
}

/** True when an administrator session exists for the connected wallet. */
export function useIsAdmin() {
	const address = useWalletStore((s) => s.address);
	const sessionAddress = useSession((s) => s.address);
	const token = useSession((s) => s.accessToken ?? s.refreshToken);
	return !!address && sessionAddress === address && !!token;
}
