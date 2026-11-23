"use client";

import { useSyncExternalStore } from "react";
import { useSession } from "@/features/auth/store";
import { useWalletStore } from "@/features/wallet/store";

const subscribe = (onChange: () => void) => {
	const a = useWalletStore.persist.onFinishHydration(onChange);
	const b = useSession.persist.onFinishHydration(onChange);
	return () => {
		a();
		b();
	};
};
const hasHydrated = () => useWalletStore.persist.hasHydrated() && useSession.persist.hasHydrated();

/**
 * True once the persisted wallet + session stores have loaded on the client. Render admin-dependent UI only after
 * this, so the server render (always signed out) and the first client render agree.
 */
export function useHydrated() {
	return useSyncExternalStore(subscribe, hasHydrated, () => false);
}
