"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Demo controls for simulating the process before the backend exists (the panel in `DemoPanel.tsx`):
 * network speed, and one-shot failures to see the failed / declined paths of every on-chain action.
 */
interface MockControls {
	/** `realistic` waits roughly like Stellar Testnet (≈5 s ledgers); `fast` keeps demos snappy. */
	speed: "fast" | "realistic";
	/** The next on-chain transaction fails after submission (nothing is deducted). */
	failNext: boolean;
	/** The next wallet signature request is declined (nothing is submitted). */
	declineNext: boolean;
	setSpeed: (speed: "fast" | "realistic") => void;
	setFailNext: (value: boolean) => void;
	setDeclineNext: (value: boolean) => void;
}

export const useMockControls = create<MockControls>()(
	persist(
		(set) => ({
			speed: "fast",
			failNext: false,
			declineNext: false,
			setSpeed: (speed) => set({ speed }),
			setFailNext: (failNext) => set({ failNext }),
			setDeclineNext: (declineNext) => set({ declineNext }),
		}),
		{ name: "aidtrace-mock-controls" },
	),
);

/** Reads and clears a one-shot flag. */
export function consume(flag: "failNext" | "declineNext") {
	const state = useMockControls.getState();
	if (!state[flag]) return false;
	if (flag === "failNext") state.setFailNext(false);
	else state.setDeclineNext(false);
	return true;
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A delay scaled by the chosen speed, with a little jitter. */
export function latency(kind: "read" | "write" | "sign" | "ledger") {
	const realistic = useMockControls.getState().speed === "realistic";
	const base = {
		read: realistic ? 450 : 160,
		write: realistic ? 700 : 260,
		sign: realistic ? 1600 : 700,
		ledger: realistic ? 4500 : 1300,
	}[kind];
	return wait(base * (0.8 + Math.random() * 0.4));
}
