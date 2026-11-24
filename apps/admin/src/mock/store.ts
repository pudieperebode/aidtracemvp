"use client";

import { createSeed, SEED_VERSION, type MockDb } from "@repo/mock/seed";
import { buildAdminState, type AdminState } from "./state";

/**
 * The console's mock database: the shared demo seed plus admin-only records (users, issues, logs), persisted in
 * localStorage under its own key so it never touches the organization app's demo data.
 */
const KEY = "aidtrace-admin-mock-db";

export interface AdminDb {
	version: number;
	seed: MockDb;
	admin: AdminState;
}

let db: AdminDb | null = null;

const fresh = (): AdminDb => {
	const seed = createSeed();
	return { version: SEED_VERSION, seed, admin: buildAdminState(seed) };
};

export function getDb(): AdminDb {
	if (db) return db;
	if (typeof window !== "undefined") {
		try {
			const stored = window.localStorage.getItem(KEY);
			const parsed = stored ? (JSON.parse(stored) as AdminDb) : null;
			if (parsed?.version === SEED_VERSION) db = parsed;
		} catch {
			// Corrupt or blocked storage: start from the seed.
		}
	}
	db ??= fresh();
	return db;
}

export function saveDb() {
	if (!db || typeof window === "undefined") return;
	try {
		window.localStorage.setItem(KEY, JSON.stringify(db));
	} catch {
		// Storage full or blocked: keep working in memory.
	}
}

export function resetMockDb() {
	db = fresh();
	saveDb();
}
