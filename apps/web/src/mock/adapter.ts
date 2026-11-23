"use client";

import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse } from "axios";
import { latency } from "./controls";
import { handle } from "./server";

/**
 * An axios adapter that answers from the mock backend instead of the network. Installed on both API clients in mock
 * mode (`lib/api/client.ts`), so screens, hooks, endpoints and flows run the exact code they will run against the
 * real backend, including the 401 → refresh path and error envelopes.
 */
export const mockAdapter: AxiosAdapter = async (config) => {
	const method = (config.method ?? "get").toUpperCase();
	const url = new URL(config.url ?? "/", "http://mock.local");
	const path = url.pathname.replace(/^\/api\/v1/, "").replace(/\/+$/, "") || "/";
	const params: Record<string, unknown> = { ...Object.fromEntries(url.searchParams), ...(config.params ?? {}) };
	let body: unknown = config.data;
	if (typeof body === "string") {
		try {
			body = JSON.parse(body);
		} catch {
			// leave as text
		}
	}
	const headers = AxiosHeaders.from(config.headers as AxiosHeaders);
	const auth = headers.get("Authorization");
	const token = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : null;

	await latency(method === "GET" ? "read" : "write");
	const result = handle({ method, path, params, body, token });

	const response: AxiosResponse = {
		data: result.body,
		status: result.status,
		statusText: result.status < 400 ? "OK" : "Error",
		headers: {},
		config,
		request: { mock: true },
	};
	if (result.status >= 400) {
		throw new AxiosError((result.body as { message?: string }).message ?? "Request failed", result.status >= 500 ? "ERR_BAD_RESPONSE" : "ERR_BAD_REQUEST", config, response.request, response);
	}
	return response;
};
