"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { getAdmin, listAdmin, postAdmin, type ListParams } from "@/lib/api/endpoints";
import type { AdminRecord } from "@/lib/api/dto";
import { useAccess } from "@/features/auth/hooks";

/** One admin document (`/overview`, `/system`, `/users/{id}`, …). Waits for confirmed platform-admin access. */
export function useAdminDoc<T = AdminRecord>(path: string | null) {
	const granted = useAccess().state === "granted";
	return useQuery({
		queryKey: ["admin", path],
		queryFn: () => getAdmin<T>(api, path!),
		enabled: granted && !!path,
	});
}

/** One page of an admin list. */
export function useAdminList<T = AdminRecord>(resource: string, params: ListParams) {
	const granted = useAccess().state === "granted";
	return useQuery({
		queryKey: ["admin", resource, params],
		queryFn: () => listAdmin<T>(api, resource, params),
		enabled: granted,
		placeholderData: keepPreviousData,
	});
}

/** An admin write. Never retried; refetches every admin query afterwards (the backend owns state). */
export function useAdminAction<V = void>(path: (vars: V) => string, body?: (vars: V) => unknown) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (vars: V) => postAdmin(api, path(vars), body?.(vars)),
		onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
	});
}
