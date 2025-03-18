/**
 * Custom ID generation system for C15T entities
 *
 * Provides prefixed, time-ordered, unique identifiers for all system entities.
 * Each entity type has a specific prefix to make IDs self-descriptive about
 * their origin and purpose.
 *
 * @module id-generator
 */
import baseX from 'base-x';

/**
 * Base-58 encoder for generating short, URL-friendly identifiers
 * Uses a character set that avoids visually ambiguous characters.
 */
const b58 = baseX('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');

/**
 * Epoch timestamp starting point for ID generation (2023-11-14T22:13:20.000Z)
 * Using a recent epoch extends the timestamp lifetime to ~2159
 */
const EPOCH_TIMESTAMP = 1_700_000_000_000;

/**
 * Size of the random buffer used for ID generation
 */
const RANDOM_BUFFER_SIZE = 20;

/**
 * Generates a unique ID with the specified prefix
 *
 * Creates time-ordered, prefixed, base58-encoded identifiers that:
 * - Start with the provided prefix for clear identification
 * - Embed a timestamp for chronological ordering
 * - Include random data for uniqueness
 *
 * The format is: `${prefix}_${base58EncodedTimestampAndRandomness}`
 *
 * @param prefix - The prefix to use for the ID (typically 3 characters)
 * @returns A unique, prefixed identifier string
 *
 * @throws {TypeError} If prefix is not a string
 * @throws {Error} If crypto.getRandomValues is not available in the environment
 *
 * @example
 * ```typescript
 * // Generate a subject ID
 * const subjectId = generateId("sub"); // "sub_3hK4G..."
 *
 * // Generate a consent ID
 * const consentId = generateId("cns"); // "cns_5RtX9..."
 *
 * // Use in a database model
 * const newUser = {
 *   id: generateId("usr"),
 *   name: "Alice Smith",
 *   email: "alice@example.com"
 * };
 * ```
 */
export function generateId(prefix: string): string {
	if (typeof prefix !== 'string') {
		throw new TypeError('Prefix must be a string');
	}

	if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
		throw new Error('crypto.getRandomValues is required but not available');
	}

	// Create a buffer for the ID data
	const buf = crypto.getRandomValues(new Uint8Array(RANDOM_BUFFER_SIZE));

	// Get current time offset from our epoch
	const t = Date.now() - EPOCH_TIMESTAMP;

	// Split the timestamp into high and low 32-bit parts
	const high = Math.floor(t / 0x100000000);
	const low = t >>> 0;

	// Insert the timestamp into the first 8 bytes of the buffer
	buf[0] = (high >>> 24) & 0xff;
	buf[1] = (high >>> 16) & 0xff;
	buf[2] = (high >>> 8) & 0xff;
	buf[3] = high & 0xff;
	buf[4] = (low >>> 24) & 0xff;
	buf[5] = (low >>> 16) & 0xff;
	buf[6] = (low >>> 8) & 0xff;
	buf[7] = low & 0xff;

	// Encode the buffer and return with prefix
	return `${prefix}_${b58.encode(buf)}`;
}
