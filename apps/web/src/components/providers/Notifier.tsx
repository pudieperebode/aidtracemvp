"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/sonner";
import { routes } from "@/lib/routes";
import { useNotifications } from "@/features/notifications/hooks";

const ATTENTION = new Set(["payout_failed", "funding_failed", "low_balance"]);

/**
 * Toasts new notifications from the backend inbox while the app is open .
 * Anything that arrives also means balances moved, so the money views are refreshed.
 */
export function Notifier() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data } = useNotifications();
	const seen = useRef<Set<string> | null>(null);

	useEffect(() => {
		if (!data) return;
		if (!seen.current) {
			seen.current = new Set(data.map((n) => n.id)); // first load: don't announce what's already there
			return;
		}
		const fresh = data.filter((n) => !seen.current!.has(n.id) && !n.read);
		for (const n of data) seen.current.add(n.id);
		if (!fresh.length) return;
		for (const key of ["campaigns", "campaign", "beneficiaries", "allocations", "ledger", "wallet"])
			void queryClient.invalidateQueries({ queryKey: [key] });
		for (const n of fresh.slice(0, 3)) {
			const action = n.campaign_reference
				? { label: "View", onClick: () => router.push(routes.CAMPAIGN(n.campaign_reference!)) }
				: undefined;
			if (ATTENTION.has(n.event)) toast.warning(n.message, { action });
			else toast.success(n.message, { action });
		}
	}, [data, queryClient, router]);

	return null;
}
