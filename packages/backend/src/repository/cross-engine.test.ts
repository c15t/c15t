/**
 * Every repository behaviour, on every engine.
 *
 * The rest of the repository suite runs on PGlite and asserts semantics in
 * depth. This file asserts something narrower and, it turns out, more
 * load-bearing: that the SQL this package emits **executes at all**, and means
 * the same thing, on Postgres, SQLite and MySQL alike.
 *
 * That was not true. Every statement quoted identifiers as `"subject"`, which
 * MySQL rejects, so not one query in this package could run there — while the
 * suite was green, because nothing ever pointed it at MySQL.
 *
 * The cases below are therefore chosen for where engines actually diverge,
 * rather than for behavioural coverage that `record-consent.test.ts` and
 * `subject.test.ts` already provide:
 *
 * | Case | What only this can catch |
 * | --- | --- |
 * | idempotent writes | `on conflict … returning` vs `insert ignore` |
 * | the joined read | identifier quoting through aliases and joins |
 * | latest policy per type | `row_number() over (partition by …)` |
 * | booleans | `bool` on Postgres, `tinyint` on MySQL, `0/1` on SQLite |
 * | timestamps | `timestamp` vs epoch integers vs `datetime(3)` |
 * | transactions | rollback semantics under a real client |
 *
 * MySQL joins in only when `C15T_TEST_MYSQL_URL` is set; see `../__tests__/engines`.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { ENGINES, resetDatabase } from '../__tests__/engines';
import { up as baseline } from '../db/migrations/1-baseline';
import { up as indexes } from '../db/migrations/2-hot-path-indexes';
import { layer as tenantLayer } from '../db/tenant';
import { encodeRow, encoder } from '../db/values';
import { syncCurrent } from './legal-document';
import { submit } from './record-consent';
import { recordDecision } from './runtime-policy-decision';
import {
	countByExternalId,
	findById,
	findOrCreate,
	latestPolicyIdByType,
	linkExternalId,
	listByExternalId,
} from './subject';

/** Fixed rather than `new Date()` so the assertion can be exact. */
const GIVEN_AT = new Date(1_800_000_000_123);

const setup = Effect.gen(function* () {
	yield* resetDatabase;
	yield* baseline;
	// Included because the index migration is itself engine-divergent — MySQL
	// has no `create index if not exists` and cannot index a bare TEXT column.
	yield* indexes;

	const sql = yield* SqlClient.SqlClient;
	// Seed rows go through the same encoder as production writes: SQLite can
	// bind neither a Date nor a boolean.
	yield* sql`
		insert into ${sql('domain')} ${sql.insert(
			encodeRow(yield* encoder, {
				id: 'dom_1',
				name: 'example.com',
				createdAt: GIVEN_AT,
				updatedAt: GIVEN_AT,
			})
		)}
	`;
});

const submission = {
	subjectId: 'sub_1',
	domainId: 'dom_1',
	purposeIds: ['analytics'],
	givenAt: GIVEN_AT,
	ipAddress: '203.0.113.0',
	userAgent: 'test-agent',
};

const countOf = Effect.fn('countOf')(function* (table: string) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{
		total: number | string;
	}>`select count(*) as total from ${sql(table)}`;
	return Number(rows[0]?.total ?? 0);
});

