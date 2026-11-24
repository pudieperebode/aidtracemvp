"use client";

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A short, slightly jittered delay so loading states show in mock mode. */
export function latency(kind: "read" | "write" | "sign") {
	const base = { read: 160, write: 280, sign: 600 }[kind];
	return wait(base * (0.8 + Math.random() * 0.4));
}
