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
 * Encodes the 20-byte subject buffer to a base58 string.
 *
 * @param bytes - The 20 bytes to encode
 * @param view - Big-endian view of the same buffer
 * @returns Base58 encoded string
 *
 * @internal
 */
const base58Encode = function base58Encode(
	bytes: Uint8Array,
	view: DataView
): string {
	let num = BigInt(0);
	// The subject buffer is exactly five big-endian 32-bit words.
	for (let offset = 0; offset < bytes.length; offset += 4) {
		num = num * BigInt(2 ** 32) + BigInt(view.getUint32(offset, false));
	}

	// Five base58 digits fit exactly in a Number. Divide the wide integer
	// once per group, then extract those digits with ordinary arithmetic.
	const groupBase = BigInt(58 ** 5);
	let encoded = '';
	while (num > BigInt(0)) {
		let group = Number(num % groupBase);
		num /= groupBase;
		let digits = '';
		for (let index = 0; index < 5; index += 1) {
			digits = BASE58_ALPHABET.charAt(group % 58) + digits;
			group = Math.floor(group / 58);
			if (num === BigInt(0) && group === 0) {
				break;
			}
		}
		encoded = digits + encoded;
	}

	for (const byte of bytes) {
		if (byte !== 0) {
			break;
		}
		encoded = BASE58_ALPHABET.charAt(0) + encoded;
	}
	return encoded || BASE58_ALPHABET.charAt(0);
};

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
export const generateSubjectId = function generateSubjectId(): string {
	// Create a 20-byte buffer (8 timestamp + 12 random)
	const buf = crypto.getRandomValues(new Uint8Array(20));

	// Calculate timestamp since custom epoch
	const t = Date.now() - EPOCH_TIMESTAMP;

	const view = new DataView(buf.buffer);
	view.setUint32(0, Math.floor(t / 2 ** 32), false);
	view.setUint32(4, t % 2 ** 32, false);

	return `sub_${base58Encode(buf, view)}`;
};

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
export const isValidSubjectId = function isValidSubjectId(id: string): boolean {
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
};
