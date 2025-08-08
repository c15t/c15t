import baseX from 'base-x';
import type { InferFumaDB } from 'fumadb';
import type { DB } from '~/v2/schema';

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

export async function generateUniqueId(
	db: InferFumaDB<typeof DB>['abstract'],
	model: keyof Tables
): Promise<string> {
	const id = generateId(model);

	const subject = await db.findFirst(model, {
		where: (b) => b('id', '=', id),
	});

	if (subject) {
		return generateUniqueId(db, model);
	}

	return id;
}
