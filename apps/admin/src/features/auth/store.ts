import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthTokensDto } from "@/lib/api/dto";

/**
 * The platform-admin console's backend session (its own key: the organization app shares the origin on Vercel). Tokens are bearer credentials for this wallet's
 * AidTrace account only; they can't move funds (every transfer still needs a wallet signature).
 */
interface SessionState {
	address: string | null;
	accessToken: string | null;
	refreshToken: string | null;
	setTokens: (address: string, tokens: AuthTokensDto) => void;
	clear: () => void;
}

export const useSession = create<SessionState>()(
	persist(
		(set) => ({
			address: null,
			accessToken: null,
			refreshToken: null,
			setTokens: (address, tokens) => set({ address, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
			clear: () => set({ address: null, accessToken: null, refreshToken: null }),
		}),
		{ name: "aidtrace-admin-session" },
	),
);
