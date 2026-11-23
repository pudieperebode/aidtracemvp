/**
 * Minimal Stellar StrKey encoding for account ids (G…), with no SDK dependency, so mock data can carry real-looking,
 * checksum-valid addresses. Production code validates addresses with `@stellar/stellar-sdk`'s `StrKey`.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ACCOUNT_VERSION = 6 << 3; // "G"

function crc16xmodem(bytes: Uint8Array) {
	let crc = 0x0000;
	for (const byte of bytes) {
		crc ^= byte << 8;
		for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
	}
	return crc;
}

function base32(bytes: Uint8Array) {
	let bits = 0;
	let value = 0;
	let out = "";
	for (const byte of bytes) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			out += ALPHABET[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
	return out;
}

/** 32 raw ed25519 public-key bytes → "G…" (56 chars). */
export function encodeAccountId(publicKey: Uint8Array): string {
	if (publicKey.length !== 32) throw new Error("Expected 32 bytes");
	const payload = new Uint8Array(33);
	payload[0] = ACCOUNT_VERSION;
	payload.set(publicKey, 1);
	const crc = crc16xmodem(payload);
	const full = new Uint8Array(35);
	full.set(payload);
	full[33] = crc & 0xff;
	full[34] = crc >> 8;
	return base32(full);
}

/** A deterministic, valid account id from a seed string (mock data only; there is no secret key behind it). */
export function mockAccountId(seed: string): string {
	const bytes = new Uint8Array(32);
	let h = 2166136261;
	for (let i = 0; i < 32; i++) {
		for (const ch of `${seed}:${i}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
		bytes[i] = h & 0xff;
	}
	return encodeAccountId(bytes);
}
