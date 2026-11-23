"use client";

import { createSeed, SEED_VERSION, type MockDb } from "@repo/mock/seed";

/**
 * The mock backend's database: seeded once, then persisted in localStorage so a demo survives reloads. `resetMockDb()`
 * (Demo panel → Reset data) restores the seed.
 */
const KEY = "aidtrace-mock-db";

let db: MockDb | null = null;

export function getDb(): MockDb {
	if (db) return db;
	if (typeof window !== "undefined") {
		try {
			const stored = window.localStorage.getItem(KEY);
			const parsed = stored ? (JSON.parse(stored) as MockDb) : null;
			if (parsed?.version === SEED_VERSION) db = parsed;
		} catch {
			// Corrupt or blocked storage: fall back to a fresh seed.
		}
	}
	db ??= createSeed();
	return db;
}

export function saveDb() {
	if (!db || typeof window === "undefined") return;
	try {
		window.localStorage.setItem(KEY, JSON.stringify(db));
	} catch {
		// Storage full or blocked: the demo keeps working in memory.
	}
}

export function resetMockDb() {
	db = createSeed();
	saveDb();
}

export function nextId(prefix: string) {
	const d = getDb();
	return `${prefix}_${(d.counters.id++).toString(36).padStart(6, "0")}`;
}
