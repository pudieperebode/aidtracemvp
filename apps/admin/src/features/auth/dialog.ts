"use client";

import { create } from "zustand";

/** One sign-in dialog for the console: the header button and the access gate both open it. */
export const useSignInDialog = create<{ open: boolean; setOpen: (open: boolean) => void }>()((set) => ({
	open: false,
	setOpen: (open) => set({ open }),
}));
