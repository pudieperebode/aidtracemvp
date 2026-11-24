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
	for (const key of Object.keys(params)) if (params[key] === undefined) delete params[key];
	let body: unknown = config.data;
	if (typeof body === "string") {
		try {
			body = JSON.parse(body);
		} catch {
			// leave as text
		}
	}
	const requestHeaders = AxiosHeaders.from(config.headers as AxiosHeaders);
	const auth = requestHeaders.get("Authorization");
	const token = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : null;
	const headers: Record<string, string> = {};
	for (const [key, value] of Object.entries(requestHeaders.toJSON()))
		if (typeof value === "string") headers[key.toLowerCase()] = value;

	await latency(method === "GET" ? "read" : path.endsWith("/submit") ? "sign" : "write");
	const result = handle({ method, path, params, body, token, headers });

	const response: AxiosResponse = {
		data: result.status === 204 ? "" : result.body,
		status: result.status,
		statusText: result.status < 400 ? "OK" : "Error",
		headers: result.headers ?? {},
		config,
		request: { mock: true },
	};
	if (result.status >= 400) {
		throw new AxiosError(
			(result.body as { message?: string }).message ?? "Request failed",
			result.status >= 500 ? "ERR_BAD_RESPONSE" : "ERR_BAD_REQUEST",
			config,
			response.request,
			response,
		);
	}
	return response;
};
