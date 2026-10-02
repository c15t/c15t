/**
 * `findSchemaDrift` on every engine: quiet for a database the migrator
 * built or one with no tables yet, and naming the missing `dedupeKey` index
 * on a table indexed only on `(tenantId, dedupeKey)`.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';

import { createCompositeDedupeTable } from '../__tests__/composite-dedupe-table';
import { ENGINES, resetDatabase } from '../__tests__/engines';
import * as Dialect from './dialect';
import { findSchemaDrift, missingDedupeIndex } from './drift';
import { migrate } from './migrate';

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
					const quote = Dialect.escaperFor(yield* Dialect.current);
					assert.deepStrictEqual(yield* findSchemaDrift, [
						missingDedupeIndex(quote),
					]);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);
	});
}
