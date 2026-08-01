/**
 * The two query patterns under comparison, expressed against the same client
 * so the only variable is the pattern itself.
 *
 * The old arm is a faithful reproduction of `list.handler.ts` and
 * `consent-enrichment.ts` — same chunk size, same sequential loops — rather
 * than a call into `@c15t/backend`. That is deliberate and worth being precise
 * about: it isolates the *query pattern* and removes fumadb's own JavaScript
 * overhead as a confound. It therefore measures the floor of the old design,
 * not the shipped package. A separate arm calling the real package would
 * capture ORM overhead on top, and would only make the comparison more
 * favourable to the rewrite; this way the number is defensible.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

/** `list.handler.ts:13`. Reproduced exactly. */
const SUBJECT_ID_BATCH_SIZE = 500;

export interface ArmResult {
	readonly subjects: number;
	readonly consents: number;
	/** Statements issued. The metric latency alone hides on a warm database. */
	readonly queries: number;
}

/**
 * The shipped pattern: one query for subjects, a sequential chunk per 500
 * subject ids for their consents, then one sequential query per distinct
 * policy type.
 */
export const chunkedFanout = Effect.fn('arm.chunkedFanout')(function* (
	externalId: string
) {
	const sql = yield* SqlClient.SqlClient;
	let queries = 0;

	const subjects = yield* sql<{ id: string }>`
		select "id" from "subject" where "externalId" = ${externalId}
	`;
	queries += 1;

	const ids = subjects.map((row) => row.id);
	const consents: Array<{ id: string; policyId: string | null }> = [];

	for (let index = 0; index < ids.length; index += SUBJECT_ID_BATCH_SIZE) {
		const batch = ids.slice(index, index + SUBJECT_ID_BATCH_SIZE);
		if (batch.length === 0) break;
		const rows = yield* sql<{ id: string; policyId: string | null }>`
			select "id", "policyId" from "consent"
			where "subjectId" in ${sql.in(batch)}
		`;
		queries += 1;
		consents.push(...rows);
	}

	// consent-enrichment.ts resolves the latest policy per type in a loop, one
	// query per type, sequentially.
	const policyIds = [
		...new Set(consents.map((row) => row.policyId).filter(Boolean)),
	] as string[];

	const types = new Set<string>();
	if (policyIds.length > 0) {
		const rows = yield* sql<{ type: string }>`
			select distinct "type" from "consentPolicy" where "id" in ${sql.in(policyIds)}
		`;
		queries += 1;
		for (const row of rows) types.add(row.type);
	}

	for (const type of types) {
		yield* sql<{ id: string }>`
			select "id" from "consentPolicy"
			where "isActive" = ${true} and "type" = ${type}
			order by "effectiveDate" desc
			limit 1
		`;
		queries += 1;
	}

	return {
		subjects: subjects.length,
		consents: consents.length,
		queries,
	} satisfies ArmResult;
});

/**
 * The rewrite: subjects left-joined to consents, plus one ranked query for the
 * latest active policy per type. Two statements, whatever the data.
 */
export const joined = Effect.fn('arm.joined')(function* (externalId: string) {
	const sql = yield* SqlClient.SqlClient;

	const rows = yield* sql<{ subject_id: string; consent_id: string | null }>`
		select s."id" as "subject_id", c."id" as "consent_id"
		from "subject" s
		left join "consent" c on c."subjectId" = s."id"
		where s."externalId" = ${externalId}
	`;

	yield* sql<{ id: string; type: string }>`
		select "id", "type" from (
			select "id", "type",
				row_number() over (partition by "type" order by "effectiveDate" desc) as rn
			from "consentPolicy" where "isActive" = ${true}
		) ranked where rn = 1
	`;

	return {
		subjects: new Set(rows.map((row) => row.subject_id)).size,
		consents: rows.filter((row) => row.consent_id !== null).length,
		queries: 2,
	} satisfies ArmResult;
});
