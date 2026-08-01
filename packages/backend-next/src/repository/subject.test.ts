/**
 * The read path's correctness, and the property that motivates it: the number
 * of queries does not grow with the data.
 */

import { PgliteClient } from '@effect/sql-pglite';
import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { up as baseline } from '../db/migrations/1-baseline';
import { up as indexes } from '../db/migrations/2-hot-path-indexes';
import {
	countByExternalId,
	latestPolicyIdByType,
	listByExternalId,
} from './subject';

const Pglite = PgliteClient.layer({});

const migrate = Effect.gen(function* () {
	yield* baseline;
	yield* indexes;
});

/**
 * Seeds `subjects` subjects sharing one external id, each with one consent,
 * spread across `policyTypes` distinct policy types.
 *
 * Both dimensions are the ones the old implementation scaled queries on: it
 * issued a chunk per hundred subjects and one query per policy type.
 */
const seed = Effect.fn('seed')(function* (
	externalId: string,
	subjects: number,
	policyTypes: number
) {
	const sql = yield* SqlClient.SqlClient;

	// Ids are namespaced by externalId so a test can seed more than once.
	const ns = externalId;
	yield* sql.unsafe(`insert into "domain" ("id", "name", "createdAt", "updatedAt")
		values ('dom_${ns}', 'example.com', now(), now())`);

	for (let type = 0; type < policyTypes; type++) {
		// Two versions per type, so "latest active policy per type" has
		// something to actually choose between.
		for (const [index, age] of [0, 1].entries()) {
			yield* sql.unsafe(`insert into "consentPolicy"
				("id", "version", "type", "effectiveDate", "isActive", "createdAt")
				values ('pol_${ns}_${type}_${index}', '1.${index}', 'type_${ns}_${type}',
					now() - interval '${age} day', true, now())`);
		}
	}

	for (let subject = 0; subject < subjects; subject++) {
		yield* sql.unsafe(`insert into "subject"
			("id", "externalId", "createdAt", "updatedAt")
			values ('sub_${ns}_${subject}', '${externalId}', now(), now())`);
		const type = subject % policyTypes;
		yield* sql.unsafe(`insert into "consent"
			("id", "subjectId", "domainId", "policyId", "purposeIds", "givenAt")
			values ('cns_${ns}_${subject}', 'sub_${ns}_${subject}', 'dom_${ns}', 'pol_${ns}_${type}_0', '[]', now())`);
	}
});

