"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { getUnreadCount, listNotifications } from "@/lib/api/endpoints";
import { markNotificationsRead } from "@/lib/api/flows";
import { useSession } from "@/features/auth/store";

/** Administrator notifications (Deliverable 1): new applications, funding confirmed, payouts confirmed / failed. */
export function useNotifications() {
	const token = useSession((s) => s.accessToken);
	return useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications(api), enabled: !!token, refetchInterval: 30_000 });
}

export function useUnreadCount() {
	const token = useSession((s) => s.accessToken);
	return useQuery({ queryKey: ["notifications", "unread"], queryFn: () => getUnreadCount(api), enabled: !!token, refetchInterval: 30_000 });
}

export function useMarkAllRead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => markNotificationsRead(api),
		onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
	});
}
