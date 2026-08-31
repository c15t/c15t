/**
 * Bringing any c15t database up to date, in one call.
 *
 * `db/adopt.ts` gets an existing database to the frozen 2.0.0 baseline and
 * stamps the ledger. That is the hard, one-time half. This is the ordinary
 * half around it: work out where the database is, adopt it if it is behind,
 * then apply whatever numbered migrations it has not seen.
 *
 * Until this existed there was no way to run migration 2 at all. Adoption
 * stamped `1-baseline` and stopped, so the hot-path indexes — the change worth
 * roughly 1.35× on the read path (RFC §11.5) — only ever ran in tests. A
 * migration that nothing invokes is not shipped.
 *
 * ## Why not Effect's `Migrator`
 *
 * `@effect/sql-*` each export one, and they are perfectly good. They also own
 * their own ledger table and resolve migrations by scanning a directory of
 * files at runtime.
 *
 * Neither fits. `adopt.ts` already writes `c15t_migrations`, and a second
 * ledger would mean two disagreeing answers to "what has been applied".
 * Directory scanning also does not survive bundling — this package ships as
 * `dist/index.js`, and a self-hoster's bundler will not carry a directory of
 * `.js` files that nothing imports.
 *
 * So migrations are an explicit array, imported statically, applied in order.
 * The list is short and the property that matters is that it is the *same*
 * list everywhere — the tests, the CLI and a programmatic call all walk this
 * one.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import type { SqlError } from 'effect/unstable/sql';

import { apply, LEDGER_TABLE, plan } from './adopt';
import type { ApplyOptions } from './adopt';
import { classify } from './classify';
import type { DatabaseClassification } from './classify';
import type { UnsupportedDialectError } from './dialect';
import { up as baselineUp } from './migrations/1-baseline';
import { up as indexesUp } from './migrations/2-hot-path-indexes';
import { encodeRow, encoder } from './values';

const DATABASE_CLASSIFICATION_KEY = 'shape' as const;

export interface Migration {
	/** Ledger id. Ordered, and never reused once shipped. */
	readonly id: number;
	readonly name: string;
	/**
	 * Resolving the dialect can fail as well as the SQL, so the error channel
	 * is wider than `SqlError` alone.
	 */
	readonly up: Effect.Effect<
		unknown,
		SqlError.SqlError | UnsupportedDialectError,
		SqlClient.SqlClient
	>;
}

/**
 * Every migration, in order.
 *
 * `1-baseline` is here for completeness and is applied by adoption rather than
 * by the loop below — reaching the baseline is what adoption *is*, and doing
 * it twice would try to create tables that exist.
 */
export const MIGRATIONS: readonly Migration[] = [
	{ id: 1, name: '1-baseline', up: baselineUp },
	{ id: 2, name: '2-hot-path-indexes', up: indexesUp },
];

export interface MigrateOptions extends ApplyOptions {
	/**
	 * Report what would happen and change nothing.
	 *
	 * The default is `false`, but every caller that runs against a database it
	 * did not create should offer it — this is the one code path in the
	 * package that touches other people's data.
	 */
	readonly dryRun?: boolean;
}

export interface MigrateReport {
	/** What the database looked like before anything ran. */
	readonly [DATABASE_CLASSIFICATION_KEY]: DatabaseClassification;
	/** Adoption steps applied, or that would be, reaching the baseline. */
	readonly adoption: readonly string[];
	/** Numbered migrations applied, or that would be, after the baseline. */
	readonly pending: readonly string[];
	/** Tables and columns kept because adoption never deletes. */
	readonly retained: readonly string[];
	/** Set when nothing ran because the database is not safe to migrate. */
	readonly blocked: string | undefined;
	/** False when this was a dry run. */
	readonly applied: boolean;
}

/**
 * Whether the ledger table exists.
 *
 * Asked before reading it, rather than reading it and treating the failure as
 * "empty". That would be the shorter code and it is not safe on SQLite:
 * `@effect/sql-sqlite-node` caches prepared statements by SQL text and caches
 * the *failures* too, so probing a table that does not exist yet poisons that
 * exact query for the life of the connection — it keeps failing after the
 * table is created. Verified directly; the same query with different
 * whitespace succeeds, which is what a cache-key collision looks like.
 *
 * `migrate` creates the ledger part-way through, so it is precisely the code
 * that would trip over this.
 */
