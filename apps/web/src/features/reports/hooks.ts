"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { getReconciliation } from "@/lib/api/endpoints";
import { useSession } from "@/features/auth/store";

/** Screen 7: confirmed payouts matched against allocations (backend reconciliation). */
export function useReconciliation(campaignId: string | undefined) {
	const token = useSession((s) => s.accessToken);
	return useQuery({ queryKey: ["reconciliation", campaignId], queryFn: () => getReconciliation(api, campaignId!), enabled: !!token && !!campaignId });
}
