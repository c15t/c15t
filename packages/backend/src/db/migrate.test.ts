/**
 * The migration runner, on every engine.
 *
 * These are the tests standing between a self-hoster and a broken database, so
 * they are written around what can actually go wrong rather than around the
 * happy path:
 *
 * - a **fresh** database reaches the current schema in one call;
 * - a **second** call does nothing, because re-running a migration is a normal
 *   operational event, not an error;
 * - an **already-adopted** database picks up only the migrations it is missing,
 *   which is the case that did not work at all before this file existed —
 *   adoption stamped `1-baseline` and the hot-path indexes never ran;
 * - an **unrecognised** database is refused rather than guessed at;
 * - a **dry run** changes nothing, which has to be true or the flag is a lie.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { ENGINES, resetDatabase } from '../__tests__/engines';
import { LEDGER_TABLE } from './adopt';
import * as Dialect from './dialect';
import { MIGRATIONS, migrate } from './migrate';

/**
 * Ledger ids, or `[]` when there is no ledger yet.
 *
 * `select *`, not `select "id"`, and that is not arbitrary.
 * `@effect/sql-sqlite-node` caches prepared statements by SQL text including
 * failures, so the exact query `migrate` uses internally is already poisoned
 * on a connection where the ledger did not exist at first probe. Reading it
 * with different SQL keeps this assertion measuring the database rather than
 * the driver's cache.
 */
const ledger = Effect.gen(function* ledger() {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql<{ id: number | string }>`
		select * from ${sql(LEDGER_TABLE)}
	`.pipe(
		Effect.map((rows) => rows.map((row) => Number(row.id)).sort()),
		Effect.orElseSucceed(() => [] as number[])
	);
});

const tableCount = Effect.fn('tableCount')(function* tableCount() {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
		mysql: () =>
			sql<{ name: string }>`
				select table_name as name from information_schema.tables
				where table_schema = database()
			`,
		orElse: () =>
			sql<{ name: string }>`
				select table_name as name from information_schema.tables
				where table_schema = 'public' and table_type = 'BASE TABLE'
			`,
		sqlite: () =>
			sql<{
				name: string;
			}>`select name from sqlite_master where type = 'table'`,
	});
	return rows.length;
});

for (const engine of ENGINES) {
	describe(`migrate on ${engine.name}`, () => {
		it.effect(
			'takes an empty database to the current schema',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;

					const report = yield* migrate();

					assert.strictEqual(report['shape']._tag, 'Empty');
					assert.isTrue(report.applied);
					assert.isUndefined(report.blocked);
					// Every migration is recorded, not just the baseline. Before this
					// runner existed the ledger stopped at 1 and the hot-path indexes
					// were unreachable outside tests.
					assert.deepStrictEqual(
						yield* ledger,
						MIGRATIONS.map((migration) => migration.id)
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);

		it.effect(
			'does nothing on a second run',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* migrate();

					const again = yield* migrate();

					// Re-running is a normal operational event — a redeploy, a
					// restart, a retried job — and must not be an error or a
					// duplicate.
					assert.strictEqual(again['shape']._tag, 'Baseline');
					assert.deepStrictEqual(again.adoption, []);
					assert.deepStrictEqual(again.pending, []);
					assert.deepStrictEqual(
						yield* ledger,
						MIGRATIONS.map((migration) => migration.id)
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);

		it.effect(
			'applies only what an adopted database is missing',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					const sql = yield* SqlClient.SqlClient;

					// A database adopted before migration 2 existed: at the baseline,
					// ledger stamped 1, no hot-path indexes. This is the state every
					// early adopter would have been stuck in.
					yield* migrate();
					yield* sql`delete from ${sql(LEDGER_TABLE)} where ${sql('id')} > ${1}`;

					const report = yield* migrate();

					assert.deepStrictEqual(report.adoption, []);
					assert.deepStrictEqual(report.pending, [
						'2-hot-path-indexes',
						'3-consent-receipts-and-privacy-directives',
					]);
					assert.deepStrictEqual(yield* ledger, [1, 2, 3]);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);

		it.effect(
			'refuses a database it does not recognise',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					const sql = yield* SqlClient.SqlClient;
					const quote = Dialect.escaperFor(yield* Dialect.current);

					// A fumadb marker naming a schema version we have no fixture for.
					// Chosen over a bare `subject` table because that is genuinely
					// *not* ambiguous on MySQL — fumadb cannot migrate MySQL in either
					// era, so a marker-less database there is legacy by elimination.
					// A version from the future is unrecognisable everywhere.
					//
					// `key` is reserved on MySQL, hence the escaper.
					yield* sql.unsafe(
						`create table ${quote('subject')} (${quote('id')} varchar(255) primary key)`
					);
					yield* sql.unsafe(
						`create table ${quote('private_c15t_settings')} (` +
							`${quote('key')} varchar(255), ${quote('value')} varchar(255))`
					);
					yield* sql`
						insert into ${sql('private_c15t_settings')} ${sql.insert({
							key: 'version',
							value: '9.9.9',
						})}
					`;

					const report = yield* migrate();

					// Refusing beats guessing: the wrong guess here rewrites someone's
					// consent records.
					assert.isDefined(report.blocked);
					assert.include(report.blocked ?? '', '9.9.9');
					assert.isFalse(report.applied);
					assert.deepStrictEqual(yield* ledger, []);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);

		it.effect(
			'a dry run changes nothing',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;

					const report = yield* migrate({ dryRun: true });

					assert.isFalse(report.applied);
					assert.isAbove(report.adoption.length, 0);
					assert.deepStrictEqual(report.pending, [
						'2-hot-path-indexes',
						'3-consent-receipts-and-privacy-directives',
					]);

					// The assertion that makes the flag mean something: no tables, no
					// ledger, nothing.
					assert.strictEqual(yield* tableCount(), 0);
					assert.deepStrictEqual(yield* ledger, []);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);
	});
}
