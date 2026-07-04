/**
 * Client-side subject ID generation.
 *
 * @remarks
 * Generates time-ordered, base58-encoded identifiers that match the server format:
 * - Prefixed with `sub_` for clear identification
 * - 8 bytes for timestamp (time since epoch 1_700_000_000_000)
 * - 12 bytes of randomness for uniqueness
 * - Base58 encoded for URL-safe, compact representation
 */

const BASE58_ALPHABET =
	'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(bytes: Uint8Array): string {
	const base = BigInt(58);
	let num = BigInt(0);

	for (const byte of bytes) {
		num = num * BigInt(256) + BigInt(byte);
	}

	const chars: string[] = [];
	while (num > 0) {
		const remainder = num % base;
		chars.unshift(BASE58_ALPHABET.charAt(Number(remainder)));
		num = num / base;
	}

	for (const byte of bytes) {
		if (byte === 0) {
			chars.unshift(BASE58_ALPHABET.charAt(0));
		} else {
			break;
		}
	}

	return chars.join('') || BASE58_ALPHABET.charAt(0);
}

const EPOCH_TIMESTAMP = 1_700_000_000_000;

/**
 * Generates a unique subject ID for client-side use (`sub_<base58>`).
 */
export function generateSubjectId(): string {
	const buf = crypto.getRandomValues(new Uint8Array(20));
	const t = Date.now() - EPOCH_TIMESTAMP;
	const high = Math.floor(t / 0x100000000);
	const low = t >>> 0;
	buf[0] = (high >>> 24) & 255;
	buf[1] = (high >>> 16) & 255;
	buf[2] = (high >>> 8) & 255;
	buf[3] = high & 255;
	buf[4] = (low >>> 24) & 255;
	buf[5] = (low >>> 16) & 255;
	buf[6] = (low >>> 8) & 255;
	buf[7] = low & 255;

	return `sub_${base58Encode(buf)}`;
}

/**
 * Validates that a string matches the expected subject ID format.
 */
export function isValidSubjectId(id: string): boolean {
	if (!id.startsWith('sub_')) {
		return false;
	}

	const encoded = id.slice(4);

	if (encoded.length === 0) {
		return false;
	}

	for (const char of encoded) {
		if (!BASE58_ALPHABET.includes(char)) {
			return false;
		}
	}

	return true;
}
