/**
 * Adoption is the riskiest code in the package: it is the only part that
 * touches a database someone else's production data lives in. These tests
 * exist mostly to pin the properties that make it safe.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { ENGINES, resetDatabase } from '../__tests__/engines';
import { apply, LEDGER_TABLE, plan } from './adopt';
import { classify } from './classify';
import * as Dialect from './dialect';
import { up as baseline } from './migrations/1-baseline';

/**
 * A 1.0.0-era database: seven tables, no runtimePolicyDecision, with data.
 *
 * Built with each engine's own physical types rather than Postgres's, because
 * that is what a real legacy database on that engine holds — `datetime` and
 * `varchar` on MySQL, epoch integers and TEXT on SQLite. Using Postgres types
 * everywhere would test a database that has never existed, and on MySQL would
 * not even create: it cannot index a `TEXT` foreign key column.
 */
const legacyish = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	const dialect = yield* Dialect.current;
	const q = Dialect.escaperFor(dialect);
	const t = Dialect.typesFor(dialect);

	// Legacy Postgres declared `consent.metadata` as `jsonb`, which is what
	// classify uses to tell it from fumadb 1.0.0. Neither other engine has the
	// type, which is precisely why classify cannot make that distinction there.
	const metadata = dialect === 'postgres' ? 'jsonb' : t.json;

	yield* sql.unsafe(`create table ${q('subject')} (
		${q('id')} ${t.id} primary key, ${q('externalId')} ${t.text},
		${q('createdAt')} ${t.timestamp}
	)`);
	yield* sql.unsafe(`create table ${q('domain')} (
		${q('id')} ${t.id} primary key, ${q('name')} ${t.text}
	)`);
	yield* sql.unsafe(
		`create table ${q('consentPolicy')} (${q('id')} ${t.id} primary key)`
	);
	yield* sql.unsafe(
		`create table ${q('consentPurpose')} (${q('id')} ${t.id} primary key)`
	);
	yield* sql.unsafe(
		`create table ${q('auditLog')} (${q('id')} ${t.id} primary key)`
	);
	yield* sql.unsafe(`create table ${q('consent')} (
		${q('id')} ${t.id} primary key,
		${q('subjectId')} ${t.indexedText},
		${q('domainId')} ${t.indexedText},
		${q('metadata')} ${metadata},
		${q('status')} ${t.text},
		${q('withdrawalReason')} ${t.text}
	)`);
	yield* sql.unsafe(`create table ${q('consentRecord')} (
		${q('id')} ${t.id} primary key, ${q('consentId')} ${t.indexedText}
	)`);

	yield* sql`insert into ${sql('subject')} ${sql.insert({ id: 'sub_1', externalId: 'ext_1' })}`;
	yield* sql`insert into ${sql('domain')} ${sql.insert({ id: 'dom_1', name: 'a.com' })}`;
	yield* sql`insert into ${sql('consent')} ${sql.insert({
		id: 'cns_1',
		subjectId: 'sub_1',
		domainId: 'dom_1',
		status: 'active',
		withdrawalReason: 'changed mind',
	})}`;
	yield* sql`insert into ${sql('consentRecord')} ${sql.insert({ id: 'rec_1', consentId: 'cns_1' })}`;
});

/** Row count of a table, quoted for the connected engine. */
const countOf = Effect.fn('countOf')(function* (table: string) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{
		count: string | number;
	}>`select count(*) as count from ${sql(table)}`;
	return Number(rows[0]?.count ?? 0);
});

/** Table names in the current database. SQLite has no information_schema. */
const tablesOf = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
		sqlite: () =>
			sql<{
				name: string;
			}>`select name from sqlite_master where type = 'table'`,
		mysql: () =>
			sql<{ name: string }>`
				select table_name as name from information_schema.tables
				where table_schema = database()
			`,
		orElse: () =>
			sql<{ name: string }>`
				select table_name as name from information_schema.tables
				where table_schema = current_schema() and table_type = 'BASE TABLE'
			`,
	});
	return rows.map((row) => row.name);
});

