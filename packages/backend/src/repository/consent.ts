/**
 * Consent writes.
 *
 * Recording a consent has to be idempotent: a client that retries a request,
 * or two requests racing from the same visitor, must produce one record rather
 * than two. On a consent platform a duplicate is not a cosmetic problem — it
 * is a second legal record of the same act.
 *
 * `@c15t/backend` achieves this by reading first and then writing: look up the
 * deterministic primary key, fall back to a lookup on the identity tuple for
 * rows written by older random-id code, attempt the insert, and if it throws,
 * decide whether the error was a unique violation by string-matching adapter
 * error codes (`23505`, `ER_DUP_ENTRY`, `P2002`, `SQLITE_CONSTRAINT…`) and
 * then message substrings as a fallback. That leaves a race window between the
 * read and the write, and it treats "is this a duplicate?" as a question to be
 * answered by parsing prose.
 *
 * Here the database answers it, in one atomic statement: either this call
 * inserted the row or someone already had, and the return value says which. No
 * window, and no error-string sniffing — the error never happens. See
 * `db/insert-once.ts`, which also explains why that statement is spelled
 * differently on MySQL.
 *
 * The legacy identity lookup is kept, because it is not redundant: rows
 * written before deterministic ids existed have unrelated primary keys, and
 * only the identity tuple can find them.
 */

import { buildConsentId, type ConsentSubmissionIdentity } from '@c15t/schema';
import { Data, Effect } from 'effect';
import { SqlClient, type SqlError } from 'effect/unstable/sql';

import { insertOnce } from '../db/insert-once';
import { encoder } from '../db/values';

export interface ConsentSubmission extends ConsentSubmissionIdentity {
	readonly purposeIds: readonly string[];
	readonly metadata?: unknown;
	readonly ipAddress?: string | null;
	readonly userAgent?: string | null;
}

export interface RecordedConsent {
	readonly id: string;
	/**
	 * False when an identical submission was already recorded.
	 *
	 * Surfaced rather than hidden so a caller can tell a fresh consent from a
	 * replay — the audit trail should record one, not both.
	 */
	readonly created: boolean;
}

/**
 * Finds a consent written before deterministic ids existed.
 *
 * Such a row has an unrelated random primary key, so only the identity tuple
 * can match it. This must run whenever the primary-key lookup misses: during a
 * rolling deploy an older process can write a random-id row *after* a newer
 * one has started, so process start time cannot be used to rule it out.
 */
const findLegacySubmission = Effect.fn('consent.findLegacy')(function* (
	identity: ConsentSubmissionIdentity
) {
	const sql = yield* SqlClient.SqlClient;
	// SQLite stores this column as epoch milliseconds and cannot bind a Date.
	const encode = yield* encoder;

	const rows = yield* sql<{ id: string }>`
		select ${sql('id')} from ${sql('consent')}
		where ${sql('subjectId')} = ${identity.subjectId}
			and ${sql('domainId')} = ${identity.domainId}
			and ${sql('givenAt')} = ${encode(identity.givenAt)}
			and ${
				identity.policyId === undefined || identity.policyId === null
					? sql`${sql('policyId')} is null`
					: sql`${sql('policyId')} = ${identity.policyId}`
			}
			and ${
				identity.tenantId === undefined
					? sql`${sql('tenantId')} is null`
					: sql`${sql('tenantId')} = ${identity.tenantId}`
			}
		limit 1
	`;

	return rows[0]?.id;
});

/**
 * Records a consent, exactly once.
 *
 * Safe to call repeatedly with the same submission: the second and subsequent
 * calls return the existing id with `created: false`.
 */
/**
 * A consent whose identity already exists, recorded with different purposes.
 *
 * The deterministic id covers identity and not purposes, by design — it must
 * match `@c15t/backend`'s derivation exactly. That makes this case
 * indistinguishable from a retry at the key level, so it is detected on the
 * stored row instead.
 */
export class ConsentPurposeConflictError extends Data.TaggedError(
	'ConsentPurposeConflictError'
)<{
	readonly message: string;
}> {}

/** Stored `purposeIds`, which SQLite hands back as a JSON string. */
const normalisePurposeIds = (value: unknown): string[] | undefined => {
	const parsed = typeof value === 'string' ? safeParse(value) : value;
	return Array.isArray(parsed) ? [...parsed].map(String).sort() : undefined;
};

const safeParse = (value: string): unknown => {
	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
};

