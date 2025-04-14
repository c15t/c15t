/**
 * Custom ID generation system for C15T entities
 *
 * Provides prefixed, time-ordered, unique identifiers for all system entities.
 * Each entity type has a specific prefix to make IDs self-descriptive about
 * their origin and purpose.
 */
import baseX from 'base-x';

/**
 * Base-58 encoder for generating short, URL-friendly identifiers
 * Uses a character set that avoids visually ambiguous characters.
 */
const b58 = baseX('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');

/**
 * Generates a unique ID with the specified prefix
 *
 * Creates time-ordered, prefixed, base58-encoded identifiers that:
 * - Start with the provided prefix for clear identification
 * - Embed a timestamp for chronological ordering
 * - Include random data for uniqueness
 *
 * @param prefix - The prefix to use for the ID
 * @returns A unique, prefixed identifier
 *
 * @example
 * ```typescript
 * const subjectId = generateId("sub"); // "sub_3hK4G..."
 * const consentId = generateId("cns"); // "cns_5RtX9..."
 * ```
 */
export function generateId(prefix: string): string {
  const buf = crypto.getRandomValues(new Uint8Array(20));

  /**
   * Epoch starts more recently to extend timestamp lifetime.
   * From 2023-11-14T22:13:20.000Z (1700000000000) to ~2159.
   */
  const EPOCH_TIMESTAMP = 1_700_000_000_000;

  const t = Date.now() - EPOCH_TIMESTAMP;

  // Use 8 bytes for the timestamp (0..7) and shift accordingly:
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

  return `${prefix}_${b58.encode(buf)}`;
}
