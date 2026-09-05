/**
 * The read path's correctness, and the property that motivates it: the number
 * of queries does not grow with the data.
 */

import { PgliteClient } from '@effect/sql-pglite';
import { assert, describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { up as baseline } from '../db/migrations/1-baseline';
import { up as indexes } from '../db/migrations/2-hot-path-indexes';
import { up as receipts } from '../db/migrations/3-consent-receipts-and-privacy-directives';
import { singleTenant } from '../db/tenant';
import {
	countByExternalId,
	latestPolicyIdByType,
	listByExternalId,
} from './subject';

// Tests run single-tenant unless a case says otherwise; the scope is a
// service, so a query cannot run without one.
const Pglite = Layer.merge(PgliteClient.layer({}), singleTenant);

const migrate = Effect.gen(function* migrate() {
	yield* baseline;
	yield* receipts;
	yield* indexes;
});

/**
 * Seeds `subjects` subjects sharing one external id, each with one consent,
 * spread across `policyTypes` distinct policy types.
 *
 * Both dimensions are the ones the old implementation scaled queries on: it
 * issued a chunk per hundred subjects and one query per policy type.
 */
const seed = Effect.fn('seed')(function* seed(
	externalId: string,
	subjects: number,
	policyTypes: number
) {
	const sql = yield* SqlClient.SqlClient;

	// Ids are namespaced by externalId so a test can seed more than once.
	const ns = externalId;
	yield* sql.unsafe(`insert into "domain" ("id", "name", "createdAt", "updatedAt")
		values ('dom_${ns}', 'example.com', now(), now())`);

	for (let type = 0; type < policyTypes; type += 1) {
		// Two versions per type, so "latest active policy per type" has
		// something to actually choose between.
		for (const [index, age] of [0, 1].entries()) {
			yield* sql.unsafe(`insert into "consentPolicy"
				("id", "version", "type", "effectiveDate", "isActive", "createdAt")
				values ('pol_${ns}_${type}_${index}', '1.${index}', 'type_${ns}_${type}',
					now() - interval '${age} day', true, now())`);
		}
	}

	for (let subject = 0; subject < subjects; subject += 1) {
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
			Effect.gen(function* gen() {
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
			Effect.gen(function* gen() {
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
			Effect.gen(function* gen() {
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
			Effect.gen(function* gen() {
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
		'issues the same number of queries at 1 subject as at 250',
		() =>
			Effect.gen(function* gen() {
				yield* migrate;
				const sql = yield* SqlClient.SqlClient;

				// Round trips, not scans.
				//
				// This counted `seq_scan + idx_scan` from pg_stat_user_tables and
				// was wrong twice over. Postgres flushes those counters on its own
				// schedule, so a read taken straight afterwards often missed the
				// scans it was meant to count — which is why it passed at all, and
				// why it failed about one run in ten under load. Forcing a flush
				// makes it deterministic, and reveals the second problem: the
				// counts genuinely do grow, 4 against 502 at 250 subjects, because
				// the planner runs the join as a nested loop and scans the inner
				// side once per row.
				//
				// That is not the claim being made. One statement that scans a lot
				// is still one round trip, and round trips are what cost on a
				// networked database — the shipped backend's problem is nine of
				// them, not nine scans. `xact_commit` counts statements, each of
				// which runs in its own implicit transaction.
				const statements = Effect.fn('statements')(function* statements() {
					yield* sql`select pg_stat_force_next_flush()`;
					const rows = yield* sql<{ n: string }>`
						select xact_commit as n from pg_stat_database
						where datname = current_database()
					`;
					return Number(rows[0]?.n ?? 0);
				});

				// Measuring costs two statements of its own; subtract them.
				const first = yield* statements();
				const overhead = (yield* statements()) - first;

				yield* seed('ext_small', 1, 1);
				const beforeSmall = yield* statements();
				yield* listByExternalId('ext_small');
				const smallCost = (yield* statements()) - beforeSmall - overhead;

				// 250 subjects across 5 policy types. The shipped implementation
				// needs 1 + ceil(250/100) + 5 = 9 sequential round trips for this;
				// the point is that the number here does not move.
				yield* seed('ext_large', 250, 5);
				const beforeLarge = yield* statements();
				yield* listByExternalId('ext_large');
				const largeCost = (yield* statements()) - beforeLarge - overhead;

				assert.strictEqual(
					smallCost,
					3,
					'expected the join, the policy rank and the purpose codes'
				);
				assert.strictEqual(
					largeCost,
					smallCost,
					`round trips grew with the data: ${smallCost} -> ${largeCost}`
				);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 120_000 }
	);

	it.effect(
		'counts every matching subject, not just the page',
		() =>
			Effect.gen(function* gen() {
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
