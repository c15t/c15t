import { hashSha256Hex } from '@c15t/schema/types';
import baseX from 'base-x';
import type { InferFumaDB } from 'fumadb';
import type { LatestDB } from '~/db/schema';
import type { C15TContext } from '~/types';

type Tables = InferFumaDB<typeof LatestDB>['schemas'][-1]['tables'];

const prefixes: Record<keyof Tables, string> = {
	auditLog: 'log',
	consent: 'cns',
	consentPolicy: 'pol',
	consentPurpose: 'pur',
	domain: 'dom',
	runtimePolicyDecision: 'rpd',
	subject: 'sub',
	writeReplay: 'wrp',
} as const;

const b58 = baseX('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');

const EPOCH_TIMESTAMP = 1_700_000_000_000;

/** Total ID payload size: 8 timestamp bytes + 12 discriminator bytes. */
const ID_BYTE_LENGTH = 20;
const TIMESTAMP_BYTE_LENGTH = 8;

/**
 * Writes `timestamp` into the first 8 bytes of `buf` as a big-endian offset
 * from {@link EPOCH_TIMESTAMP}. For timestamps at or after the epoch,
 * lexicographic ID order matches chronological order.
 *
 * Timestamps before the epoch (or non-finite ones) share a zero timestamp
 * prefix; the remaining bytes still keep such IDs distinct, but those IDs are
 * not chronologically ordered relative to each other.
 */
function writeTimestamp(buf: Uint8Array, timestamp: number): void {
	const offset = timestamp - EPOCH_TIMESTAMP;
	const t = Number.isFinite(offset) ? Math.max(0, offset) : 0;

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
}

/**
 * Creates time-ordered, prefixed, base58-encoded identifiers that:
 * - Start with the provided prefix for clear identification
 * - Embed a timestamp for chronological ordering
 * - Include random data for uniqueness
 */
function generateId(model: keyof typeof prefixes): string {
	const buf = crypto.getRandomValues(new Uint8Array(ID_BYTE_LENGTH));

	writeTimestamp(buf, Date.now());

	return `${prefixes[model]}_${b58.encode(buf)}`;
}

/**
 * Builds an ID that is fully determined by `identity`, in the same shape as
 * {@link generateId}: the timestamp prefix preserves chronological order for
 * timestamps at or after {@link EPOCH_TIMESTAMP}, and a 96-bit SHA-256 digest
 * of `identity` replaces the random tail.
 *
 * Because the ID is the table's primary key, two concurrent requests carrying
 * the same identity derive the same ID and the database rejects the second
 * insert.
 *
 * `identity` must include every field that distinguishes one row from another —
 * the tenant included, since the primary key is global rather than per-tenant.
 * Values are JSON-encoded rather than concatenated, so a `null` field is never
 * mistaken for the string `"null"` and values containing separators cannot be
 * re-partitioned into a different identity.
 *
 * @param model - Table the ID belongs to, used for the prefix
 * @param timestamp - Epoch milliseconds embedded for chronological ordering
 * @param identity - Field values that uniquely identify the row
 * @returns A prefixed base58 ID, stable for a given `model`/`timestamp`/`identity`
 *
 * @example
 * ```ts
 * const id = await generateDeterministicId('consent', givenAt.getTime(), [
 *   tenantId ?? null,
 *   subjectId,
 *   domainId,
 * ]);
 * ```
 */
export async function generateDeterministicId(
	model: keyof typeof prefixes,
	timestamp: number,
	identity: readonly (string | null)[]
): Promise<string> {
	const digest = await hashSha256Hex(JSON.stringify(identity));
	const buf = new Uint8Array(ID_BYTE_LENGTH);

	writeTimestamp(buf, timestamp);

	for (let i = TIMESTAMP_BYTE_LENGTH; i < ID_BYTE_LENGTH; i++) {
		const offset = (i - TIMESTAMP_BYTE_LENGTH) * 2;
		buf[i] = Number.parseInt(digest.slice(offset, offset + 2), 16);
	}

	return `${prefixes[model]}_${b58.encode(buf)}`;
}

/**
 * Generates a unique ID for the specified model with conflict handling
 *
 * @param db - Database ORM instance
 * @param model - The model/table name to generate ID for
 * @param ctx - Application context containing logger (optional)
 * @param options - Configuration options for ID generation
 * @returns Promise resolving to a unique ID
 *
 * @throws {Error} When max retry attempts are exceeded
 */
export async function generateUniqueId(
	db: ReturnType<InferFumaDB<typeof LatestDB>['orm']>,
	model: keyof Tables,
	ctx?: Partial<C15TContext> | undefined,
	options: {
		/** Maximum number of retry attempts (default: 10) */
		maxRetries?: number;
		/** Current retry attempt (used internally) */
		attempt?: number;
		/** Base delay for exponential backoff in ms (default: 5) */
		baseDelay?: number;
	} = {}
): Promise<string> {
	const { maxRetries = 10, attempt = 0, baseDelay = 5 } = options;

	// Check if we've exceeded the maximum retry attempts
	if (attempt >= maxRetries) {
		const error = new Error(
			`Failed to generate unique ID for ${model} after ${maxRetries} attempts`
		);
		ctx?.logger?.error?.('ID generation failed', { model, maxRetries });
		throw error;
	}

	const id = generateId(model);

	try {
		const existing = await db.findFirst(model, {
			where: (b) => b('id', '=', id),
		});

		if (existing) {
			ctx?.logger?.debug?.('ID conflict detected', {
				id,
				model,
				attempt: attempt + 1,
				maxRetries,
			});

			// Implement exponential backoff
			const delay = Math.min(baseDelay * 2 ** attempt, 1000);

			// Wait before retrying to reduce contention in high-volume scenarios
			await new Promise((resolve) => setTimeout(resolve, delay));

			return generateUniqueId(db, model, ctx, {
				maxRetries,
				attempt: attempt + 1,
				baseDelay,
			});
		}

		return id;
	} catch (error) {
		ctx?.logger?.error?.('Error checking ID uniqueness', {
			error: (error as Error).message,
			model,
			attempt,
		});

		// If database error occurs, retry with backoff
		if (attempt < maxRetries - 1) {
			const delay = Math.min(baseDelay * 2 ** attempt, 2000);
			await new Promise((resolve) => setTimeout(resolve, delay));

			return generateUniqueId(db, model, ctx, {
				maxRetries,
				attempt: attempt + 1,
				baseDelay,
			});
		}

		throw error;
	}
}
