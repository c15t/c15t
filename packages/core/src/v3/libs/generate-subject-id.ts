/**
 * Client-side subject ID generation.
 *
 * @remarks
 * Generates time-ordered, base58-encoded identifiers that match the server format:
 * - Prefixed with `sub_` for clear identification
 * - 8 bytes for timestamp (time since epoch 1_700_000_000_000)
 * - 12 bytes of randomness for uniqueness
 * - Base58 encoded for URL-safe, compact representation
 *
 * @packageDocumentation
 */

/**
 * Base58 alphabet (same as server)
 * Excludes 0, O, I, l to avoid ambiguity
 */
const BASE58_ALPHABET =
	'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encodes a Uint8Array to a base58 string.
 *
 * @param bytes - The bytes to encode
 * @returns Base58 encoded string
 *
 * @internal
 */
function base58Encode(bytes: Uint8Array): string {
	const base = BigInt(58);
	let num = BigInt(0);

	// Convert bytes to a big integer
	for (const byte of bytes) {
		num = num * BigInt(256) + BigInt(byte);
	}

	// Convert to base58
	const chars: string[] = [];
	while (num > 0) {
		const remainder = num % base;
		// remainder is always 0-57, so this index is always valid
		chars.unshift(BASE58_ALPHABET.charAt(Number(remainder)));
		num = num / base;
	}

	// Handle leading zeros
	for (const byte of bytes) {
		if (byte === 0) {
			chars.unshift(BASE58_ALPHABET.charAt(0));
		} else {
			break;
		}
	}

	return chars.join('') || BASE58_ALPHABET.charAt(0);
}

/**
 * Custom epoch for timestamp (matches server)
 * November 14, 2023 22:13:20 UTC
 */
const EPOCH_TIMESTAMP = 1_700_000_000_000;

/**
 * Generates a unique subject ID for client-side use.
 *
 * @remarks
 * The ID format matches the server-side generation:
 * - `sub_` prefix
 * - 8 bytes timestamp (milliseconds since custom epoch)
 * - 12 bytes random data
 * - Base58 encoded
 *
 * The timestamp component ensures chronological ordering,
 * while the random component ensures uniqueness even with
 * concurrent generation.
 *
 * @returns A unique subject ID in the format `sub_<base58>`
 *
 * @example
 * ```typescript
 * const subjectId = generateSubjectId();
 * // Returns something like: 'sub_2VZxR7YmNpKq3WfLs8TgHd'
 * ```
 *
 * @public
 */
export function generateSubjectId(): string {
	// Create a 20-byte buffer (8 timestamp + 12 random)
	const buf = crypto.getRandomValues(new Uint8Array(20));

	// Calculate timestamp since custom epoch
	const t = Date.now() - EPOCH_TIMESTAMP;

	// Encode timestamp into first 8 bytes (big-endian)
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
 *
 * @param id - The string to validate
 * @returns True if the string is a valid subject ID format
 *
 * @example
 * ```typescript
 * isValidSubjectId('sub_2VZxR7YmNpKq3WfLs8TgHd'); // true
 * isValidSubjectId('invalid'); // false
 * isValidSubjectId('cns_2VZxR7YmNpKq3WfLs8TgHd'); // false (wrong prefix)
 * ```
 *
 * @public
 */
export function isValidSubjectId(id: string): boolean {
	// Must start with 'sub_'
	if (!id.startsWith('sub_')) {
		return false;
	}

	const encoded = id.slice(4);

	// Must have some content after prefix
	if (encoded.length === 0) {
		return false;
	}

	// All characters must be valid base58
	for (const char of encoded) {
		if (!BASE58_ALPHABET.includes(char)) {
			return false;
		}
	}

	return true;
}
