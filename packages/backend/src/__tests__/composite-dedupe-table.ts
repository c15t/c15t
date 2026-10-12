/**
 * `runtimePolicyDecision` tables indexed differently from the migrator's.
 *
 * The composite `(tenantId, dedupeKey)` index is the shape a hand-edited
 * hosted schema had. The migrator never creates any of these; tests use them
 * to show the backend still saves against them and that `migrate --plan`
 * reports them. `jurisdiction` is nullable, as migration 7 leaves it.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import * as Dialect from '../db/dialect';
import { createTableSql, TABLES } from '../db/schema';

/** The decision table with no unique index on `dedupeKey` at all. */
export const createUnindexedDecisionTable = Effect.gen(
	function* createUnindexedDecisionTable() {
		const sql = yield* SqlClient.SqlClient;
		const dialect = yield* Dialect.current;
		const spec = TABLES.find((table) => table.name === 'runtimePolicyDecision');
		if (!spec) {
			return yield* Effect.die(new Error('runtimePolicyDecision spec missing'));
		}
		yield* sql.unsafe(
			createTableSql(
				{
					...spec,
					columns: spec.columns.map((column) => {
						if (column.name === 'dedupeKey') {
							return { ...column, unique: false };
						}
						if (column.name === 'jurisdiction') {
							return { ...column, nullable: true };
						}
						return column;
					}),
				},
				Dialect.typesFor(dialect),
				Dialect.escaperFor(dialect)
			)
		);
	}
);

/** The decision table whose only dedupe index is `(tenantId, dedupeKey)`. */
export const createCompositeDedupeTable = Effect.gen(
	function* createCompositeDedupeTable() {
		const sql = yield* SqlClient.SqlClient;
		const quote = Dialect.escaperFor(yield* Dialect.current);
		yield* createUnindexedDecisionTable;
		yield* sql.unsafe(
			`create unique index ${quote('decision_tenant_dedupe')} on ${quote(
				'runtimePolicyDecision'
			)} (${quote('tenantId')}, ${quote('dedupeKey')})`
		);
	}
);