/** Column names of a table. SQLite has no information_schema. */
const columnsOf = Effect.fn('columnsOf')(function* (table: string) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
		sqlite: () =>
			sql<{ name: string }>`select name from pragma_table_info(${table})`,
		mysql: () =>
			sql<{ name: string }>`
				select column_name as name from information_schema.columns
				where table_schema = database() and table_name = ${table}
			`,
		orElse: () =>
			sql<{ name: string }>`
				select column_name as name from information_schema.columns
				where table_schema = current_schema() and table_name = ${table}
			`,
	});
	return rows.map((row) => row.name).sort();
});

/**
 * Whether the engine can classify an unmarked legacy database.
 *
 * SQLite cannot: legacy and fumadb 1.0.0 carry the same seven tables and are
 * told apart by `jsonb` against `json`, which SQLite collapses to TEXT. It
 * answers `Unknown` and refuses, which is the documented behaviour (§3.3) and
 * the reason `--assume-shape` exists — so the fixtures below have nothing to
 * adopt there.
 */
const classifiesUnmarkedLegacy = (engine: (typeof ENGINES)[number]) =>
	engine.name !== 'sqlite';

/**
 * Whether a named foreign key constraint can be dropped to manufacture an
 * orphan row.
 *
 * SQLite cannot drop constraints at all, and MySQL names them differently.
 * The behaviour under test — refusing to add a foreign key existing rows would
 * violate — is engine-independent; only this way of arranging the precondition
 * is not.
 */
const canDropNamedConstraint = (engine: (typeof ENGINES)[number]) =>
	engine.name === 'pglite' || engine.name === 'postgres';

