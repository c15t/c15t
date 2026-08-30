/**
 * Brings an existing c15t database up to the baseline, so Effect's `Migrator`
 * can take over from a known state.
 *
 * This is the one-time on-ramp described in RFC 0004 §3.3. Everything after it
 * is an ordinary numbered migration; this step exists only because a database
 * from a shipped release has no ledger and an unknown shape.
 *
 * ## Adoption is purely additive
 *
 * It creates tables and adds columns. It **never drops a table, drops a
 * column, or changes a column's type.**
 *
 * That is a deliberate constraint, not a limitation. Going from schema 1.0.0
 * to 2.0.0 removed columns that hold real user data — `consent.status`,
 * `consent.withdrawalReason`, `consentPolicy.content`,
 * `consentPurpose.legalBasis` — and dropped the `consentRecord` table
 * outright. On a consent management platform those are audit records and
 * withdrawal history. Silently discarding them during a package upgrade is not
 * a trade-off worth making, and there is no way to ask the operator mid-
 * migration.
 *
 * So an adopted database ends up as **baseline plus whatever it already had**.
 * The backend only ever reads columns in the spec, so the extras are inert.
 * The plan reports them under `retained` and the operator can drop them
 * deliberately, later, once they are satisfied nothing needs them.
 *
 * The practical consequence, which is worth stating plainly: a fresh install
 * and an adopted database are identical *in the columns the contract covers*,
 * not byte-identical. The parity that matters is the former.
 *
 * ## Foreign keys are validated before they are added
 *
 * The legacy migrator emitted foreign keys on Postgres and SQLite but **none
 * on MySQL**, so referential integrity in shipped c15t depends on which engine
 * the operator chose. Adding them to a MySQL database is therefore a migration
 * that can fail on pre-existing rows.
 *
 * Rather than discover that half-way through, every foreign key we would add
 * is counted first. Orphans mean the plan is blocked and reports exactly what
 * is wrong, before any DDL runs.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import type { SqlError } from 'effect/unstable/sql';

import { classify } from './classify';
import type { Shape } from './classify';
import * as Dialect from './dialect';
import { addColumnSql, createTableSql, TABLES } from './schema';
import type { ForeignKeySpec, TableSpec } from './schema';
import { encodeRow, encoder } from './values';

/** Name of the ledger this package owns, distinct from fumadb's marker. */
export const LEDGER_TABLE = 'c15t_migrations';

export interface AdoptionStep {
	readonly kind: 'create-table' | 'add-column' | 'add-foreign-key' | 'stamp';
	readonly description: string;
	readonly sql: string;
}

/** Rows that would violate a foreign key we are about to add. */
export interface OrphanReport {
	readonly table: string;
	readonly column: string;
	readonly referencesTable: string;
	readonly count: number;
}

export interface Plan {
	readonly shape: Shape;
	readonly steps: readonly AdoptionStep[];
	/** Tables and columns present in the database but not in the spec. */
	readonly retained: readonly string[];
	readonly orphans: readonly OrphanReport[];
	/** Set when the plan must not be applied. */
	readonly blocked: string | undefined;
}

interface Existing {
	readonly tables: ReadonlySet<string>;
	readonly columns: ReadonlyMap<string, ReadonlySet<string>>;
	readonly foreignKeys: ReadonlySet<string>;
}

const fkKey = (table: string, column: string) => `${table}.${column}`;

const observeExisting = Effect.fn('adopt.observe')(function* () {
	const sql = yield* SqlClient.SqlClient;

	const columnRows = yield* sql.onDialectOrElse({
		sqlite: () =>
			sql<{ table_name: string; column_name: string }>`
				select m.name as table_name, c.name as column_name
				from sqlite_master m
				join pragma_table_info(m.name) c
				where m.type = 'table'
			`,
		// Aliased explicitly. MySQL returns `information_schema` labels
		// uppercased (`TABLE_NAME`) whatever case the query used, so an
		// unaliased projection reads back as `undefined` here — which looks
		// exactly like an empty database, and would have adoption stamp a
		// legacy MySQL schema as baseline without adding a single column.
		mysql: () =>
			sql<{ table_name: string; column_name: string }>`
				select table_name as table_name, column_name as column_name
				from information_schema.columns
				where table_schema = database()
			`,
		orElse: () =>
			sql<{ table_name: string; column_name: string }>`
				select table_name, column_name from information_schema.columns
				where table_schema = current_schema()
			`,
	});

	const columns = new Map<string, Set<string>>();
	for (const row of columnRows) {
		const set = columns.get(row.table_name) ?? new Set<string>();
		set.add(row.column_name);
		columns.set(row.table_name, set);
	}

	// SQLite cannot add a foreign key to an existing table at all, so knowing
	// which already exist matters for more than tidiness there.
	const fkRows = yield* sql
		.onDialectOrElse({
			sqlite: () =>
				sql<{ table_name: string; column_name: string }>`
					select m.name as table_name, f."from" as column_name
					from sqlite_master m join pragma_foreign_key_list(m.name) f
					where m.type = 'table'
				`,
			mysql: () =>
				sql<{ table_name: string; column_name: string }>`
					select table_name as table_name, column_name as column_name
					from information_schema.key_column_usage
					where table_schema = database()
						and referenced_table_name is not null
				`,
			// Scoped to the current schema. `pg_constraint` is database-wide, so
			// without the namespace join a second c15t installation in another
			// schema of the same database — which `database.schema` now makes a
			// supported configuration — would look like foreign keys already
			// present here. Adoption would then skip adding them *and* skip the
			// orphan check that guards them.
			orElse: () =>
				sql<{ table_name: string; column_name: string }>`
					select cl.relname as table_name, att.attname as column_name
					from pg_constraint con
					join pg_class cl on cl.oid = con.conrelid
					join pg_namespace ns on ns.oid = cl.relnamespace
					join unnest(con.conkey) as k(attnum) on true
					join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
					where con.contype = 'f' and ns.nspname = current_schema()
				`,
		})
		.pipe(Effect.orElseSucceed(() => []));

	return {
		tables: new Set(columns.keys()),
		columns,
		foreignKeys: new Set(
			fkRows.map((row) => fkKey(row.table_name, row.column_name))
		),
	} satisfies Existing;
});