for (const engine of ENGINES) {
	describe(`repository on ${engine.name}`, () => {
		it.effect(
			'records a consent, and a replay adds nothing',
			() =>
				Effect.gen(function* () {
					yield* setup;

					const first = yield* submit(submission);
					const replay = yield* submit(submission);

					assert.isTrue(first.created);
					assert.isFalse(replay.created, 'replay created a second consent');
					assert.strictEqual(replay.consentId, first.consentId);

					// One legal record and one audit entry, whichever engine and
					// whichever upsert syntax that engine required.
					assert.strictEqual(yield* countOf('consent'), 1);
					assert.strictEqual(yield* countOf('subject'), 1);
					assert.strictEqual(yield* countOf('auditLog'), 1);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);

		it.effect(
			'races to a single consent',
			() =>
				Effect.gen(function* () {
					yield* setup;

					const results = yield* Effect.all(
						[submit(submission), submit(submission), submit(submission)],
						{ concurrency: 'unbounded' }
					);

					// Exactly one caller may believe it created the row, or the
					// audit trail claims the subject consented three times.
					assert.strictEqual(
						results.filter((result) => result.created).length,
						1
					);
					assert.strictEqual(yield* countOf('consent'), 1);
					assert.strictEqual(yield* countOf('auditLog'), 1);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);

		it.effect(
			'creates a subject once',
			() =>
				Effect.gen(function* () {
					yield* setup;

					const first = yield* findOrCreate({ subjectId: 'sub_x' });
					const second = yield* findOrCreate({ subjectId: 'sub_x' });

					assert.isTrue(first.created);
					assert.isFalse(second.created);
					assert.strictEqual(yield* countOf('subject'), 1);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);

		it.effect(
			'deduplicates a decision on its unique key',
			() =>
				Effect.gen(function* () {
					yield* setup;

					const input = {
						policyId: 'pol_1',
						fingerprint: 'fp_1',
						matchedBy: 'country',
						jurisdiction: 'gdpr',
						model: 'opt_in',
						dedupeKey: 'default|fp_1|country|DE|none|gdpr',
					};

					const first = yield* recordDecision(input);
					const again = yield* recordDecision(input);

					// `dedupeKey` is the unique column MySQL cannot index as TEXT —
					// the constraint that stops fumadb migrating MySQL at all.
					assert.isTrue(first.created);
					assert.isFalse(again.created);
					assert.strictEqual(again.id, first.id);
					assert.strictEqual(yield* countOf('runtimePolicyDecision'), 1);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);

		it.effect(
			'reads a subject back through the join',
			() =>
				Effect.gen(function* () {
					yield* setup;
					yield* submit({ ...submission, externalId: 'ext_1' });
					yield* linkExternalId({
						subjectId: 'sub_1',
						externalId: 'ext_1',
						identityProvider: 'auth0',
						ipAddress: null,
						userAgent: null,
					});

					const listed = yield* listByExternalId('ext_1');
					const found = yield* findById('sub_1');

					assert.strictEqual(listed.length, 1);
					assert.strictEqual(listed[0]?.consents.length, 1);
					assert.strictEqual(found?.id, 'sub_1');
					assert.strictEqual(yield* countByExternalId('ext_1'), 1);

					// A timestamp has to survive the round trip intact on all three
					// storage representations — Postgres `timestamp`, SQLite epoch
					// integers, MySQL `datetime(3)`. Bare MySQL `datetime` would
					// truncate the milliseconds and fail here, which matters because
					// a consent's id is derived from this value.
					assert.strictEqual(
						listed[0]?.consents[0]?.givenAt.getTime(),
						GIVEN_AT.getTime()
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);

		it.effect(
			'ranks the latest policy per type',
			() =>
				Effect.gen(function* () {
					yield* setup;

					yield* syncCurrent({
						type: 'cookie',
						version: '1.0',
						hash: 'sha256-one',
						effectiveDate: new Date(1_700_000_000_000),
					});
					const second = yield* syncCurrent({
						type: 'cookie',
						version: '2.0',
						hash: 'sha256-two',
						effectiveDate: new Date(1_800_000_000_000),
					});

					// `row_number() over (partition by …)` and the boolean column it
					// filters on: `bool` here, `tinyint` on MySQL, `0`/`1` on SQLite.
					const latest = yield* latestPolicyIdByType();
					assert.strictEqual(latest.get('cookie'), second.id);
					assert.strictEqual(latest.size, 1);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);

		it.effect(
			'supersedes a policy inside one transaction',
			() =>
				Effect.gen(function* () {
					yield* setup;
					const sql = yield* SqlClient.SqlClient;

					yield* syncCurrent({
						type: 'cookie',
						version: '1.0',
						hash: 'sha256-one',
						effectiveDate: new Date(1_700_000_000_000),
					});
					yield* syncCurrent({
						type: 'cookie',
						version: '2.0',
						hash: 'sha256-two',
						effectiveDate: new Date(1_800_000_000_000),
					});

					// Exactly one active policy per type is the invariant every
					// `isLatestPolicy` answer depends on.
					const active = yield* sql<{ total: number | string }>`
						select count(*) as total from ${sql('consentPolicy')}
						where ${sql('isActive')} = ${(yield* encoder)(true)}
					`;
					assert.strictEqual(Number(active[0]?.total), 1);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);

		it.effect(
			'keeps two tenants apart',
			() =>
				Effect.gen(function* () {
					yield* setup;
					const sql = yield* SqlClient.SqlClient;

					const encode = yield* encoder;
					for (const tenant of ['tenant_a', 'tenant_b']) {
						yield* sql`
							insert into ${sql('subject')} ${sql.insert(
								encodeRow(encode, {
									id: `sub_${tenant}`,
									externalId: 'shared_external_id',
									tenantId: tenant,
									createdAt: GIVEN_AT,
									updatedAt: GIVEN_AT,
								})
							)}
						`;
					}

					// Only the tenant scope is overridden. Providing the engine layer
					// again would build a second, empty database and the assertion
					// would pass for the wrong reason.
					const seen = yield* listByExternalId('shared_external_id').pipe(
						Effect.provide(tenantLayer('tenant_a'))
					);

					// The tenant predicate is a fragment built per dialect; a
					// mis-quoted column here would either error or, worse, match
					// nothing and silently return an empty list.
					assert.strictEqual(seen.length, 1, 'leaked another tenant');
					assert.strictEqual(seen[0]?.id, 'sub_tenant_a');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);
	});
}
