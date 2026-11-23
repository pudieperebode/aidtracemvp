"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, publicApi } from "@/lib/api/client";
import { getBeneficiary, listBeneficiaries } from "@/lib/api/endpoints";
import { applyAsBeneficiary, registerBeneficiary, reviewBeneficiary, type BeneficiaryInput, type ReviewDecision } from "@/lib/api/flows";
import { useSession } from "@/features/auth/store";
import { invalidateMoney } from "@/features/disbursements/hooks";

export const beneficiaryKeys = {
	list: (campaignId: string, filters: object) => ["beneficiaries", campaignId, filters] as const,
	one: (campaignId: string, id: string) => ["beneficiary", campaignId, id] as const,
};

export function useBeneficiaries(campaignId: string | undefined, filters: { status?: string; q?: string; limit?: number; offset?: number } = {}) {
	const token = useSession((s) => s.accessToken);
	return useQuery({
		queryKey: beneficiaryKeys.list(campaignId ?? "", filters),
		queryFn: () => listBeneficiaries(api, campaignId!, { limit: 8, ...filters }),
		enabled: !!token && !!campaignId,
		placeholderData: keepPreviousData,
	});
}

export function useBeneficiary(campaignId: string, id: string) {
	const token = useSession((s) => s.accessToken);
	return useQuery({ queryKey: beneficiaryKeys.one(campaignId, id), queryFn: () => getBeneficiary(api, campaignId, id), enabled: !!token });
}

/** Approve / reject / start review. Off-chain: eligibility is decided by the administrator (Deliverable 2 rule). */
export function useReviewBeneficiary(campaignId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, review }: { id: string; review: ReviewDecision }) => reviewBeneficiary(api, campaignId, id, review),
		onSuccess: () => invalidateMoney(queryClient, campaignId),
	});
}

export function useRegisterBeneficiary(campaignId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: BeneficiaryInput) => registerBeneficiary(api, campaignId, input),
		onSuccess: () => invalidateMoney(queryClient, campaignId),
	});
}

/** Public application form (no wallet session). */
export function useApply(reference: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: BeneficiaryInput) => applyAsBeneficiary(publicApi, reference, input),
		onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["beneficiaries"] }),
	});
}
