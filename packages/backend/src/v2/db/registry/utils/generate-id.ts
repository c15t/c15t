import baseX from 'base-x';
import type { InferFumaDB } from 'fumadb';
import type { DB } from '~/v2/db/schema';
import type { C15TContext } from '~/v2/types';

type Tables = InferFumaDB<typeof DB>['schemas'][-1]['tables'];

const prefixes: Record<keyof Tables, string> = {
	auditLog: 'log',
	consent: 'cns',
	consentPolicy: 'pol',
	consentPurpose: 'pur',
	consentRecord: 'rec',
	domain: 'dom',
	subject: 'sub',
} as const;

const b58 = baseX('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');

/**
 * Creates time-ordered, prefixed, base58-encoded identifiers that:
 * - Start with the provided prefix for clear identification
 * - Embed a timestamp for chronological ordering
 * - Include random data for uniqueness
 */
function generateId(model: keyof typeof prefixes): string {
	const buf = crypto.getRandomValues(new Uint8Array(20));
	const prefix = prefixes[model];

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
	db: ReturnType<InferFumaDB<typeof DB>['orm']>,
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