/** Counts rows that would violate a foreign key before it is added. */
const countOrphans = Effect.fn('adopt.countOrphans')(function* (
	table: TableSpec,
	fk: ForeignKeySpec
) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{ orphans: number | string }>`
		select count(*) as orphans
		from ${sql(table.name)} child
		left join ${sql(fk.referencesTable)} parent
			on ${sql(`parent.${fk.referencesColumn}`)} = ${sql(`child.${fk.column}`)}
		where ${sql(`child.${fk.column}`)} is not null
			and ${sql(`parent.${fk.referencesColumn}`)} is null
	`;
	return Number(rows[0]?.orphans ?? 0);
});

/**
 * Rows that would orphan against a table this plan creates.
 *
 * `countOrphans` joins the referenced table, which does not exist yet in that
 * case. It will be created empty, so every non-null value in the child column
 * is an orphan by definition.
 */
const countUnmatchable = Effect.fn('adopt.countUnmatchable')(function* (
	table: TableSpec,
	fk: ForeignKeySpec
) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{ orphans: number | string }>`
		select count(*) as orphans from ${sql(table.name)}
		where ${sql(fk.column)} is not null
	`;
	return Number(rows[0]?.orphans ?? 0);
});

/**
 * Works out what adoption would do, without doing any of it.
 *
 * Safe against production, and intended to be exactly what `--dry-run` prints.
 */