const sameIds = (a: readonly string[], b: readonly string[]): boolean =>
	a.length === b.length && a.every((id, index) => id === b[index]);

/**
 * Fails when a stored consent covers different purposes from the one submitted.
 *
 * Used on both paths that can find an existing row — the pre-insert lookup and
 * a lost insert race — because answering success in either case tells a client
 * its purposes were recorded when the stored record says otherwise.
 */
/**
 * @internal Exported for the tests that cover the lost-race branch, which no
 * engine in the matrix can be made to interleave on demand.
 */
export const assertSamePurposes = Effect.fn('consent.assertSamePurposes')(
	function* (storedRaw: unknown, submitted: readonly string[]) {
		const stored = normalisePurposeIds(storedRaw);
		const incoming = [...submitted].sort();
		if (stored === undefined || sameIds(stored, incoming)) {
			return;
		}
		return yield* new ConsentPurposeConflictError({
			message:
				`A consent with this identity was already recorded with different ` +
				`purposes (stored: [${stored.join(', ')}], submitted: ` +
				`[${incoming.join(', ')}]). Withdraw or supersede it rather than ` +
				'resubmitting the same act with a different scope.',
		});
	}
);

export const record = Effect.fn('consent.record')(function* (
	submission: ConsentSubmission
): Generator<
	Effect.Effect<
		unknown,
		SqlError.SqlError | ConsentPurposeConflictError,
		SqlClient.SqlClient
	>,
	RecordedConsent
> {
	const sql = yield* SqlClient.SqlClient;
	const id = yield* Effect.promise(() => buildConsentId(submission));

	// Primary-key lookup first. A retry — a client retrying, or a visitor
	// double-clicking — is the common case in production, and this answers it
	// in one indexed query. Measured: skipping this short-circuit and going
	// straight to the legacy lookup made retries about twice as slow.
	const existing = yield* sql<{ id: string; purposeIds: unknown }>`
		select ${sql('id')}, ${sql('purposeIds')} from ${sql('consent')}
		where ${sql('id')} = ${id}
	`;
	if (existing.length > 0) {
		// The id covers identity — tenant, subject, domain, policy, givenAt — and
		// deliberately not the purposes, because it has to stay byte-identical to
		// the one `@c15t/backend` derives. So a resubmission carrying *different*
		// purposes lands here looking exactly like a retry, and returning
		// `created: false` would answer 200 while silently keeping the original
		// set. On a consent platform that means the record says a subject agreed
		// to something other than what they submitted.
		//
		// Reported rather than folded in. Overwriting would rewrite a legal record
		// in place with no audit entry, and changing the id to cover purposes
		// would break the parity the derivation exists to preserve.
		yield* assertSamePurposes(existing[0]?.purposeIds, submission.purposeIds);
		return { id, created: false };
	}

	// Only now check for a row written by an older process. It has a random
	// primary key, so the conflict target below cannot see it — but this costs
	// a query, so it must not run on the hot retry path above.
	const legacyId = yield* findLegacySubmission(submission);
	if (legacyId !== undefined) {
		return { id: legacyId, created: false };
	}

	// `created: false` here means the conflict target matched — someone else
	// wrote this exact submission, possibly concurrently. That is success, not
	// failure, and it is the whole reason this is one statement.
	const created = yield* insertOnce({
		into: 'consent',
		conflictOn: 'id',
		values: {
			id,
			subjectId: submission.subjectId,
			domainId: submission.domainId,
			policyId: submission.policyId ?? null,
			purposeIds: JSON.stringify(submission.purposeIds),
			metadata:
				submission.metadata === undefined
					? null
					: JSON.stringify(submission.metadata),
			ipAddress: submission.ipAddress ?? null,
			userAgent: submission.userAgent ?? null,
			givenAt: submission.givenAt,
			tenantId: submission.tenantId ?? null,
		},
	});

	if (created) {
		return { id, created };
	}

	// Lost the conflict, which the read above did not see: two submissions with
	// the same identity and *different* purposes can both pass that check while
	// neither row exists yet, and the loser would then be told its purposes were
	// accepted while the winner's are what is stored. Rare, and precisely the
	// case a deterministic key makes possible, so it is checked rather than
	// reasoned about.
	const winner = yield* sql<{ purposeIds: unknown }>`
		select ${sql('purposeIds')} from ${sql('consent')} where ${sql('id')} = ${id}
	`;
	yield* assertSamePurposes(winner[0]?.purposeIds, submission.purposeIds);

	return { id, created };
});
