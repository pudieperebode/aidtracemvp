"use client";

import { create } from "zustand";

/** One sign-in dialog for the whole app: the header's "Admin" button and admin-only screens both open it. */
export const useSignInDialog = create<{ open: boolean; setOpen: (open: boolean) => void }>()((set) => ({
	open: false,
	setOpen: (open) => set({ open }),
}));
