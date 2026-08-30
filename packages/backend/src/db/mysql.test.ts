/**
 * MySQL, against a real server.
 *
 * Opt-in, because MySQL cannot run in-process the way SQLite and PGlite can:
 *
 * ```
 * docker run --rm -d -p 3399:3306 -e MYSQL_ROOT_PASSWORD=c15t \
 *   -e MYSQL_DATABASE=c15t --name c15t-test mysql:8
 * C15T_TEST_MYSQL_URL=mysql://root:c15t@127.0.0.1:3399/c15t bun run test
 * ```
 *
 * Skipped when that variable is absent, so CI stays free of a Docker
 * dependency (RFC 0004 §7) while the engine still gets exercised before a
 * release.
 *
 * This file holds only what is **specific to MySQL**. Behaviour that should be
 * identical on every engine lives in `../repository/cross-engine.test.ts`,
 * which picks MySQL up from the same environment variable.
 *
 * Worth testing rather than assuming, because MySQL is where this project's
 * engine differences have actually bitten: fumadb cannot migrate it at all
 * (§3.5), it delimits identifiers with backticks rather than double quotes, it
 * supports neither `on conflict` nor `returning`, an indexed string column must
 * be a bounded varchar, and its DDL is not transactional.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { ENGINES, resetDatabase } from '../__tests__/engines';
import { apply, plan } from './adopt';
import { classify } from './classify';
import { insertOnce } from './insert-once';
import { up as baseline } from './migrations/1-baseline';
import { up as indexes } from './migrations/2-hot-path-indexes';

const mysql = ENGINES.find((engine) => engine.name === 'mysql');
const suite = mysql ? describe : describe.skip;
const Mysql = mysql?.layer ?? ENGINES[0]?.layer;

const reset = resetDatabase;

suite('mysql', () => {
	it.effect(
		'applies the baseline',
		() =>
			Effect.gen(function* () {
				yield* reset;
				yield* baseline;

				const sql = yield* SqlClient.SqlClient;
				const tables = yield* sql<{ name: string }>`
					select table_name as name from information_schema.tables
					where table_schema = database()
				`;
				assert.strictEqual(tables.length, 7);
			}).pipe(Effect.provide(Mysql)),
		{ timeout: 120_000 }
	);

	it.effect(
		'creates the unique index fumadb cannot',
		() =>
			Effect.gen(function* () {
				yield* reset;
				yield* baseline;

				// The exact thing that makes fumadb unable to migrate MySQL:
				// dedupeKey is unique, and MySQL cannot index TEXT without a
				// prefix length. Our dialect mapping bounds it to varchar here
				// and only here.
				const sql = yield* SqlClient.SqlClient;
				const columns = yield* sql<{ DATA_TYPE: string }>`
					select data_type as DATA_TYPE from information_schema.columns
					where table_schema = database()
						and table_name = 'runtimePolicyDecision'
						and column_name = 'dedupeKey'
				`;
				assert.strictEqual(
					String(columns[0]?.DATA_TYPE).toLowerCase(),
					'varchar'
				);
			}).pipe(Effect.provide(Mysql)),
		{ timeout: 120_000 }
	);

	it.effect(
		'applies the hot-path indexes',
		() =>
			Effect.gen(function* () {
				yield* reset;
				yield* baseline;
				yield* indexes;

				const sql = yield* SqlClient.SqlClient;
				const found = yield* sql<{ INDEX_NAME: string }>`
					select distinct index_name as INDEX_NAME
					from information_schema.statistics
					where table_schema = database() and index_name like 'c15t_%'
				`;
				assert.isAbove(found.length, 10);
			}).pipe(Effect.provide(Mysql)),
		{ timeout: 120_000 }
	);

	it.effect(
		'classifies and adopts an empty database',
		() =>
			Effect.gen(function* () {
				yield* reset;

				assert.strictEqual((yield* classify)._tag, 'Empty');
				yield* apply(yield* plan);
				assert.strictEqual((yield* classify)._tag, 'Baseline');
			}).pipe(Effect.provide(Mysql)),
		{ timeout: 120_000 }
	);

	it.effect(
		'adoption emits nothing destructive on mysql',
		() =>
			Effect.gen(function* () {
				yield* reset;
				const sql = yield* SqlClient.SqlClient;
				yield* sql.unsafe(
					'create table `subject` (`id` varchar(255) primary key, `externalId` text)'
				);
				yield* sql.unsafe(
					'create table `consent` (`id` varchar(255) primary key, `status` text)'
				);

				// MySQL DDL is not transactional, so a destructive step here
				// could not be rolled back — the add-only guarantee matters more
				// on this engine than on the others.
				for (const step of (yield* plan).steps) {
					assert.notMatch(
						step.sql,
						/\b(drop|truncate)\b|\bdelete\s+from\b/i,
						step.description
					);
				}
			}).pipe(Effect.provide(Mysql)),
		{ timeout: 120_000 }
	);

	it.effect(
		'indexes a legacy TEXT column by prefix',
		() =>
			Effect.gen(function* () {
				yield* reset;
				yield* baseline;
				const sql = yield* SqlClient.SqlClient;

				// Stand in for a column adoption inherited. A legacy MySQL
				// database declares `subject.externalId` as TEXT, and adoption is
				// add-only so it stays TEXT — which MySQL refuses to index whole.
				// The index migration has to cope rather than fail.
				yield* sql.unsafe('alter table `subject` modify `externalId` text');

				yield* indexes;

				const prefixed = yield* sql<{
					INDEX_NAME: string;
					SUB_PART: number | null;
				}>`
					select index_name as INDEX_NAME, sub_part as SUB_PART
					from information_schema.statistics
					where table_schema = database()
						and index_name = 'c15t_subject_externalId_idx'
				`;

				// Indexed, and indexed by prefix rather than whole.
				assert.strictEqual(prefixed.length, 1);
				assert.strictEqual(Number(prefixed[0]?.SUB_PART), 191);
			}).pipe(Effect.provide(Mysql)),
		{ timeout: 120_000 }
	);

	it.effect(
		'indexes a fresh varchar column whole',
		() =>
			Effect.gen(function* () {
				yield* reset;
				yield* baseline;
				yield* indexes;

				const sql = yield* SqlClient.SqlClient;
				const fresh = yield* sql<{ SUB_PART: number | null }>`
					select sub_part as SUB_PART from information_schema.statistics
					where table_schema = database()
						and index_name = 'c15t_subject_externalId_idx'
				`;

				// A fresh install declares the column varchar(255), so no prefix
				// is needed and none should be used — the prefix exists only to
				// accommodate columns adoption inherited.
				assert.strictEqual(fresh.length, 1);
				assert.isNull(fresh[0]?.SUB_PART ?? null);
			}).pipe(Effect.provide(Mysql)),
		{ timeout: 120_000 }
	);

	it.effect(
		'is idempotent on a second index run',
		() =>
			Effect.gen(function* () {
				yield* reset;
				yield* baseline;
				yield* indexes;

				// MySQL has no `create index if not exists`; re-running would
				// fail with "Duplicate key name" without the pre-flight check.
				yield* indexes;

				const sql = yield* SqlClient.SqlClient;
				const found = yield* sql<{ total: number | string }>`
					select count(distinct index_name) as total
					from information_schema.statistics
					where table_schema = database() and index_name like 'c15t_%'
				`;
				assert.isAbove(Number(found[0]?.total), 10);
			}).pipe(Effect.provide(Mysql)),
		{ timeout: 120_000 }
	);
	it.effect(
		'adopting a legacy database adds its missing columns',
		() =>
			Effect.gen(function* () {
				yield* reset;
				const sql = yield* SqlClient.SqlClient;

				// A legacy MySQL shape: no ledger, no fumadb marker, and
				// `consentRecord` still present. `subject` is missing every column
				// 2.0.0 added.
				yield* sql.unsafe(
					'create table `subject` (`id` varchar(255) primary key, ' +
						'`externalId` text)'
				);
				yield* sql.unsafe(
					'create table `consent` (`id` varchar(255) primary key, ' +
						'`subjectId` varchar(255))'
				);
				yield* sql.unsafe(
					'create table `consentRecord` (`id` varchar(255) primary key)'
				);

				assert.strictEqual((yield* classify)._tag, 'Legacy');

				const adoption = yield* plan;
				const added = adoption.steps
					.filter((step) => step.kind === 'add-column')
					.map((step) => step.description);

				// The regression this guards: MySQL returns `information_schema`
				// labels uppercased, so an unaliased projection read back as
				// `undefined` and every existing table looked absent. Adoption
				// then planned zero column additions and stamped the ledger
				// anyway, leaving a database marked as baseline while missing
				// most of its columns.
				assert.include(added, 'Add "subject"."tenantId"');
				assert.include(added, 'Add "subject"."createdAt"');
				assert.include(added, 'Add "consent"."purposeIds"');

				yield* apply(adoption);

				const columns = yield* sql<{ name: string }>`
					select column_name as name from information_schema.columns
					where table_schema = database() and table_name = 'subject'
				`;
				const names = columns.map((column) => column.name);
				assert.include(names, 'tenantId');
				// Add-only: the legacy column is still there, untouched.
				assert.include(names, 'externalId');
				assert.strictEqual((yield* classify)._tag, 'Baseline');
			}).pipe(Effect.provide(Mysql)),
		{ timeout: 120_000 }
	);
});

suite('insert-once only suppresses the duplicate', () => {
	it.effect(
		'a non-duplicate failure is not swallowed',
		() =>
			Effect.gen(function* () {
				yield* reset;
				yield* baseline;

				// `insert ignore` — the obvious MySQL equivalent of
				// `on conflict do nothing` — downgrades every error to a warning,
				// so this row would be silently truncated to 255 characters here
				// and rejected outright on Postgres and SQLite. Two engines
				// disagreeing about what was stored is worse than either answer.
				const result = yield* Effect.result(
					insertOnce({
						into: 'subject',
						conflictOn: 'id',
						values: {
							id: 'x'.repeat(300),
							externalId: null,
							identityProvider: 'anonymous',
							tenantId: null,
							createdAt: new Date(1_800_000_000_000),
							updatedAt: new Date(1_800_000_000_000),
						},
					})
				);

				assert.isTrue(result._tag === 'Failure', 'overflow was suppressed');

				const sql = yield* SqlClient.SqlClient;
				const rows = yield* sql<{ n: number | string }>`
					select count(*) as n from ${sql('subject')}
				`;
				assert.strictEqual(Number(rows[0]?.n), 0, 'wrote a truncated row');
			}).pipe(Effect.provide(Mysql ?? ENGINES[0]?.layer ?? Mysql!)),
		{ timeout: 60_000 }
	);

	it.effect(
		'a duplicate still reports "not created" rather than failing',
		() =>
			Effect.gen(function* () {
				yield* reset;
				yield* baseline;

				const row = {
					id: 'sub_dup',
					externalId: null,
					identityProvider: 'anonymous',
					tenantId: null,
					createdAt: new Date(1_800_000_000_000),
					updatedAt: new Date(1_800_000_000_000),
				};

				assert.isTrue(
					yield* insertOnce({ into: 'subject', conflictOn: 'id', values: row })
				);
				assert.isFalse(
					yield* insertOnce({ into: 'subject', conflictOn: 'id', values: row })
				);
			}).pipe(Effect.provide(Mysql ?? ENGINES[0]?.layer ?? Mysql!)),
		{ timeout: 60_000 }
	);
});
