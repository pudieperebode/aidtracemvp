"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, publicApi } from "@/lib/api/client";
import { getCampaign, getPublicCampaign, getPublicStats, listCampaigns, listPublicCampaigns } from "@/lib/api/endpoints";
import { createCampaign, publishCampaign, type CreateCampaignInput } from "@/lib/api/flows";
import { httpStatus } from "@/lib/api/errors";
import { useSession } from "@/features/auth/store";
import { invalidateMoney } from "@/features/disbursements/hooks";

/** Query keys shared with invalidations (see `features/disbursements/hooks.ts`). */
export const campaignKeys = {
	all: ["campaigns"] as const,
	one: (reference: string) => ["campaign", reference] as const,
	public: (filters: object = {}) => ["public-campaigns", filters] as const,
	publicOne: (reference: string) => ["public-campaign", reference] as const,
	stats: ["public-stats"] as const,
};

// Public (no wallet) ---------------------------------------------------------------------------------------------

export const usePublicStats = () => useQuery({ queryKey: campaignKeys.stats, queryFn: () => getPublicStats(publicApi) });

export const usePublicCampaigns = (
	filters: {
		status?: "active" | "funded" | "closed";
		search?: string;
		category?: string;
		featured?: boolean;
		limit?: number;
	} = {},
) =>
	useQuery({
		queryKey: campaignKeys.public(filters),
		queryFn: () => listPublicCampaigns(publicApi, { limit: 60, ...filters }),
		placeholderData: keepPreviousData,
	});

export const usePublicCampaign = (reference: string) =>
	useQuery({
		queryKey: campaignKeys.publicOne(reference),
		queryFn: () => getPublicCampaign(publicApi, reference),
		retry: (count, error) => count < 2 && httpStatus(error) !== 404,
	});

// Organization administrator ---------------------------------------------------------------------------------------

export function useCampaigns() {
	const token = useSession((s) => s.accessToken);
	return useQuery({ queryKey: campaignKeys.all, queryFn: () => listCampaigns(api), enabled: !!token });
}

export function useCampaign(reference: string | undefined) {
	const token = useSession((s) => s.accessToken);
	return useQuery({
		queryKey: campaignKeys.one(reference ?? ""),
		queryFn: () => getCampaign(api, reference!),
		enabled: !!token && !!reference,
	});
}

/**
 * Screen 2 submit: create the draft, then publish it (draft → active, no signature). If publishing fails the draft
 * is kept, and `usePublishCampaign` can finish it later.
 */
export function useCreateCampaign() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateCampaignInput) => {
			const draft = await createCampaign(api, input);
			try {
				return { campaign: await publishCampaign(api, draft.reference), published: true as const };
			} catch (error) {
				return { campaign: draft, published: false as const, publishError: error };
			}
		},
		onSettled: () => invalidateMoney(queryClient),
	});
}

export function usePublishCampaign() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (reference: string) => publishCampaign(api, reference),
		onSettled: (_d, _e, reference) => invalidateMoney(queryClient, reference),
	});
}
