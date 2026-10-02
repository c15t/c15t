/**
 * Migration 7, on every engine: `runtimePolicyDecision.jurisdiction` becomes
 * nullable, existing rows and their consents survive, the dedupe constraint
 * and indexes survive, and a re-run does nothing. On SQLite it also rebuilds
 * a table in the shape 2.0.0 created.
 */

import { loadFixture } from '@c15t/migration-fixtures';
import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import { ENGINES, resetDatabase } from '../../__tests__/engines';
import { encodeRow, encoder } from '../values';
import { up as baseline } from './1-baseline';
import { up as indexes } from './2-hot-path-indexes';
import { up as receipts } from './3-consent-receipts-and-privacy-directives';
import { up as vendors } from './4-vendor-choice';
import { up as dropAuthority } from './5-drop-subject-identity-authority';
import { up as attribution } from './6-experiment-attribution';
import {
	up as optionalJurisdiction,
	relaxJurisdictionSql,
} from './7-optional-decision-jurisdiction';

const isNullable = Effect.gen(function* isNullable() {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
		mysql: () =>
			sql<{ nullable: string }>`
				select is_nullable as nullable from information_schema.columns
				where table_schema = database()
					and table_name = 'runtimePolicyDecision'
					and column_name = 'jurisdiction'
			`,
		orElse: () =>
			sql<{ nullable: string }>`
				select is_nullable as nullable from information_schema.columns
				where table_schema = current_schema()
					and table_name = 'runtimePolicyDecision'
					and column_name = 'jurisdiction'
			`,
		sqlite: () =>
			sql<{ nullable: string }>`
				select case when "notnull" = 0 then 'YES' else 'NO' end as nullable
				from pragma_table_info('runtimePolicyDecision')
				where name = 'jurisdiction'
			`,
	});
	return rows[0]?.nullable === 'YES';
});

const indexNames = Effect.gen(function* indexNames() {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
		mysql: () =>
			sql<{ name: string }>`
				select distinct index_name as name from information_schema.statistics
				where table_schema = database() and table_name = 'runtimePolicyDecision'
			`,
		orElse: () =>
			sql<{ name: string }>`
				select indexname as name from pg_indexes
				where schemaname = current_schema()
					and tablename = 'runtimePolicyDecision'
			`,
		sqlite: () =>
			sql<{ name: string }>`
				select name from sqlite_master
				where type = 'index' and tbl_name = 'runtimePolicyDecision'
			`,
	});
	return rows.map((row) => row.name).sort();
});

const decision = (
	id: string,
	dedupeKey: string,
	jurisdiction: string | null
) => ({
	createdAt: new Date(),
	dedupeKey,
	fingerprint: 'fp_1',
	id,
	jurisdiction,
	matchedBy: 'country',
	model: 'opt-in',
	policyId: 'pol_1',
});

const insertDecision = Effect.fn('insertDecision')(function* insertDecision(
	row: ReturnType<typeof decision>
) {
	const sql = yield* SqlClient.SqlClient;
	const encode = yield* encoder;
	yield* sql`
		insert into ${sql('runtimePolicyDecision')} ${sql.insert(
			encodeRow(encode, row)
		)}
	`;
});

/** A 2.x decision and a consent that cites it. */
const seed2x = Effect.gen(function* seed2x() {
	const sql = yield* SqlClient.SqlClient;
	const encode = yield* encoder;
	const now = new Date();
	yield* sql`
		insert into ${sql('subject')} ${sql.insert(
			encodeRow(encode, { createdAt: now, id: 'sub_1', updatedAt: now })
		)}
	`;
	yield* sql`
		insert into ${sql('domain')} ${sql.insert(
			encodeRow(encode, {
				createdAt: now,
				id: 'dom_1',
				name: 'example.com',
				updatedAt: now,
			})
		)}
	`;
	yield* insertDecision(decision('rpd_2x', 'legacy-key', 'GDPR'));
	yield* sql`
		insert into ${sql('consent')} ${sql.insert(
			encodeRow(encode, {
				domainId: 'dom_1',
				givenAt: now,
				id: 'cns_1',
				purposeIds: JSON.stringify([]),
				runtimePolicyDecisionId: 'rpd_2x',
				subjectId: 'sub_1',
			})
		)}
	`;
});

