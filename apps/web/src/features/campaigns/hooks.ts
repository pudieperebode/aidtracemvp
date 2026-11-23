"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, publicApi } from "@/lib/api/client";
import { getCampaign, getPublicCampaign, getPublicStats, listCampaigns, listPublicCampaigns } from "@/lib/api/endpoints";
import { createCampaign, registerCampaign, type CreateCampaignInput } from "@/lib/api/flows";
import { isWalletRejection } from "@/lib/api/errors";
import type { TxStage } from "@/lib/tx";
import { useSession } from "@/features/auth/store";
import { useWalletStore } from "@/features/wallet/store";
import { signerFor } from "@/features/wallet/signer";
import { invalidateMoney } from "@/features/disbursements/hooks";

/** Query keys shared with invalidations (see `features/disbursements/hooks.ts`). */
export const campaignKeys = {
	all: ["campaigns"] as const,
	one: (id: string) => ["campaign", id] as const,
	public: (filters: object = {}) => ["public-campaigns", filters] as const,
	publicOne: (reference: string) => ["public-campaign", reference] as const,
	stats: ["public-stats"] as const,
};

// Public (no wallet) ---------------------------------------------------------------------------------------------

export const usePublicStats = () => useQuery({ queryKey: campaignKeys.stats, queryFn: () => getPublicStats(publicApi) });

export const usePublicCampaigns = (filters: { featured?: boolean; status?: string; q?: string } = {}) =>
	useQuery({ queryKey: campaignKeys.public(filters), queryFn: () => listPublicCampaigns(publicApi, { limit: 60, ...filters }), placeholderData: keepPreviousData });

export const usePublicCampaign = (reference: string) =>
	useQuery({ queryKey: campaignKeys.publicOne(reference), queryFn: () => getPublicCampaign(publicApi, reference), retry: (count, error) => count < 2 && (error as { response?: { status?: number } })?.response?.status !== 404 });

// Organization administrator ---------------------------------------------------------------------------------------

export function useCampaigns() {
	const token = useSession((s) => s.accessToken);
	return useQuery({ queryKey: campaignKeys.all, queryFn: () => listCampaigns(api, { limit: 100 }), enabled: !!token });
}

export function useCampaign(id: string | undefined) {
	const token = useSession((s) => s.accessToken);
	return useQuery({ queryKey: campaignKeys.one(id ?? ""), queryFn: () => getCampaign(api, id!), enabled: !!token && !!id });
}

/**
 * Screen 2 submit: create the draft, then register it on chain with the administrator wallet (TxProgress stages).
 * A declined or failed registration leaves a draft that `useRegisterCampaign` can finish later.
 */
export function useCreateCampaign() {
	const queryClient = useQueryClient();
	const address = useWalletStore((s) => s.address);
	const walletId = useWalletStore((s) => s.walletId);
	const [stage, setStage] = useState<TxStage>("idle");
	const [draft, setDraft] = useState<{ id: string; reference: string } | null>(null);

	const mutation = useMutation({
		mutationFn: async (input: CreateCampaignInput) => {
			if (!address) throw new Error("Connect the administrator wallet first.");
			setStage("signing");
			const base = signerFor(address, walletId);
			return createCampaign(
				api,
				input,
				{
					address,
					sign: async (xdr, passphrase) => {
						const signed = await base.sign(xdr, passphrase);
						setStage("submitting");
						return signed;
					},
				},
				setDraft,
			);
		},
		onSuccess: () => setStage("confirmed"),
		onError: (error) => setStage(isWalletRejection(error) ? "rejected" : "failed"),
		onSettled: () => invalidateMoney(queryClient),
	});

	return { ...mutation, stage, draft, reset: () => (setStage("idle"), setDraft(null), mutation.reset()) };
}

export function useRegisterCampaign() {
	const queryClient = useQueryClient();
	const address = useWalletStore((s) => s.address);
	const walletId = useWalletStore((s) => s.walletId);
	return useMutation({
		mutationFn: (id: string) => registerCampaign(api, id, signerFor(address!, walletId)),
		onSettled: (_d, _e, id) => invalidateMoney(queryClient, id),
	});
}