export const plan: Effect.Effect<Plan, SqlError.SqlError, SqlClient.SqlClient> =
	Effect.gen(function* () {
		const shape = yield* classify;
		const dialect = yield* Dialect.current.pipe(
			Effect.orElseSucceed(() => 'postgres' as const)
		);
		const types = Dialect.typesFor(dialect);
		const quote = Dialect.escaperFor(dialect);
		const existing = yield* observeExisting();

		if (shape._tag === 'Unknown') {
			return {
				shape,
				steps: [],
				retained: [],
				orphans: [],
				blocked: `Refusing to migrate an unrecognised database. ${shape.why}`,
			};
		}

		if (shape._tag === 'Baseline') {
			return {
				shape,
				steps: [],
				retained: [],
				orphans: [],
				blocked: undefined,
			};
		}

		const steps: AdoptionStep[] = [];
		// Held back and appended after the whole table loop. Steps are built
		// per table, so a foreign key on an existing table can otherwise be
		// emitted before the `create table` for the table it points at — which
		// depends on the order of `TABLES` rather than on anything meaningful.
		const foreignKeySteps: AdoptionStep[] = [];
		const orphans: OrphanReport[] = [];

		for (const table of TABLES) {
			if (!existing.tables.has(table.name)) {
				steps.push({
					kind: 'create-table',
					description: `Create "${table.name}"`,
					sql: createTableSql(table, types, quote),
				});
				continue;
			}

			const present = existing.columns.get(table.name) ?? new Set<string>();
			for (const column of table.columns) {
				if (present.has(column.name)) continue;
				steps.push({
					kind: 'add-column',
					description: `Add "${table.name}"."${column.name}"`,
					sql: addColumnSql(table.name, column, types, quote),
				});
			}

			// Only an already-existing table needs an ALTER for its foreign keys;
			// a freshly created one carries them inline.
			for (const fk of table.foreignKeys) {
				if (existing.foreignKeys.has(fkKey(table.name, fk.column))) continue;

				// A column or referenced table this plan is about to create counts
				// as present: both loops above run before these steps do. Skipping
				// on "does not exist yet" made the gap permanent, because a re-plan
				// after adoption classifies the database as Baseline and
				// short-circuits — so `consent.runtimePolicyDecisionId` never got
				// its foreign key at all, while a fresh install had it.
				const columnKnown =
					present.has(fk.column) ||
					table.columns.some((column) => column.name === fk.column);
				const referenceKnown =
					existing.tables.has(fk.referencesTable) ||
					TABLES.some((spec) => spec.name === fk.referencesTable);
				if (!columnKnown || !referenceKnown) continue;

				const count = yield* (
					!present.has(fk.column)
						? // The column is being added now, so every row is null and
							// nothing can orphan.
							Effect.succeed(0)
						: existing.tables.has(fk.referencesTable)
							? countOrphans(table, fk)
							: // The referenced table is created empty by this same plan,
								// so every non-null value in an existing column orphans.
								countUnmatchable(table, fk)
				).pipe(Effect.orElseSucceed(() => 0));
				if (count > 0) {
					orphans.push({
						table: table.name,
						column: fk.column,
						referencesTable: fk.referencesTable,
						count,
					});
					continue;
				}

				foreignKeySteps.push({
					kind: 'add-foreign-key',
					description: `Add foreign key "${table.name}"."${fk.column}" -> "${fk.referencesTable}"`,
					sql: `alter table ${quote(table.name)} add foreign key (${quote(
						fk.column
					)}) references ${quote(fk.referencesTable)}(${quote(
						fk.referencesColumn
					)})`,
				});
			}
		}

		// After every create-table and add-column, so a key can reference a
		// table this plan is about to create regardless of `TABLES` order.
		steps.push(...foreignKeySteps);

		steps.push({
			kind: 'stamp',
			description: 'Record the baseline in the migration ledger',
			sql: `create table if not exists ${quote(LEDGER_TABLE)} (${quote(
				'id'
			)} integer primary key, ${quote('name')} ${types.text} not null, ${quote(
				'appliedAt'
			)} ${types.timestamp} not null)`,
		});

		const specTables = new Set(TABLES.map((table) => table.name));
		const specColumns = new Map(
			TABLES.map((table) => [
				table.name,
				new Set(table.columns.map((column) => column.name)),
			])
		);
		const retained: string[] = [];
		for (const [table, columns] of existing.columns) {
			if (!specTables.has(table)) {
				if (table === 'consentRecord') {
					retained.push(
						`table "consentRecord" (dropped in schema 2.0.0; left in place rather than discarding consent history)`
					);
				}
				continue;
			}
			const known = specColumns.get(table);
			for (const column of columns) {
				if (!known?.has(column)) {
					retained.push(`"${table}"."${column}"`);
				}
			}
		}

		return {
			shape,
			steps,
			retained: retained.sort(),
			orphans,
			blocked:
				orphans.length > 0
					? `Refusing to add foreign keys: ${orphans
							.map(
								(orphan) =>
									`${orphan.count} row(s) in "${orphan.table}" reference a missing "${orphan.referencesTable}" via "${orphan.column}"`
							)
							.join('; ')}. Clean the data, or re-run with skipForeignKeys.`
					: undefined,
		};
	});

export interface ApplyOptions {
	/**
	 * Proceed without adding foreign keys when orphan rows block them.
	 *
	 * The deliberate escape hatch for a database — in practice a MySQL one,
	 * which never had foreign keys — whose existing rows cannot satisfy them.
	 */
	readonly skipForeignKeys?: boolean;
}

/**
 * Statement-level verbs that would destroy data.
 *
 * `AdoptionStep['kind']` already has no destructive member, but `sql` is a
 * free-form string — nothing in the type system stops a future edit putting a
 * `drop` into a step tagged `add-column`. This is the backstop that makes
 * "adoption never deletes anything" an enforced invariant rather than a
 * convention, on the one code path that runs against other people's data.
 *
 * Word boundaries matter: a column legitimately named `dropdown` must not trip
 * it, and does not.
 */
const DESTRUCTIVE = /\b(drop|truncate)\b|\bdelete\s+from\b/i;

/** Applies a plan. Refuses a blocked one unless the blocker is opted out of. */
export const apply = Effect.fn('adopt.apply')(function* (
	adoption: Plan,
	options: ApplyOptions = {}
) {
	const sql = yield* SqlClient.SqlClient;

	const destructive = adoption.steps.filter((step) =>
		DESTRUCTIVE.test(step.sql)
	);
	if (destructive.length > 0) {
		return yield* Effect.die(
			new Error(
				'Adoption is add-only and must never delete. Refusing to run: ' +
					destructive.map((step) => step.description).join('; ')
			)
		);
	}

	const skippable =
		adoption.orphans.length > 0 && options.skipForeignKeys === true;
	if (adoption.blocked !== undefined && !skippable) {
		return yield* Effect.die(new Error(adoption.blocked));
	}

	const steps = options.skipForeignKeys
		? adoption.steps.filter((step) => step.kind !== 'add-foreign-key')
		: adoption.steps;

	for (const step of steps) {
		yield* sql.unsafe(step.sql);
	}

	yield* sql`
		insert into ${sql(LEDGER_TABLE)} ${sql.insert(
			encodeRow(yield* encoder, {
				id: 1,
				name: '1-baseline',
				appliedAt: new Date(),
			})
		)}
	`.pipe(
		// Re-running adoption should not fail on the ledger row it already
		// wrote. Idempotency matters here: RFC §3.3 requires the step be safe
		// to re-run after a mid-flight failure.
		Effect.orElseSucceed(() => [])
	);

	return steps.length;
});
