import type { ErrorEnvelope } from "./dto";

/**
 * What a failed call looks like to the UI. Backend errors share one envelope (`{ statusCode, message, data: null,
 * error: { code, fields, retryAfterSeconds, requestId } }`): show `message`, branch on the stable `error.code`, put
 * `error.fields` under the inputs. Wallet errors are plain `Error`s with a readable message.
 */
export type ApiErrorLike = {
	name?: string;
	message?: string;
	code?: string;
	response?: { status?: number; data?: Partial<ErrorEnvelope> };
};

const body = (error: unknown) => (error as ApiErrorLike | undefined)?.response?.data;

export function errorMessage(error: unknown, fallback = "Something went wrong. Try again.") {
	const e = error as ApiErrorLike | undefined;
	const data = body(error);
	if (data?.message) return data.message;
	if (e?.response?.status === 429) return "Too many requests. Wait a moment and try again.";
	if (e?.response?.status && e.response.status >= 500)
		return "The AidTrace service is having trouble. Your funds are unaffected; try again shortly.";
	if (e?.message === "Network Error") return "We couldn't reach AidTrace. Check your connection and try again.";
	return e?.message || fallback;
}

/** The backend's stable error code (`VALIDATION_FAILED`, `TRUSTLINE_MISSING`, …), or the `code` of an `ActionError`. */
export const errorCode = (error: unknown): string | undefined =>
	body(error)?.error?.code ?? (error as ApiErrorLike | undefined)?.code;

/** Per-field messages (`items.0.amount` paths are zero-based). The guide calls them `fields`; OpenAPI says `details`. */
export function fieldErrors(error: unknown): { field: string; message: string }[] {
	const e = body(error)?.error;
	const list = e?.fields ?? e?.details;
	if (!Array.isArray(list)) return [];
	return list.filter(
		(f): f is { field: string; message: string } => typeof f === "object" && f !== null && "field" in f && "message" in f,
	);
}

/** The backend's request id, to quote when reporting a problem. */
export const requestId = (error: unknown) => body(error)?.error?.requestId;

/** Seconds to wait after a 429. */
export const retryAfter = (error: unknown) => body(error)?.error?.retryAfterSeconds;

export const httpStatus = (error: unknown) => (error as ApiErrorLike | undefined)?.response?.status;

/** The user declined in their wallet: nothing was submitted, so this is not a failure to alarm about. */
export function isWalletRejection(error: unknown) {
	const e = error as ApiErrorLike | undefined;
	return errorCode(error) === "WALLET_DECLINED" || /declin|reject|denied|cancel/i.test(e?.message ?? "");
}

/**
 * A money action that reached Stellar (or the backend) and didn't complete. `code` is the backend's
 * `failureCode` (`INSUFFICIENT_BALANCE`, `TRANSACTION_EXPIRED`, …) or `PENDING` when it is still settling.
 */
export class ActionError extends Error {
	constructor(
		message: string,
		readonly code: string,
		readonly hash: string | null = null,
	) {
		super(message);
		this.name = "ActionError";
	}
}

/** The outcome isn't known yet: the backend keeps settling it. Never prepare the same payment again. */
export const isStillPending = (error: unknown) => error instanceof ActionError && error.code === "PENDING";

/** Codes that mean "prepare a fresh transaction and try again". */
export const isRetryable = (error: unknown) =>
	["TRANSACTION_EXPIRED", "CAMPAIGN_CHANGED", "WALLET_SEQUENCE_CHANGED", "NETWORK_BUSY", "EXPIRED"].includes(
		errorCode(error) ?? "",
	);
