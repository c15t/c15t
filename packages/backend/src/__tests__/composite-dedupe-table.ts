/**
 * A `runtimePolicyDecision` table whose only dedupe index is the composite
 * `(tenantId, dedupeKey)`, the shape a hand-edited hosted schema had. The
 * migrator never creates it; tests use it to show the backend still saves
 * against it and that `migrate --plan` reports it.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import * as Dialect from '../db/dialect';
import { createTableSql, TABLES } from '../db/schema';

export const createCompositeDedupeTable = Effect.gen(
	function* createCompositeDedupeTable() {
		const sql = yield* SqlClient.SqlClient;
		const dialect = yield* Dialect.current;
		const quote = Dialect.escaperFor(dialect);
		const spec = TABLES.find((table) => table.name === 'runtimePolicyDecision');
		if (!spec) {
			return yield* Effect.die(new Error('runtimePolicyDecision spec missing'));
		}
		yield* sql.unsafe(
			createTableSql(
				{
					...spec,
					columns: spec.columns.map((column) =>
						column.name === 'dedupeKey' ? { ...column, unique: false } : column
					),
				},
				Dialect.typesFor(dialect),
				quote
			)
		);
		yield* sql.unsafe(
			`create unique index ${quote('decision_tenant_dedupe')} on ${quote(
				'runtimePolicyDecision'
			)} (${quote('tenantId')}, ${quote('dedupeKey')})`
		);
	}
);
