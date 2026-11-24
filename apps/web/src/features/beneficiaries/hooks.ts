"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, publicApi } from "@/lib/api/client";
import {
	getApplicationStatus,
	getBeneficiaryRecord,
	listAllocations,
	listBeneficiaries,
	type BeneficiaryFilters,
} from "@/lib/api/endpoints";
import {
	applyToCampaign,
	downloadEvidence,
	registerBeneficiary,
	resendStatusLink,
	reviewBeneficiary,
	uploadApplicationEvidence,
	uploadBeneficiaryEvidence,
	type BeneficiaryInput,
	type ReviewDecision,
} from "@/lib/api/flows";
import { errorMessage } from "@/lib/api/errors";
import { useSession } from "@/features/auth/store";
import { invalidateMoney } from "@/features/disbursements/hooks";

export const beneficiaryKeys = {
	list: (campaign: string, filters: object) => ["beneficiaries", campaign, filters] as const,
	one: (campaign: string, id: string) => ["beneficiary", campaign, id] as const,
	allocations: (campaign: string) => ["allocations", campaign] as const,
};

/** A page of the organization's beneficiary rows (name, reference, wallet, status, allocation). */
export function useBeneficiaries(campaign: string | undefined, filters: BeneficiaryFilters = {}) {
	const token = useSession((s) => s.accessToken);
	return useQuery({
		queryKey: beneficiaryKeys.list(campaign ?? "", filters),
		queryFn: () => listBeneficiaries(api, campaign!, { limit: 8, ...filters }),
		enabled: !!token && !!campaign,
		placeholderData: keepPreviousData,
	});
}

/** Every allocation of the campaign (no names). Fund allocation uses it for the ids that pay and cancel need. */
export function useAllocations(campaign: string | undefined) {
	const token = useSession((s) => s.accessToken);
	return useQuery({
		queryKey: beneficiaryKeys.allocations(campaign ?? ""),
		queryFn: () => listAllocations(api, campaign!),
		enabled: !!token && !!campaign,
	});
}

/**
 * The protected record (name, contact, eligibility details, evidence). Every load is access-logged by the backend,
 * so it only runs while the record dialog is open, and isn't refetched in the background.
 */
export function useBeneficiaryRecord(campaign: string | undefined, id: string | undefined) {
	const token = useSession((s) => s.accessToken);
	return useQuery({
		queryKey: beneficiaryKeys.one(campaign ?? "", id ?? ""),
		queryFn: () => getBeneficiaryRecord(api, campaign!, id!),
		enabled: !!token && !!campaign && !!id,
		staleTime: Infinity,
		gcTime: 0,
		refetchOnWindowFocus: false,
	});
}

/** start_review / approve / reject / reopen. Off-chain: eligibility is decided by the administrator. */
export function useReviewBeneficiary(campaign: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, decision, note }: { id: string; decision: ReviewDecision; note?: string }) =>
			reviewBeneficiary(api, campaign, id, decision, note),
		onSuccess: (_d, { id }) => {
			invalidateMoney(queryClient, campaign);
			void queryClient.invalidateQueries({ queryKey: beneficiaryKeys.one(campaign, id) });
		},
	});
}

export interface RegisterResult {
	reference: string;
	/** Files that didn't upload (the beneficiary is registered either way). */
	failedFiles: { name: string; message: string }[];
}

/** Registers the beneficiary, then uploads each evidence file to protected storage. */
export function useRegisterBeneficiary(campaign: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ input, evidence }: { input: BeneficiaryInput; evidence: File[] }): Promise<RegisterResult> => {
			const created = await registerBeneficiary(api, campaign, input);
			const failedFiles: RegisterResult["failedFiles"] = [];
			for (const file of evidence) {
				try {
					await uploadBeneficiaryEvidence(api, campaign, created.id, file);
				} catch (error) {
					failedFiles.push({ name: file.name, message: errorMessage(error) });
				}
			}
			return { reference: created.reference, failedFiles };
		},
		onSuccess: () => invalidateMoney(queryClient, campaign),
	});
}

export function useResendStatusLink(campaign: string) {
	return useMutation({ mutationFn: (id: string) => resendStatusLink(api, campaign, id) });
}

export function useDownloadEvidence(campaign: string) {
	return useMutation({
		mutationFn: ({ id, fileId, name }: { id: string; fileId: string; name: string }) =>
			downloadEvidence(api, campaign, id, fileId, name),
	});
}

/** Public application form (no wallet session). The answer is the same whether or not the wallet already applied. */
export function useApply(reference: string) {
	return useMutation({
		mutationFn: ({ input, files }: { input: BeneficiaryInput & { email: string }; files: File[] }) =>
			applyToCampaign(publicApi, reference, input, files),
	});
}

/** The applicant's private status page. The token lives in memory only and goes in a header, never a URL. */
export function useApplicationStatus(token: string | null) {
	return useQuery({
		queryKey: ["application-status", token],
		queryFn: () => getApplicationStatus(publicApi, token!),
		enabled: !!token,
		retry: false,
		refetchOnWindowFocus: false,
	});
}

export function useUploadApplicationEvidence(token: string | null) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (file: File) => uploadApplicationEvidence(publicApi, token!, file),
		onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["application-status", token] }),
	});
}