const ledgerExists = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
		sqlite: () =>
			sql<{ name: string }>`
				select name from sqlite_master
				where type = 'table' and name = ${LEDGER_TABLE}
			`,
		mysql: () =>
			sql<{ name: string }>`
				select table_name as name from information_schema.tables
				where table_schema = database() and table_name = ${LEDGER_TABLE}
			`,
		orElse: () =>
			sql<{ name: string }>`
				select table_name as name from information_schema.tables
				where table_schema = current_schema() and table_name = ${LEDGER_TABLE}
			`,
	});
	return rows.length > 0;
});

/** Migration ids already recorded in the ledger. */
const appliedIds = Effect.gen(function* () {
	if (!(yield* ledgerExists)) {
		// The state of every database that has not been adopted yet.
		return new Set<number>();
	}

	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{ id: number | string }>`
		select ${sql('id')} from ${sql(LEDGER_TABLE)}
	`;
	return new Set(rows.map((row) => Number(row.id)));
});

const stamp = Effect.fn('migrate.stamp')(function* (migration: Migration) {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`
		insert into ${sql(LEDGER_TABLE)} ${sql.insert(
			encodeRow(yield* encoder, {
				id: migration.id,
				name: migration.name,
				appliedAt: new Date(),
			})
		)}
	`;
});

/**
 * Creates the configured Postgres schema if it is missing.
 *
 * A `search_path` naming a schema that does not exist leaves
 * `current_schema()` null, and every `create table` then fails with something
 * that does not mention schemas at all. Creating it is what a migration tool
 * is for — Flyway, Liquibase and Prisma all do the same — and it is a no-op
 * once it exists.
 *
 * Postgres only: MySQL scopes by database and SQLite by file, neither of
 * which a migrator should be creating behind the operator's back.
 */
const ensureSchema = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;

	yield* sql.onDialectOrElse({
		pg: () =>
			Effect.gen(function* () {
				const rows = yield* sql<{ schema: string | null }>`
					select current_schema() as ${sql('schema')}
				`;
				if (rows[0]?.schema !== null && rows[0]?.schema !== undefined) {
					return;
				}

				// `search_path` points somewhere that does not exist yet. Its head
				// is the name to create.
				const path = yield* sql<{ search_path: string }>`show search_path`;
				const head = (path[0]?.search_path ?? '')
					.split(',')[0]
					?.trim()
					.replace(/^"|"$/gu, '');

				if (!head || head === '$user') {
					return;
				}
				yield* sql.unsafe(`create schema if not exists "${head}"`);
			}),
		orElse: () => Effect.void,
	});
});

/**
 * Migrates a database to the current schema.
 *
 * Safe to re-run: a database already up to date does nothing and reports an
 * empty plan. Safe to run against an unknown one: it refuses and says why
 * rather than guessing (RFC §3.3).
 *
 * @example
 * ```ts
 * const report = yield* migrate({ dryRun: true });
 * if (report.blocked) {
 * 	// nothing ran; report.blocked says what is wrong
 * }
 * ```
 */
export const migrate = Effect.fn('db.migrate')(function* (
	options: MigrateOptions = {}
) {
	yield* ensureSchema;

	const classification = yield* classify;
	const adoption = yield* plan;

	// A blocked plan is reported, not attempted. The caller decides whether to
	// re-run with `skipForeignKeys`, which is the only blocker that can be
	// opted out of.
	const skippable =
		adoption.orphans.length > 0 && options.skipForeignKeys === true;
	if (adoption.blocked !== undefined && !skippable) {
		return {
			[DATABASE_CLASSIFICATION_KEY]: classification,
			adoption: [],
			pending: [],
			retained: adoption.retained,
			blocked: adoption.blocked,
			applied: false,
		} satisfies MigrateReport;
	}

	// Read before adopting: adoption stamps id 1, so asking afterwards would
	// always report the baseline as already applied and tell us nothing about
	// what the database looked like.
	const already = yield* appliedIds;
	const pending = MIGRATIONS.filter(
		(migration) => migration.id > 1 && !already.has(migration.id)
	);

	const adoptionSteps = adoption.steps.map((step) => step.description);

	if (options.dryRun === true) {
		return {
			[DATABASE_CLASSIFICATION_KEY]: classification,
			adoption: adoptionSteps,
			pending: pending.map((migration) => migration.name),
			retained: adoption.retained,
			blocked: undefined,
			applied: false,
		} satisfies MigrateReport;
	}

	if (adoptionSteps.length > 0) {
		yield* apply(adoption, options);
	}

	for (const migration of pending) {
		yield* migration.up;
		yield* stamp(migration);
	}

	return {
		[DATABASE_CLASSIFICATION_KEY]: classification,
		adoption: adoptionSteps,
		pending: pending.map((migration) => migration.name),
		retained: adoption.retained,
		blocked: undefined,
		applied: true,
	} satisfies MigrateReport;
});
