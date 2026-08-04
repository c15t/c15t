/**
 * Classification decides whether an upgrade is correct or destructive, so the
 * cases that matter most are the ambiguous ones — particularly a
 * fumadb-shaped database with no version marker, which an earlier draft of
 * RFC 0004 would have misfiled as legacy and converged destructively.
 */

import { PgliteClient } from '@effect/sql-pglite';
import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { classify } from './classify';
import { up as baseline } from './migrations/1-baseline';

const Pglite = PgliteClient.layer({});

/**
 * The seven tables legacy and fumadb 1.0.0 share, differing only in whether
 * `consent.metadata` is `jsonb` (legacy) or `json` (fumadb). Everything not
 * load-bearing for classification is omitted.
 */
const sevenTables = (metadataType: 'json' | 'jsonb') =>
	Effect.gen(function* () {
		const sql = yield* SqlClient.SqlClient;
		for (const table of [
			'subject',
			'domain',
			'consentPolicy',
			'consentPurpose',
			'auditLog',
		]) {
			yield* sql.unsafe(
				`create table "${table}" ("id" varchar(255) primary key)`
			);
		}
		yield* sql.unsafe(
			`create table "consent" ("id" varchar(255) primary key, "metadata" ${metadataType})`
		);
		yield* sql.unsafe(
			`create table "consentRecord" ("id" varchar(255) primary key)`
		);
	});

const withMarker = (version: string) =>
	Effect.gen(function* () {
		const sql = yield* SqlClient.SqlClient;
		yield* sql.unsafe(
			`create table "private_c15t_settings" ("key" text primary key, "value" text)`
		);
		yield* sql.unsafe(
			`insert into "private_c15t_settings" ("key", "value") values ('version', '${version}')`
		);
	});

describe('classify', () => {
	it.effect(
		'reports Empty for a database with no c15t tables',
		() =>
			Effect.gen(function* () {
				const shape = yield* classify;
				assert.strictEqual(shape._tag, 'Empty');
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'recognises our own baseline output as the 2.0.0 shape',
		() =>
			Effect.gen(function* () {
				// Expected, and worth stating: the baseline reproduces 2.0.0
				// exactly, so before the ledger is stamped it is indistinguishable
				// from an adopted 2.0.0 database. That is the whole point.
				yield* baseline;
				const shape = yield* classify;
				assert.strictEqual(shape._tag, 'Fumadb200');
				if (shape._tag === 'Fumadb200') {
					assert.isFalse(shape.hasMarker);
				}
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'reports Baseline once the ledger exists',
		() =>
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				yield* baseline;
				yield* sql.unsafe(
					`create table "c15t_migrations" ("id" integer primary key, "name" text)`
				);
				const shape = yield* classify;
				assert.strictEqual(shape._tag, 'Baseline');
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'distinguishes legacy from fumadb 1.0.0 by column type when neither has a marker',
		() =>
			Effect.gen(function* () {
				yield* sevenTables('jsonb');
				const shape = yield* classify;
				assert.strictEqual(shape._tag, 'Legacy');
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'does not mistake an unmarked fumadb 1.0.0 database for legacy',
		() =>
			Effect.gen(function* () {
				// The ORM codegen path: c15t printed schema for the user to apply
				// with Drizzle/Prisma/TypeORM, so fumadb's migrator never ran and
				// never wrote a marker — but the schema is fumadb-shaped. Treating
				// this as legacy would converge it destructively.
				yield* sevenTables('json');
				const shape = yield* classify;
				assert.strictEqual(shape._tag, 'Fumadb100');
				if (shape._tag === 'Fumadb100') {
					assert.isFalse(shape.hasMarker);
				}
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'trusts the marker over shape inference when one is present',
		() =>
			Effect.gen(function* () {
				yield* sevenTables('jsonb');
				yield* withMarker('1.0.0');
				const shape = yield* classify;
				assert.strictEqual(shape._tag, 'Fumadb100');
				if (shape._tag === 'Fumadb100') {
					assert.isTrue(shape.hasMarker);
				}
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'refuses to guess at a marker naming an unknown schema version',
		() =>
			Effect.gen(function* () {
				yield* sevenTables('json');
				yield* withMarker('3.7.0');
				const shape = yield* classify;
				assert.strictEqual(shape._tag, 'Unknown');
				if (shape._tag === 'Unknown') {
					assert.include(shape.why, '3.7.0');
				}
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);
});
