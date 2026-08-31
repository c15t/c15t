/**
 * The 2.0.0 schema, as the baseline every c15t database converges on.
 *
 * This is not a fresh design. It reproduces the physical shape that shipped
 * `@c15t/backend` 2.x already put in users' databases, verified column by
 * column against `internals/migration-fixtures/fixtures/fumadb-2.0.0/*.json`.
 * RFC 0004 freezes this schema until cutover, which is what makes the rewrite
 * behaviour-preserving and the benchmarks comparable.
 *
 * Two consequences of "reproduce, don't redesign":
 *
 * - A **fresh** install running this migration and an **adopted** 2.0.0
 *   database must introspect identically. `db/migrations/baseline.test.ts`
 *   asserts exactly that against the committed fixtures.
 * - Improvements to the schema — indexes the old code lacked, the missing
 *   `COUNT` for pagination, tighter types — belong after cutover, not here.
 *
 * The one deliberate divergence is `runtimePolicyDecision.dedupeKey`, which
 * has to be a bounded `varchar` on MySQL because MySQL cannot index `TEXT`
 * without a prefix length. That single constraint is why fumadb cannot migrate
 * MySQL at all (RFC 0004 §3.5); see `../dialect.ts`.
 *
 * **What is deliberately absent:** any index on a foreign key column. No
 * shipped version has one — the only non-primary indexes in any captured
 * fixture are `domain.name` (legacy) and `dedupeKey` (2.0.0) — and Postgres
 * does not create them implicitly. That is very likely the dominant scaling
 * problem in the current backend, but adding them here would mean a fresh
 * install no longer matches an adopted database, which is the one property
 * this migration exists to guarantee. They belong immediately after cutover,
 * measured by the §7 benchmark arms rather than assumed.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import * as Dialect from '../dialect';
import { createTableSql, TABLES } from '../schema';

/** Table names in creation order, for callers that need the order. */
export const TABLE_ORDER = TABLES.map((table) => table.name);

export const up = Effect.gen(function* up() {
	const sql = yield* SqlClient.SqlClient;
	const dialect = yield* Dialect.current;
	const types = Dialect.typesFor(dialect);
	const quote = Dialect.escaperFor(dialect);

	for (const table of TABLES) {
		yield* sql.unsafe(createTableSql(table, types, quote));
	}
});
