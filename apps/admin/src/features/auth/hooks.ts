"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { login, logout } from "@/lib/api/auth";
import { api, publicApi } from "@/lib/api/client";
import { getMe } from "@/lib/api/endpoints";
import { errorMessage, httpStatus } from "@/lib/api/errors";
import { useSession } from "@/features/auth/store";
import { disconnectWallet } from "@/features/wallet/kit";
import { useWalletStore } from "@/features/wallet/store";
import { demoSign } from "@/mock/chain";

export const DEMO_WALLET_ID = "demo";

/** Revokes the refresh token, forgets the session and the wallet, drops every cached admin response. */
export function useSignOut() {
	const queryClient = useQueryClient();
	return useCallback(async () => {
		const { refreshToken, clear } = useSession.getState();
		const walletId = useWalletStore.getState().walletId;
		if (refreshToken) await logout(publicApi, refreshToken);
		clear();
		useWalletStore.getState().disconnect();
		if (walletId !== DEMO_WALLET_ID) disconnectWallet().catch(() => {});
		queryClient.clear();
	}, [queryClient]);
}

/** Mock mode: the same challenge → sign → verify sequence with a simulated wallet. */
export function useDemoSignIn() {
	const queryClient = useQueryClient();
	const [state, setState] = useState<{ status: "idle" | "signing" | "error"; error?: string }>({ status: "idle" });
	const signIn = useCallback(
		async (wallet: string) => {
			setState({ status: "signing" });
			try {
				const tokens = await login(publicApi, wallet, (xdr) => demoSign(xdr));
				useSession.getState().setTokens(wallet, tokens);
				useWalletStore.getState().setConnected(wallet, DEMO_WALLET_ID);
				queryClient.clear();
				setState({ status: "idle" });
				return true;
			} catch (error) {
				setState({ status: "error", error: errorMessage(error) });
				return false;
			}
		},
		[queryClient],
	);
	return { signIn, ...state };
}

export function useIsSignedIn() {
	const address = useWalletStore((s) => s.address);
	const sessionAddress = useSession((s) => s.address);
	const token = useSession((s) => s.accessToken ?? s.refreshToken);
	return !!address && sessionAddress === address && !!token;
}

/**
 * Console access (backend guide §14): the area shows when `GET /auth/me` returns `roles.platformAdmin: true`
 * (the wallet is in the backend's ADMIN_WALLETS). A 403 from any admin route also means no access.
 */
export function useAccess(): {
	state: "signed-out" | "checking" | "granted" | "denied" | "error";
	error?: unknown;
	retry: () => void;
} {
	const signedIn = useIsSignedIn();
	const address = useSession((s) => s.address);
	const me = useQuery({ queryKey: ["me", address], queryFn: () => getMe(api), enabled: signedIn, staleTime: 60_000, retry: 1 });
	const retry = () => void me.refetch();
	if (!signedIn) return { state: "signed-out", retry };
	if (me.isPending) return { state: "checking", retry };
	if (me.error) return httpStatus(me.error) === 403 ? { state: "denied", retry } : { state: "error", error: me.error, retry };
	return { state: me.data.roles.platformAdmin ? "granted" : "denied", retry };
}