for (const engine of ENGINES) {
	describe('adopt', () => {
		it.effect(
			'plans a full create for an empty database',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					const adoption = yield* plan;
					assert.strictEqual(adoption.shape._tag, 'Empty');
					assert.isUndefined(adoption.blocked);
					assert.strictEqual(
						adoption.steps.filter((step) => step.kind === 'create-table')
							.length,
						7
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		(classifiesUnmarkedLegacy(engine) ? it.effect : it.effect.skip)(
			'never drops data that schema 2.0.0 removed',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* legacyish;
					const adoption = yield* plan;

					assert.isUndefined(adoption.blocked);
					assert.deepStrictEqual(
						adoption.steps.filter(
							(step) =>
								step.sql.includes('drop table') ||
								step.sql.includes('drop column')
						),
						[],
						'adoption must never drop anything'
					);

					yield* apply(adoption);

					// consentRecord was dropped in 2.0.0. Discarding it would discard
					// consent history, so it stays and is reported instead.
					assert.strictEqual(yield* countOf('consentRecord'), 1);

					const consent = yield* columnsOf('consent');
					assert.include(consent, 'withdrawalReason');
					assert.include(consent, 'status');
					assert.include(
						adoption.retained.join(' '),
						'withdrawalReason',
						'retained columns should be reported to the operator'
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		(classifiesUnmarkedLegacy(engine) ? it.effect : it.effect.skip)(
			'brings a 1.0.0-era database up to the baseline contract',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* legacyish;
					yield* apply(yield* plan);

					// Every column the backend reads must now exist, whatever else does.
					const consent = yield* columnsOf('consent');
					for (const column of [
						'runtimePolicyDecisionId',
						'runtimePolicySource',
						'tcString',
						'uiSource',
						'consentAction',
						'jurisdiction',
						'tenantId',
					]) {
						assert.include(consent, column);
					}

					assert.include(yield* tablesOf, 'runtimePolicyDecision');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		(classifiesUnmarkedLegacy(engine) ? it.effect : it.effect.skip)(
			'emits no destructive statement for any shape it can encounter',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					const sql = yield* SqlClient.SqlClient;
					const destructive = /\b(drop|truncate)\b|\bdelete\s+from\b/i;

					// Empty database.
					for (const step of (yield* plan).steps) {
						assert.notMatch(step.sql, destructive, step.description);
					}

					// A 1.0.0-era database with data.
					yield* legacyish;
					for (const step of (yield* plan).steps) {
						assert.notMatch(step.sql, destructive, step.description);
					}

					// A 2.0.0-shaped database missing only the newer columns.
					// `resetDatabase` rather than dropping the schema, which is
					// Postgres-only syntax.
					yield* resetDatabase;
					yield* baseline;
					const q = Dialect.escaperFor(yield* Dialect.current);
					yield* sql.unsafe(
						`alter table ${q('consent')} drop column ${q('tenantId')}`
					);
					for (const step of (yield* plan).steps) {
						assert.notMatch(step.sql, destructive, step.description);
					}
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'refuses to apply a plan carrying a destructive statement',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* legacyish;
					const adoption = yield* plan;

					// Simulates a future edit smuggling a drop into an additive step.
					const tampered = {
						...adoption,
						steps: [
							...adoption.steps,
							{
								kind: 'add-column' as const,
								description: 'sneaky',
								sql: 'drop table "consentRecord"',
							},
						],
					};

					const outcome = yield* Effect.exit(apply(tampered));
					assert.isTrue(outcome._tag === 'Failure');

					// And the table it targeted is untouched.
					assert.strictEqual(yield* countOf('consentRecord'), 1);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		(classifiesUnmarkedLegacy(engine) ? it.effect : it.effect.skip)(
			'reports the database as ours once adopted',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* legacyish;
					yield* apply(yield* plan);
					const shape = yield* classify;
					assert.strictEqual(shape._tag, 'Baseline');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		(classifiesUnmarkedLegacy(engine) ? it.effect : it.effect.skip)(
			'is safe to re-run after a partial application',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* legacyish;
					yield* apply(yield* plan);
					const first = yield* columnsOf('consent');

					// Re-planning against the now-adopted database should be a no-op.
					const second = yield* plan;
					assert.strictEqual(second.shape._tag, 'Baseline');
					yield* apply(second);
					assert.deepStrictEqual(yield* columnsOf('consent'), first);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		(canDropNamedConstraint(engine) ? it.effect : it.effect.skip)(
			'refuses to add a foreign key that existing rows would violate',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					const sql = yield* SqlClient.SqlClient;
					yield* baseline;
					// Drop the constraint so we can create the orphan, mimicking a
					// MySQL database that never had foreign keys at all.
					yield* sql.unsafe(
						`alter table "consent" drop constraint "consent_subjectId_fkey"`
					);
					yield* sql.unsafe(`insert into "domain" ("id", "name", "createdAt", "updatedAt")
						values ('dom_1', 'a.com', now(), now())`);
					yield* sql.unsafe(`insert into "consent"
						("id", "subjectId", "domainId", "purposeIds", "givenAt")
						values ('cns_1', 'sub_missing', 'dom_1', '[]', now())`);

					const adoption = yield* plan;

					assert.isDefined(adoption.blocked);
					assert.include(adoption.blocked ?? '', '1 row(s)');
					assert.include(adoption.blocked ?? '', 'skipForeignKeys');
					assert.strictEqual(adoption.orphans.length, 1);
					assert.strictEqual(adoption.orphans[0]?.table, 'consent');
					assert.strictEqual(adoption.orphans[0]?.count, 1);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		(canDropNamedConstraint(engine) ? it.effect : it.effect.skip)(
			'proceeds without foreign keys when explicitly told to',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					const sql = yield* SqlClient.SqlClient;
					yield* baseline;
					yield* sql.unsafe(
						`alter table "consent" drop constraint "consent_subjectId_fkey"`
					);
					yield* sql.unsafe(`insert into "domain" ("id", "name", "createdAt", "updatedAt")
						values ('dom_1', 'a.com', now(), now())`);
					yield* sql.unsafe(`insert into "consent"
						("id", "subjectId", "domainId", "purposeIds", "givenAt")
						values ('cns_1', 'sub_missing', 'dom_1', '[]', now())`);

					const adoption = yield* plan;
					yield* apply(adoption, { skipForeignKeys: true });

					// The orphan row survives — the operator chose integrity later
					// over losing data now.
					assert.strictEqual(yield* countOf('consent'), 1);

					const ledger = yield* sql<{ name: string }>`
						select ${sql('name')} from ${sql(LEDGER_TABLE)}
					`;
					assert.strictEqual(ledger[0]?.name, '1-baseline');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);
	});

	describe('adopt: refusals and edge cases', () => {
		it.effect(
			'refuses an unrecognised database rather than guessing',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					const sql = yield* SqlClient.SqlClient;
					const q = Dialect.escaperFor(yield* Dialect.current);
					// A c15t-shaped database claiming a schema version we have no
					// fixture for. Migrating it would be acting on an assumption
					// about a shape nobody has seen.
					yield* sql.unsafe(
						`create table ${q('subject')} (${q('id')} varchar(255) primary key)`
					);
					yield* sql.unsafe(
						`create table ${q('consent')} (${q('id')} varchar(255) primary key)`
					);
					// `key` is reserved on MySQL, and a primary key there must be
					// bounded — hence varchar rather than text.
					yield* sql.unsafe(
						`create table ${q('private_c15t_settings')} (${q('key')} varchar(255) primary key, ${q('value')} text)`
					);
					yield* sql`
						insert into ${sql('private_c15t_settings')} ${sql.insert({
							key: 'version',
							value: '9.9.9',
						})}
					`;

					const adoption = yield* plan;

					assert.strictEqual(adoption.shape._tag, 'Unknown');
					assert.isDefined(adoption.blocked);
					assert.deepStrictEqual(adoption.steps, [], 'must plan nothing');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		(canDropNamedConstraint(engine) ? it.effect : it.effect.skip)(
			'dies rather than applying a blocked plan',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					const sql = yield* SqlClient.SqlClient;
					yield* baseline;
					yield* sql.unsafe(
						`alter table "consent" drop constraint "consent_subjectId_fkey"`
					);
					yield* sql.unsafe(`insert into "domain" ("id","name","createdAt","updatedAt")
						values ('dom_1','a.com',now(),now())`);
					yield* sql.unsafe(`insert into "consent"
						("id","subjectId","domainId","purposeIds","givenAt")
						values ('cns_1','sub_missing','dom_1','[]',now())`);

					const adoption = yield* plan;
					const outcome = yield* Effect.exit(apply(adoption));

					// Refusing loudly beats a partial migration an operator has to
					// unpick by hand.
					assert.strictEqual(outcome._tag, 'Failure');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'plans nothing for a database already at the baseline',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					const sql = yield* SqlClient.SqlClient;
					const q = Dialect.escaperFor(yield* Dialect.current);
					yield* baseline;
					yield* sql.unsafe(
						`create table ${q('c15t_migrations')} (${q('id')} integer primary key, ${q('name')} text)`
					);

					const adoption = yield* plan;

					// Re-running adoption against our own output must be inert, or a
					// retried deploy would churn the schema.
					assert.strictEqual(adoption.shape._tag, 'Baseline');
					assert.deepStrictEqual(adoption.steps, []);
					assert.isUndefined(adoption.blocked);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'adds only the columns a partial database is missing',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					const sql = yield* SqlClient.SqlClient;
					yield* baseline;
					const q = Dialect.escaperFor(yield* Dialect.current);
					yield* sql.unsafe(
						`alter table ${q('consent')} drop column ${q('tenantId')}`
					);
					yield* sql.unsafe(
						`alter table ${q('consent')} drop column ${q('uiSource')}`
					);

					const adoption = yield* plan;
					const added = adoption.steps.filter(
						(step) => step.kind === 'add-column'
					);

					// Precisely two, not a wholesale rewrite: adoption must touch as
					// little as it can get away with.
					assert.strictEqual(added.length, 2);
					yield* apply(adoption);

					const names = yield* columnsOf('consent');
					assert.include(names, 'tenantId');
					assert.include(names, 'uiSource');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		(classifiesUnmarkedLegacy(engine) ? it.effect : it.effect.skip)(
			'reports retained columns so an operator can prune deliberately',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* legacyish;
					const adoption = yield* plan;

					// The operator has to be told what was kept, or "additive" just
					// means the extra columns are invisible instead of absent.
					assert.isAbove(adoption.retained.length, 0);
					assert.include(adoption.retained.join(' '), 'consentRecord');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);
	});

	/**
	 * SQLite adoption.
	 *
	 * Every other case here runs on Postgres, which left the SQLite branches of
	 * introspection and classification unexecuted — on the one code path that
	 * touches a real deployment's data. SQLite is in-process, so there is no
	 * excuse for not covering it.
	 */
}
