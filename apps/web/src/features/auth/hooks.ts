"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEMO_ADMIN_WALLET } from "@repo/mock/seed";
import { login, logout } from "@/lib/api/auth";
import { api, publicApi } from "@/lib/api/client";
import { getMe, getMyOrganization } from "@/lib/api/endpoints";
import { registerOrganization, type RegisterOrganizationInput } from "@/lib/api/flows";
import { errorMessage } from "@/lib/api/errors";
import { useSession } from "@/features/auth/store";
import { disconnectWallet } from "@/features/wallet/kit";
import { useWalletStore } from "@/features/wallet/store";
import { DEMO_WALLET_ID } from "@/features/wallet/signer";
import { demoSign } from "@/mock/chain";

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
 * Mock mode: sign in as the demo organization administrator. Runs the same challenge → sign → verify sequence as a
 * real wallet, with the signature simulated.
 */
export function useDemoSignIn() {
	const queryClient = useQueryClient();
	const [state, setState] = useState<{ status: "idle" | "signing" | "error"; error?: string }>({ status: "idle" });
	const signIn = useCallback(async () => {
		setState({ status: "signing" });
		try {
			const tokens = await login(publicApi, DEMO_ADMIN_WALLET, (xdr) => demoSign(xdr));
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

/** True when a backend session exists for the connected wallet. */
export function useIsSignedIn() {
	const address = useWalletStore((s) => s.address);
	const sessionAddress = useSession((s) => s.address);
	const token = useSession((s) => s.accessToken ?? s.refreshToken);
	return !!address && sessionAddress === address && !!token;
}

/** The signed-in wallet and its roles (`organizationAdmin`: it has registered an organization). */
export function useMe() {
	const signedIn = useIsSignedIn();
	const address = useSession((s) => s.address);
	return useQuery({ queryKey: ["me", address], queryFn: () => getMe(api), enabled: signedIn, staleTime: 60_000 });
}

/** Signed in *and* administering an organization: may manage campaigns, beneficiaries and payouts. */
export function useIsAdmin() {
	const signedIn = useIsSignedIn();
	const me = useMe();
	return signedIn && !!me.data?.roles.organizationAdmin;
}

export function useOrganization() {
	const signedIn = useIsSignedIn();
	const address = useSession((s) => s.address);
	return useQuery({
		queryKey: ["organization", address],
		queryFn: () => getMyOrganization(api),
		enabled: signedIn,
		staleTime: 60_000,
	});
}

/** Deliverable 1 "Organization registration": the signed-in wallet becomes the authorized administrator wallet. */
export function useRegisterOrganization() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: RegisterOrganizationInput) => registerOrganization(api, input),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["me"] });
			void queryClient.invalidateQueries({ queryKey: ["organization"] });
		},
	});
}
