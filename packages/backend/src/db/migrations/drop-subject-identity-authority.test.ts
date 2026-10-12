/**
 * Migration 5, on every engine: a fresh install ends without
 * `subject.identityAuthority`, a database migrated by the alpha version of
 * migration 3 loses the column but keeps its rows and its `privacyDirective`
 * table, and a re-run does nothing.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import { ENGINES, resetDatabase } from '../../__tests__/engines';
import * as Dialect from '../dialect';
import { addColumnSql, createTableSql } from '../schema';
import { encodeRow, encoder } from '../values';
import { up as baseline } from './1-baseline';
import { up as indexes } from './2-hot-path-indexes';
import { up as receipts } from './3-consent-receipts-and-privacy-directives';
import { up as vendors } from './4-vendor-choice';
import { up as dropAuthority } from './5-drop-subject-identity-authority';

const columnsOf = Effect.fn('columnsOf')(function* columnsOf(table: string) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
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
		sqlite: () =>
			sql<{ name: string }>`select name from pragma_table_info(${table})`,
	});
	return rows.map((row) => row.name).sort();
});

/**
 * What 3.0.0-alpha.0 to alpha.3 left behind: the link authority column on
 * `subject`, set on a stored row, and a `privacyDirective` table pointing at
 * that subject.
 */
const seedAlphaLeftovers = Effect.gen(function* seedAlphaLeftovers() {
	const sql = yield* SqlClient.SqlClient;
	const dialect = yield* Dialect.current;
	const types = Dialect.typesFor(dialect);
	const quote = Dialect.escaperFor(dialect);
	const encode = yield* encoder;

	yield* sql.unsafe(
		addColumnSql(
			'subject',
			{ name: 'identityAuthority', nullable: true, type: 'text' },
			types,
			quote
		)
	);
	yield* sql.unsafe(
		createTableSql(
			{
				columns: [
					{ name: 'id', nullable: false, type: 'id' },
					{ name: 'subjectId', nullable: true, type: 'indexedText' },
					{ name: 'categories', nullable: false, type: 'json' },
				],
				foreignKeys: [
					{
						column: 'subjectId',
						referencesColumn: 'id',
						referencesTable: 'subject',
					},
				],
				name: 'privacyDirective',
			},
			types,
			quote
		)
	);

	const now = new Date();
	yield* sql`
		insert into ${sql('subject')} ${sql.insert(
			encodeRow(encode, {
				createdAt: now,
				externalId: 'ext_1',
				id: 'sub_alpha',
				identityAuthority: 'api',
				identityProvider: 'auth0',
				updatedAt: now,
			})
		)}
	`;
	yield* sql`
		insert into ${sql('privacyDirective')} ${sql.insert(
			encodeRow(encode, {
				categories: JSON.stringify(['marketing']),
				id: 'pd_alpha',
				subjectId: 'sub_alpha',
			})
		)}
	`;
});

const migrateToFour = Effect.gen(function* migrateToFour() {
	yield* resetDatabase;
	yield* baseline;
	yield* indexes;
	yield* receipts;
	yield* vendors;
});

for (const engine of ENGINES) {
	describe(`drop subject identity authority migration on ${engine.name}`, () => {
		it.effect(
			'leaves a fresh install without the column',
			() =>
				Effect.gen(function* gen() {
					yield* migrateToFour;
					const before = yield* columnsOf('subject');
					assert.notInclude(before, 'identityAuthority');

					yield* dropAuthority;

					assert.deepStrictEqual(yield* columnsOf('subject'), before);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'drops the column from an alpha database and keeps everything else',
			() =>
				Effect.gen(function* gen() {
					yield* migrateToFour;
					yield* seedAlphaLeftovers;
					const before = yield* columnsOf('subject');
					assert.include(before, 'identityAuthority');

					yield* dropAuthority;

					assert.deepStrictEqual(
						yield* columnsOf('subject'),
						before.filter((column) => column !== 'identityAuthority')
					);

					const sql = yield* SqlClient.SqlClient;
					const subjects = yield* sql<{ externalId: string | null }>`
						select ${sql('externalId')} from ${sql('subject')}
						where ${sql('id')} = ${'sub_alpha'}
					`;
					assert.strictEqual(subjects[0]?.externalId, 'ext_1');

					// The orphaned table is left for the operator to drop.
					const directives = yield* sql<{ id: string }>`
						select ${sql('id')} from ${sql('privacyDirective')}
					`;
					assert.deepStrictEqual(
						directives.map((row) => row.id),
						['pd_alpha']
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'is idempotent',
			() =>
				Effect.gen(function* gen() {
					yield* migrateToFour;
					yield* seedAlphaLeftovers;
					yield* dropAuthority;
					const after = yield* columnsOf('subject');

					yield* dropAuthority;

					assert.deepStrictEqual(yield* columnsOf('subject'), after);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);
	});
}
