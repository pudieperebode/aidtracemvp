import type { AxiosInstance } from "axios";
import type { AuthTokensDto, ChallengeDto, Envelope, SignInDto } from "./dto";

/**
 * Wallet sign-in (no passwords): `POST /auth/challenge` returns a transaction with sequence number 0 (it can never be
 * submitted and moves nothing); the wallet signs it to prove it holds the key; `POST /auth/verify` returns a
 * short-lived access token and a single-use refresh token. The first sign-in creates the account.
 */

export type SignTransaction = (xdr: string, networkPassphrase: string) => Promise<string>;

export async function login(http: AxiosInstance, address: string, sign: SignTransaction): Promise<SignInDto> {
	const { data: challenge } = await http.post<Envelope<ChallengeDto>>("/auth/challenge", { address });
	const signedTransaction = await sign(challenge.data.transaction, challenge.data.networkPassphrase);
	const { data } = await http.post<Envelope<SignInDto>>("/auth/verify", {
		challengeId: challenge.data.challengeId,
		signedTransaction,
	});
	return data.data;
}

/** Refresh tokens are single use: store the new pair every time. */
export async function refresh(http: AxiosInstance, refreshToken: string): Promise<AuthTokensDto> {
	const { data } = await http.post<Envelope<AuthTokensDto>>("/auth/refresh", { refreshToken });
	return data.data;
}

export async function logout(http: AxiosInstance, refreshToken: string) {
	await http.post("/auth/logout", { refreshToken }).catch(() => undefined);
}
