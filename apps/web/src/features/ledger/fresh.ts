"use client";

import { useNow } from "@/lib/clock";
import type { LedgerEntry } from "@repo/stellar/campaign";

/** Ledger rows recorded in the last 20 seconds: they get the brief "just recorded" wash (`.animate-record`). */
export function useFreshIds(rows: LedgerEntry[] | undefined) {
	const now = useNow(5_000);
	return new Set((rows ?? []).filter((r) => now - r.timestamp * 1000 < 20_000).map((r) => r.id));
}
