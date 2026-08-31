/**
 * Consent write benchmark: the shipped read-then-write against `ON CONFLICT`.
 *
 * Two things are being measured, and the second matters more than the first.
 *
 * **Cost per write.** The shipped path issues a primary-key lookup, then a
 * legacy identity lookup when that misses, then the insert — three statements
 * for a new consent. The rewrite issues the legacy lookup and one
 * `insert … on conflict`, so two.
 *
 * **Cost of a retry.** A duplicate submission is the common case in
 * production: clients retry, and a visitor double-clicking sends the same
 * consent twice. The shipped path pays a full lookup round trip to discover
 * the row exists; the rewrite discovers it in the same statement that would
 * have written it.
 *
 * Both arms run against the same database with the same schema, so the only
 * variable is how the write is expressed.
 */

import { buildConsentId } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

export interface WriteResult {
	readonly created: boolean;
	readonly queries: number;
}

interface Submission {
	readonly subjectId: string;
	readonly domainId: string;
	readonly policyId: string | null;
	readonly givenAt: Date;
}

/**
 * The shipped shape: look up by primary key, fall back to the identity tuple,
 * then insert and hope nobody raced you.
 */
export const readThenWrite = Effect.fn('write.readThenWrite')(
	function* readThenWrite(submission: Submission) {
		const sql = yield* SqlClient.SqlClient;
		const id = yield* Effect.promise(() => buildConsentId(submission));
		let queries = 0;

		const byId = yield* sql<{ id: string }>`
		select "id" from "consent" where "id" = ${id}
	`;
		queries += 1;
		if (byId.length > 0) {
			return { created: false, queries } satisfies WriteResult;
		}

		const byIdentity = yield* sql<{ id: string }>`
		select "id" from "consent"
		where "subjectId" = ${submission.subjectId}
			and "domainId" = ${submission.domainId}
			and "givenAt" = ${submission.givenAt}
		limit 1
	`;
		queries += 1;
		if (byIdentity.length > 0) {
			return { created: false, queries } satisfies WriteResult;
		}

		yield* sql`
		insert into "consent"
			("id","subjectId","domainId","policyId","purposeIds","givenAt")
		values (${id}, ${submission.subjectId}, ${submission.domainId},
			${submission.policyId}, ${'[]'}, ${submission.givenAt})
	`;
		queries += 1;

		return { created: true, queries } satisfies WriteResult;
	}
);

/**
 * The rewrite: primary-key short-circuit, legacy lookup, then atomic insert.
 *
 * The short-circuit is not an optimisation bolted on — without it this arm
 * measured about twice the retry cost of the shipped path, because it paid for
 * the legacy lookup on every duplicate.
 */
export const onConflict = Effect.fn('write.onConflict')(function* onConflict(
	submission: Submission
) {
	const sql = yield* SqlClient.SqlClient;
	const id = yield* Effect.promise(() => buildConsentId(submission));
	let queries = 0;

	const byId = yield* sql<{ id: string }>`
		select "id" from "consent" where "id" = ${id}
	`;
	queries += 1;
	if (byId.length > 0) {
		return { created: false, queries } satisfies WriteResult;
	}

	const byIdentity = yield* sql<{ id: string }>`
		select "id" from "consent"
		where "subjectId" = ${submission.subjectId}
			and "domainId" = ${submission.domainId}
			and "givenAt" = ${submission.givenAt}
			and "id" <> ${id}
		limit 1
	`;
	queries += 1;
	if (byIdentity.length > 0) {
		return { created: false, queries } satisfies WriteResult;
	}

	const inserted = yield* sql<{ id: string }>`
		insert into "consent"
			("id","subjectId","domainId","policyId","purposeIds","givenAt")
		values (${id}, ${submission.subjectId}, ${submission.domainId},
			${submission.policyId}, ${'[]'}, ${submission.givenAt})
		on conflict ("id") do nothing
		returning "id"
	`;
	queries += 1;

	return { created: inserted.length > 0, queries } satisfies WriteResult;
});