const migrateToSix = Effect.gen(function* migrateToSix() {
	yield* resetDatabase;
	yield* baseline;
	yield* indexes;
	yield* receipts;
	yield* vendors;
	yield* dropAuthority;
	yield* attribution;
});

for (const engine of ENGINES) {
	describe(`optional decision jurisdiction migration on ${engine.name}`, () => {
		it.effect(
			'makes the column nullable and keeps rows, consents and indexes',
			() =>
				Effect.gen(function* gen() {
					yield* migrateToSix;
					yield* seed2x;
					assert.isFalse(yield* isNullable);
					const indexesBefore = yield* indexNames;

					yield* optionalJurisdiction;

					assert.isTrue(yield* isNullable);
					assert.deepStrictEqual(yield* indexNames, indexesBefore);

					const sql = yield* SqlClient.SqlClient;
					const rows = yield* sql<{ id: string; jurisdiction: string | null }>`
						select ${sql('id')}, ${sql('jurisdiction')}
						from ${sql('runtimePolicyDecision')}
					`;
					assert.deepStrictEqual(rows, [
						{ id: 'rpd_2x', jurisdiction: 'GDPR' },
					]);
					const consents = yield* sql<{ runtimePolicyDecisionId: string }>`
						select ${sql('runtimePolicyDecisionId')} from ${sql('consent')}
					`;
					assert.deepStrictEqual(consents, [
						{ runtimePolicyDecisionId: 'rpd_2x' },
					]);

					yield* insertDecision(decision('rpd_v3', 'v3-key', null));
					// The unique constraint on dedupeKey survives the rebuild.
					const duplicate = yield* Effect.result(
						insertDecision(decision('rpd_dup', 'v3-key', null))
					);
					assert.strictEqual(duplicate._tag, 'Failure');
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'is idempotent',
			() =>
				Effect.gen(function* gen() {
					yield* migrateToSix;
					yield* seed2x;
					yield* optionalJurisdiction;
					const indexesAfter = yield* indexNames;

					yield* optionalJurisdiction;

					assert.isTrue(yield* isNullable);
					assert.deepStrictEqual(yield* indexNames, indexesAfter);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		if (engine.name === 'sqlite') {
			it.effect(
				'rebuilds the table 2.0.0 created, keeping its own index',
				() =>
					Effect.gen(function* gen() {
						const loaded = yield* Effect.promise(() =>
							loadFixture('fumadb-2.0.0', 'sqlite')
						);
						if (loaded.kind !== 'captured') {
							return assert.fail('expected a captured fixture');
						}
						const statements = loaded.fixture.applied
							.flatMap((step) => step.sql.split(/;\s*\n/u))
							.map((statement) => statement.trim())
							.filter((statement) =>
								/^create (?:table|unique index \S+ on) "runtimePolicyDecision"/u.test(
									statement
								)
							);
						assert.lengthOf(statements, 2);

						yield* resetDatabase;
						const sql = yield* SqlClient.SqlClient;
						for (const statement of statements) {
							yield* sql.unsafe(statement);
						}
						yield* insertDecision(decision('rpd_2x', 'legacy-key', 'GDPR'));

						yield* optionalJurisdiction;

						assert.isTrue(yield* isNullable);
						assert.include(
							yield* indexNames,
							'unique_c_runtimePolicyDecision_dedupeKey'
						);
						const rows = yield* sql<{ jurisdiction: string | null }>`
							select ${sql('jurisdiction')} from ${sql('runtimePolicyDecision')}
						`;
						assert.deepStrictEqual(rows, [{ jurisdiction: 'GDPR' }]);
					}).pipe(Effect.provide(engine.layer)),
				{ timeout: 60_000 }
			);

			it.effect(
				"keeps views and other tables' triggers that reference the table",
				() =>
					Effect.gen(function* gen() {
						yield* migrateToSix;
						yield* seed2x;
						const sql = yield* SqlClient.SqlClient;
						yield* sql.unsafe(
							'create view "decisionIds" as select "id" from "runtimePolicyDecision"'
						);
						yield* sql.unsafe(
							'create trigger "consent_touch" after update on "consent" begin select count(*) from "runtimePolicyDecision"; end'
						);

						yield* optionalJurisdiction;

						const ids = yield* sql<{ id: string }>`
							select ${sql('id')} from ${sql('decisionIds')}
						`;
						assert.deepStrictEqual(ids, [{ id: 'rpd_2x' }]);
						yield* sql.unsafe('update "consent" set "uiSource" = \'banner\'');
					}).pipe(Effect.provide(engine.layer)),
				{ timeout: 60_000 }
			);

			it.effect(
				'is not blocked by an orphan the database already had',
				() =>
					Effect.gen(function* gen() {
						yield* migrateToSix;
						yield* seed2x;
						const sql = yield* SqlClient.SqlClient;
						const encode = yield* encoder;
						// An orphan written while foreign keys were off, unrelated to
						// the decision table.
						yield* sql.unsafe('pragma foreign_keys = off');
						yield* sql`
							insert into ${sql('consent')} ${sql.insert(
								encodeRow(encode, {
									domainId: 'dom_missing',
									givenAt: new Date(),
									id: 'cns_orphan',
									purposeIds: JSON.stringify([]),
									subjectId: 'sub_1',
								})
							)}
						`;
						yield* sql.unsafe('pragma foreign_keys = on');

						yield* optionalJurisdiction;

						assert.isTrue(yield* isNullable);
					}).pipe(Effect.provide(engine.layer)),
				{ timeout: 60_000 }
			);

			it.effect(
				"stops rather than drop a table that already has the copy's name",
				() =>
					Effect.gen(function* gen() {
						yield* migrateToSix;
						yield* seed2x;
						const sql = yield* SqlClient.SqlClient;
						yield* sql.unsafe(
							'create table "runtimePolicyDecision_migration_7" ("note" text)'
						);
						yield* sql.unsafe(
							'insert into "runtimePolicyDecision_migration_7" ("note") values (\'keep\')'
						);

						const result = yield* Effect.exit(optionalJurisdiction);

						assert.isTrue(result._tag === 'Failure');
						const notes = yield* sql<{ note: string }>`
							select ${sql('note')} from ${sql('runtimePolicyDecision_migration_7')}
						`;
						assert.deepStrictEqual(notes, [{ note: 'keep' }]);
						assert.isFalse(yield* isNullable);
					}).pipe(Effect.provide(engine.layer)),
				{ timeout: 60_000 }
			);

			it.effect(
				'keeps triggers attached to the table',
				() =>
					Effect.gen(function* gen() {
						yield* migrateToSix;
						const sql = yield* SqlClient.SqlClient;
						yield* sql.unsafe(
							'create table "decisionAudit" ("decisionId" text not null)'
						);
						yield* sql.unsafe(
							'create trigger "audit_decision" after insert on "runtimePolicyDecision" begin insert into "decisionAudit" ("decisionId") values (new."id"); end'
						);

						yield* optionalJurisdiction;
						yield* insertDecision(decision('rpd_v3', 'v3-key', null));

						const audited = yield* sql<{ decisionId: string }>`
							select ${sql('decisionId')} from ${sql('decisionAudit')}
						`;
						assert.deepStrictEqual(audited, [{ decisionId: 'rpd_v3' }]);
					}).pipe(Effect.provide(engine.layer)),
				{ timeout: 60_000 }
			);
		}
	});
}

describe('relaxJurisdictionSql', () => {
	it('drops not null from jurisdiction only and renames the table', () => {
		const relaxed = relaxJurisdictionSql(
			'create table "runtimePolicyDecision" ("id" text not null primary key, "jurisdiction" text not null, "model" text not null)',
			'copy'
		);
		assert.strictEqual(
			relaxed,
			'create table "copy" ("id" text not null primary key, "jurisdiction" text, "model" text not null)'
		);
	});

	it('drops if not exists, so the copy is always a new table', () => {
		assert.strictEqual(
			relaxJurisdictionSql(
				'create table if not exists "runtimePolicyDecision" ("id" text not null primary key, "jurisdiction" text not null)',
				'copy'
			),
			'create table "copy" ("id" text not null primary key, "jurisdiction" text)'
		);
	});

	it('refuses a statement it does not recognise', () => {
		assert.throws(() =>
			relaxJurisdictionSql('create table "other" ("id" text)', 'copy')
		);
	});
});