describe('subject repository', () => {
	it.effect(
		'returns each subject with its consents',
		() =>
			Effect.gen(function* () {
				yield* migrate;
				yield* seed('ext_1', 3, 2);

				const subjects = yield* listByExternalId('ext_1');

				assert.strictEqual(subjects.length, 3);
				assert.deepStrictEqual(
					subjects.map((subject) => subject.consents.length),
					[1, 1, 1]
				);
				assert.strictEqual(subjects[0]?.externalId, 'ext_1');
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'includes a subject that has no consents at all',
		() =>
			Effect.gen(function* () {
				yield* migrate;
				const sql = yield* SqlClient.SqlClient;
				yield* sql.unsafe(`insert into "subject"
					("id", "externalId", "createdAt", "updatedAt")
					values ('sub_lonely', 'ext_1', now(), now())`);

				const subjects = yield* listByExternalId('ext_1');

				// The left join produces an all-null consent row here. Treating
				// that as a consent record would invent one out of nothing.
				assert.strictEqual(subjects.length, 1);
				assert.deepStrictEqual(subjects[0]?.consents, []);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'marks consents against the newest active policy of their type',
		() =>
			Effect.gen(function* () {
				yield* migrate;
				const sql = yield* SqlClient.SqlClient;
				yield* sql.unsafe(`insert into "domain" ("id", "name", "createdAt", "updatedAt")
					values ('dom_1', 'example.com', now(), now())`);
				yield* sql.unsafe(`insert into "consentPolicy"
					("id", "version", "type", "effectiveDate", "isActive", "createdAt")
					values ('pol_old', '1.0', 'cookie', now() - interval '10 day', true, now())`);
				yield* sql.unsafe(`insert into "consentPolicy"
					("id", "version", "type", "effectiveDate", "isActive", "createdAt")
					values ('pol_new', '2.0', 'cookie', now(), true, now())`);
				yield* sql.unsafe(`insert into "subject"
					("id", "externalId", "createdAt", "updatedAt")
					values ('sub_1', 'ext_1', now(), now())`);
				yield* sql.unsafe(`insert into "consent"
					("id", "subjectId", "domainId", "policyId", "purposeIds", "givenAt")
					values ('cns_old', 'sub_1', 'dom_1', 'pol_old', '[]', now())`);
				yield* sql.unsafe(`insert into "consent"
					("id", "subjectId", "domainId", "policyId", "purposeIds", "givenAt")
					values ('cns_new', 'sub_1', 'dom_1', 'pol_new', '[]', now())`);

				const subjects = yield* listByExternalId('ext_1');
				const byId = new Map(
					subjects[0]?.consents.map((consent) => [consent.id, consent])
				);

				assert.isTrue(byId.get('cns_new')?.isLatestPolicy);
				assert.isFalse(byId.get('cns_old')?.isLatestPolicy);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'ignores inactive policies when deciding what is latest',
		() =>
			Effect.gen(function* () {
				yield* migrate;
				const sql = yield* SqlClient.SqlClient;
				yield* sql.unsafe(`insert into "consentPolicy"
					("id", "version", "type", "effectiveDate", "isActive", "createdAt")
					values ('pol_live', '1.0', 'cookie', now() - interval '10 day', true, now())`);
				yield* sql.unsafe(`insert into "consentPolicy"
					("id", "version", "type", "effectiveDate", "isActive", "createdAt")
					values ('pol_draft', '2.0', 'cookie', now(), false, now())`);

				const latest = yield* latestPolicyIdByType();
				assert.strictEqual(latest.get('cookie'), 'pol_live');
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'costs the same number of queries at 1 subject as at 250',
		() =>
			Effect.gen(function* () {
				yield* migrate;
				const sql = yield* SqlClient.SqlClient;

				// pg_stat_statements is unavailable in PGlite, so count actual
				// executions against the tables of interest instead.
				const executions = Effect.fn('executions')(function* () {
					const rows = yield* sql<{ total: string }>`
						select coalesce(sum(seq_scan + idx_scan), 0) as total
						from pg_stat_user_tables
						where relname in ('subject', 'consent', 'consentPolicy')
					`;
					return Number(rows[0]?.total ?? 0);
				});

				yield* seed('ext_small', 1, 1);
				const beforeSmall = yield* executions();
				yield* listByExternalId('ext_small');
				const smallCost = (yield* executions()) - beforeSmall;

				// 250 subjects across 5 policy types. Under the old
				// implementation this was 1 + ceil(250/100) + 5 = 9 sequential
				// round trips; the point is that this number does not move.
				yield* seed('ext_large', 250, 5);
				const beforeLarge = yield* executions();
				yield* listByExternalId('ext_large');
				const largeCost = (yield* executions()) - beforeLarge;

				assert.strictEqual(
					largeCost,
					smallCost,
					`scan count grew with the data: ${smallCost} -> ${largeCost}`
				);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 120_000 }
	);

	it.effect(
		'counts every matching subject, not just the page',
		() =>
			Effect.gen(function* () {
				yield* migrate;
				yield* seed('ext_1', 7, 2);

				// list.handler.ts reports `count: subjectItems.length`, which is
				// the page length rather than a total.
				assert.strictEqual(yield* countByExternalId('ext_1'), 7);
				assert.strictEqual(yield* countByExternalId('ext_absent'), 0);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);
});
