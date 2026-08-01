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
 * Here the database answers it. `insert … on conflict do nothing returning *`
 * is atomic: either this call inserted the row or someone already had, and the
 * return value says which. No window, and no error-string sniffing — the error
 * never happens.
 *
 * The legacy identity lookup is kept, because it is not redundant: rows
 * written before deterministic ids existed have unrelated primary keys, and
 * only the identity tuple can find them.
 */

import { buildConsentId, type ConsentSubmissionIdentity } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient, SqlError } from 'effect/unstable/sql';

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

	const rows = yield* sql<{ id: string }>`
		select "id" from "consent"
		where "subjectId" = ${identity.subjectId}
			and "domainId" = ${identity.domainId}
			and "givenAt" = ${identity.givenAt}
			and ${
				identity.policyId === undefined || identity.policyId === null
					? sql`"policyId" is null`
					: sql`"policyId" = ${identity.policyId}`
			}
			and ${
				identity.tenantId === undefined
					? sql`"tenantId" is null`
					: sql`"tenantId" = ${identity.tenantId}`
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
export const record = Effect.fn('consent.record')(function* (
	submission: ConsentSubmission
): Generator<
	Effect.Effect<unknown, SqlError.SqlError, SqlClient.SqlClient>,
	RecordedConsent
> {
	const sql = yield* SqlClient.SqlClient;
	const id = yield* Effect.promise(() => buildConsentId(submission));

	// A row written by an older process has a random primary key, so the
	// conflict target below cannot see it. Check for it first.
	const legacyId = yield* findLegacySubmission(submission);
	if (legacyId !== undefined) {
		return { id: legacyId, created: false };
	}

	const inserted = yield* sql<{ id: string }>`
		insert into "consent" (
			"id", "subjectId", "domainId", "policyId", "purposeIds",
			"metadata", "ipAddress", "userAgent", "givenAt", "tenantId"
		) values (
			${id},
			${submission.subjectId},
			${submission.domainId},
			${submission.policyId ?? null},
			${JSON.stringify(submission.purposeIds)},
			${submission.metadata === undefined ? null : JSON.stringify(submission.metadata)},
			${submission.ipAddress ?? null},
			${submission.userAgent ?? null},
			${submission.givenAt},
			${submission.tenantId ?? null}
		)
		on conflict ("id") do nothing
		returning "id"
	`;

	// An empty result means the conflict target matched — someone else wrote
	// this exact submission, possibly concurrently. That is success, not
	// failure, and it is the whole reason this is one statement.
	return inserted.length > 0 ? { id, created: true } : { id, created: false };
});
