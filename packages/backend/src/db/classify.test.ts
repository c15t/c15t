/**
 * Classification decides whether an upgrade is correct or destructive, so the
 * cases that matter most are the ambiguous ones — particularly a
 * fumadb-shaped database with no version marker, which an earlier draft of
 * RFC 0004 would have misfiled as legacy and converged destructively.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { ENGINES, resetDatabase } from '../__tests__/engines';
import { singleTenant } from '../db/tenant';
import { classify } from './classify';
import * as Dialect from './dialect';
import { up as baseline } from './migrations/1-baseline';

/**
 * DDL quoted for the connected engine.
 *
 * These fixtures build legacy shapes by hand, so they emit their own DDL
 * rather than going through `schema.ts`. MySQL delimits with backticks and
 * rejects the double quotes the other two want.
 */
const quoted = Effect.gen(function* () {
	return Dialect.escaperFor(yield* Dialect.current);
});

/**
 * The seven tables legacy and fumadb 1.0.0 share, differing only in whether
 * `consent.metadata` is `jsonb` (legacy) or `json` (fumadb). Everything not
 * load-bearing for classification is omitted.
 */
const sevenTables = (metadataType: 'json' | 'jsonb') =>
	Effect.gen(function* () {
		const sql = yield* SqlClient.SqlClient;
		const q = yield* quoted;
		// MySQL has no `jsonb`; both eras store `json` there, which is exactly
		// why classify cannot tell them apart on MySQL and answers by
		// elimination instead (§11.7).
		const metadata =
			(yield* Dialect.current) === 'mysql' ? 'json' : metadataType;

		for (const table of [
			'subject',
			'domain',
			'consentPolicy',
			'consentPurpose',
			'auditLog',
		]) {
			yield* sql.unsafe(
				`create table ${q(table)} (${q('id')} varchar(255) primary key)`
			);
		}
		yield* sql.unsafe(
			`create table ${q('consent')} (${q('id')} varchar(255) primary key, ${q('metadata')} ${metadata})`
		);
		yield* sql.unsafe(
			`create table ${q('consentRecord')} (${q('id')} varchar(255) primary key)`
		);
	});

const withMarker = (version: string) =>
	Effect.gen(function* () {
		const sql = yield* SqlClient.SqlClient;
		const q = yield* quoted;
		// `key` is reserved on MySQL, and the value column must be bounded to
		// be a primary key there.
		yield* sql.unsafe(
			`create table ${q('private_c15t_settings')} (${q('key')} varchar(255) primary key, ${q('value')} text)`
		);
		yield* sql`
			insert into ${sql('private_c15t_settings')} ${sql.insert({
				key: 'version',
				value: version,
			})}
		`;
	});

/**
 * Telling legacy from fumadb 1.0.0 by column type only works on Postgres.
 *
 * The distinction is `jsonb` against `json`, and it exists nowhere else:
 * SQLite collapses both to TEXT, and MySQL has no `jsonb` at all — which is
 * why classify answers by elimination there instead (§11.7). Running these
 * cases on the other engines would assert behaviour the code deliberately
 * does not have.
 */
const distinguishesByColumnType = (engine: (typeof ENGINES)[number]) =>
	engine.name === 'pglite' || engine.name === 'postgres';

for (const engine of ENGINES) {
	describe('classify', () => {
		it.effect(
			'reports Empty for a database with no c15t tables',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					const classification = yield* classify;
					assert.strictEqual(classification._tag, 'Empty');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'recognises our own baseline output as the 2.0.0 shape',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					// Expected, and worth stating: the baseline reproduces 2.0.0
					// exactly, so before the ledger is stamped it is indistinguishable
					// from an adopted 2.0.0 database. That is the whole point.
					yield* baseline;
					const classification = yield* classify;
					assert.strictEqual(classification._tag, 'Fumadb200');
					if (classification._tag === 'Fumadb200') {
						assert.isFalse(classification.hasMarker);
					}
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'reports Baseline once the ledger exists',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					const sql = yield* SqlClient.SqlClient;
					const q = yield* quoted;
					yield* baseline;
					yield* sql.unsafe(
						`create table ${q('c15t_migrations')} (${q('id')} integer primary key, ${q('name')} text)`
					);
					const classification = yield* classify;
					assert.strictEqual(classification._tag, 'Baseline');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		(distinguishesByColumnType(engine) ? it.effect : it.effect.skip)(
			'distinguishes legacy from fumadb 1.0.0 by column type when neither has a marker',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* sevenTables('jsonb');
					const classification = yield* classify;
					assert.strictEqual(classification._tag, 'Legacy');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		(distinguishesByColumnType(engine) ? it.effect : it.effect.skip)(
			'does not mistake an unmarked fumadb 1.0.0 database for legacy',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					// The ORM codegen path: c15t printed schema for the user to apply
					// with Drizzle/Prisma/TypeORM, so fumadb's migrator never ran and
					// never wrote a marker — but the schema is fumadb-shaped. Treating
					// this as legacy would converge it destructively.
					yield* sevenTables('json');
					const classification = yield* classify;
					assert.strictEqual(classification._tag, 'Fumadb100');
					if (classification._tag === 'Fumadb100') {
						assert.isFalse(classification.hasMarker);
					}
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'trusts the marker over schema inference when one is present',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* sevenTables('jsonb');
					yield* withMarker('1.0.0');
					const classification = yield* classify;
					assert.strictEqual(classification._tag, 'Fumadb100');
					if (classification._tag === 'Fumadb100') {
						assert.isTrue(classification.hasMarker);
					}
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'refuses to guess at a marker naming an unknown schema version',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* sevenTables('json');
					yield* withMarker('3.7.0');
					const classification = yield* classify;
					assert.strictEqual(classification._tag, 'Unknown');
					if (classification._tag === 'Unknown') {
						assert.include(classification.why, '3.7.0');
					}
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);
	});

	describe('a 2.x database created with tablePrefix', () => {
		it.effect(
			'refuses rather than reporting it empty',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					const sql = yield* SqlClient.SqlClient;
					// What `tablePrefix: 'acme_'` produced in 2.x.
					const q = yield* quoted;
					for (const table of ['subject', 'consent', 'domain']) {
						yield* sql.unsafe(
							`create table ${q(`acme_${table}`)} (${q('id')} varchar(255) primary key)`
						);
					}

					const classification = yield* classify;

					// Reporting Empty here is the dangerous answer, not a harmless one:
					// the migrator would create a parallel schema and leave every
					// existing consent record orphaned while the deployment came up
					// looking healthy.
					assert.strictEqual(classification._tag, 'Unknown');
					if (classification._tag === 'Unknown') {
						assert.include(classification.why, 'acme_');
						assert.include(classification.why, 'tablePrefix');
					}
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'is not fooled by one unrelated table that happens to end in a known name',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					const sql = yield* SqlClient.SqlClient;
					// Someone else's billing table. One match is not evidence.
					const q = yield* quoted;
					yield* sql.unsafe(
						`create table ${q('billing_consent')} (${q('id')} varchar(255) primary key)`
					);

					assert.strictEqual((yield* classify)._tag, 'Empty');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'still recognises an ordinary empty database',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					assert.strictEqual((yield* classify)._tag, 'Empty');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);
	});
}
