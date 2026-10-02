/**
 * `findSchemaDrift` on every engine: quiet for a database the migrator
 * built or one with no tables yet, and naming the missing `dedupeKey` index
 * on a table whose unique indexes do not cover `dedupeKey` alone.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import {
	createCompositeDedupeTable,
	createUnindexedDecisionTable,
} from '../__tests__/composite-dedupe-table';
import { ENGINES, resetDatabase } from '../__tests__/engines';
import * as Dialect from './dialect';
import { findSchemaDrift, missingDedupeIndex } from './drift';
import { migrate } from './migrate';

/** Adds a unique index to the decision table, written per dialect. */
const addIndex = (parts: { readonly mysql: string; readonly orElse: string }) =>
	Effect.gen(function* createIndex() {
		const sql = yield* SqlClient.SqlClient;
		const dialect = yield* Dialect.current;
		const quote = Dialect.escaperFor(dialect);
		yield* sql.unsafe(
			`create unique index ${quote('decision_custom')} on ${quote(
				'runtimePolicyDecision'
			)} ${dialect === 'mysql' ? parts.mysql : parts.orElse}`
		);
	});

for (const engine of ENGINES) {
	describe(`findSchemaDrift on ${engine.name}`, () => {
		it.effect(
			'reports nothing before the tables exist',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					assert.deepStrictEqual(yield* findSchemaDrift, []);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'reports nothing for a database the migrator built',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					const report = yield* migrate();
					assert.deepStrictEqual(report.drift, []);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 120_000 }
		);

		it.effect(
			'reports a dedupe index that only covers (tenantId, dedupeKey)',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* createCompositeDedupeTable;
					assert.deepStrictEqual(yield* findSchemaDrift, [
						missingDedupeIndex(yield* Dialect.current),
					]);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'reports an index that adds an expression to dedupeKey',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* createUnindexedDecisionTable;
					yield* addIndex({
						mysql: '(`dedupeKey`, (char_length(`model`)))',
						orElse: '("dedupeKey", length("model"))',
					});
					assert.deepStrictEqual(yield* findSchemaDrift, [
						missingDedupeIndex(yield* Dialect.current),
					]);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		if (engine.name === 'mysql') {
			it.effect(
				'reports a unique index on a prefix of dedupeKey',
				() =>
					Effect.gen(function* gen() {
						yield* resetDatabase;
						yield* createUnindexedDecisionTable;
						yield* addIndex({ mysql: '(`dedupeKey`(8))', orElse: '' });
						assert.lengthOf(yield* findSchemaDrift, 1);
					}).pipe(Effect.provide(engine.layer)),
				{ timeout: 60_000 }
			);
		}

		if (engine.name === 'pglite' || engine.name === 'postgres') {
			it.effect(
				'reports a deferrable unique constraint on dedupeKey',
				() =>
					Effect.gen(function* gen() {
						yield* resetDatabase;
						yield* createUnindexedDecisionTable;
						const sql = yield* SqlClient.SqlClient;
						yield* sql.unsafe(
							'alter table "runtimePolicyDecision" add constraint "decision_dedupe_deferrable" unique ("dedupeKey") deferrable'
						);
						assert.lengthOf(yield* findSchemaDrift, 1);
					}).pipe(Effect.provide(engine.layer)),
				{ timeout: 60_000 }
			);

			it.effect(
				'accepts a unique index on dedupeKey with included columns',
				() =>
					Effect.gen(function* gen() {
						yield* resetDatabase;
						yield* createUnindexedDecisionTable;
						yield* addIndex({
							mysql: '',
							orElse: '("dedupeKey") include ("model")',
						});
						assert.deepStrictEqual(yield* findSchemaDrift, []);
					}).pipe(Effect.provide(engine.layer)),
				{ timeout: 60_000 }
			);
		}
	});
}

describe('missingDedupeIndex', () => {
	it('builds the index concurrently on Postgres only', () => {
		assert.include(
			missingDedupeIndex('postgres'),
			'create unique index concurrently "runtimePolicyDecision_dedupeKey_key"'
		);
		assert.include(
			missingDedupeIndex('mysql'),
			'create unique index `runtimePolicyDecision_dedupeKey_key`'
		);
		assert.notInclude(missingDedupeIndex('sqlite'), 'concurrently');
	});
});
