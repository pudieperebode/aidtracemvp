"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api/client";
import { listLedger, type LedgerFilters } from "@/lib/api/endpoints";

/** Screen 6: the public ledger (no wallet). Refreshes every 15 s so new payments appear on their own. */
export function useLedger(filters: LedgerFilters, enabled = true) {
	return useQuery({
		queryKey: ["ledger", filters],
		queryFn: () => listLedger(publicApi, filters),
		placeholderData: keepPreviousData,
		refetchInterval: 15_000,
		enabled,
	});
}
