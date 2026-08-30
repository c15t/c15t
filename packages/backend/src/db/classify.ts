/**
 * Classifies the physical shape of a database before anything migrates it.
 *
 * This is the step that decides whether an upgrade is correct or destructive,
 * so it is deliberately conservative: it reports `unknown` rather than
 * guessing, and the caller refuses to proceed on `unknown` (RFC 0004 §3.3).
 *
 * ## Why not just read the version marker
 *
 * fumadb writes a `private_c15t_settings` row naming the schema version, and
 * where it exists it is authoritative. **Its absence is not evidence of
 * anything**, because at least three different populations lack it:
 *
 * - a legacy database, from the pre-2.0 `pkgs/migrations` era;
 * - an empty database;
 * - a database created through the `generateSchema()` ORM path, where c15t
 *   printed schema code for the user to apply with Drizzle/Prisma/TypeORM
 *   tooling. fumadb's migrator never ran, so it never wrote a marker — but
 *   the schema is fumadb-shaped.
 *
 * Treating "no marker" as "legacy" would run a legacy convergence against a
 * database already at 2.0.0. So classification falls back to schema shape, and the
 * committed fixtures make that a comparison rather than a heuristic.
 *
 * ## What distinguishes the shapes
 *
 * Verified against `internals/migration-fixtures`:
 *
 * - **2.0.0** has `runtimePolicyDecision` and no `consentRecord`.
 * - **Legacy and fumadb 1.0.0** carry the *same seven tables*, so the table
 *   set cannot separate them. They differ by column type: legacy emits
 *   `jsonb`/`text` where fumadb emits `json`/`varchar`, and they disagree on
 *   which columns have defaults.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import type { SqlError } from 'effect/unstable/sql';

/** A database classification the migrator knows how to handle. */
export type DatabaseClassification =
	/** No c15t tables at all — a fresh install. */
	| { readonly _tag: 'Empty' }
	/** Pre-2.0 `pkgs/migrations` era. No marker, no ledger. */
	| { readonly _tag: 'Legacy' }
	/** fumadb schema 1.0.0, from 1.8.x's opt-in `/v2` subpath. */
	| { readonly _tag: 'Fumadb100'; readonly hasMarker: boolean }
	/** fumadb schema 2.0.0, from 2.x, or applied via the ORM codegen path. */
	| { readonly _tag: 'Fumadb200'; readonly hasMarker: boolean }
	/** Already migrated by this package. */
	| { readonly _tag: 'Baseline' }
	/** Recognisably c15t, but not a shape we have a fixture for. */
	| {
			readonly _tag: 'Unknown';
			readonly tables: readonly string[];
			readonly why: string;
	  };

/** Tables that identify c15t, ignoring anything else in the database. */
const C15T_TABLES = new Set([
	'subject',
	'domain',
	'consentPolicy',
	'consentPurpose',
	'consent',
	'auditLog',
	'consentRecord',
	'runtimePolicyDecision',
]);

const MARKER = /(^|_)c15t_settings$/;

interface Observed {
	readonly tables: ReadonlySet<string>;
	readonly markerTable: string | undefined;
	readonly ledger: boolean;
	/**
	 * A prefix that c15t's tables appear to carry, if any.
	 *
	 * `@c15t/backend` 2.x had a `tablePrefix` option, so a shared database
	 * could hold `acme_subject` and `acme_consent` rather than `subject` and
	 * `consent`. Those tables are invisible to the exact-name match above, and
	 * without this the database looks **empty** — so migrating it would create
	 * a second, parallel schema and leave every existing consent record
	 * orphaned. Verified before fixing: `classification=Empty`, nothing blocked, eight
	 * tables to create alongside the five already holding data.
	 */
	readonly prefix: string | undefined;
}

/**
 * Looks for c15t's tables hiding behind a common prefix.
 *
 * Conservative on purpose. A lone `billing_consent` in someone's database is
 * not evidence of anything, so it takes **two** known table names sharing one
 * prefix — or fumadb's own marker table, which is unambiguous — before this
 * claims to have found a prefixed installation.
 */
function detectPrefix(all: readonly string[]): string | undefined {
	const counts = new Map<string, number>();

	for (const name of all) {
		for (const known of C15T_TABLES) {
			if (name.length > known.length && name.endsWith(known)) {
				const prefix = name.slice(0, name.length - known.length);
				counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
			}
		}
	}

	for (const [prefix, count] of counts) {
		// fumadb's marker under the same prefix settles it on its own.
		const hasMarker = all.some(
			(name) => name.startsWith(prefix) && MARKER.test(name)
		);
		if (count >= 2 || hasMarker) {
			return prefix;
		}
	}
	return undefined;
}

const observe = Effect.fn('classify.observe')(function* () {
	const sql = yield* SqlClient.SqlClient;

	const rows = yield* sql.onDialectOrElse({
		sqlite: () =>
			sql<{
				name: string;
			}>`select name from sqlite_master where type = 'table'`,
		mysql: () =>
			sql<{
				name: string;
			}>`select table_name as name from information_schema.tables where table_schema = database()`,
		orElse: () =>
			sql<{
				name: string;
			}>`select table_name as name from information_schema.tables where table_schema = current_schema() and table_type = 'BASE TABLE'`,
	});

	const all = rows.map((row) => row.name);
	const tables = new Set(all.filter((name) => C15T_TABLES.has(name)));
	return {
		tables,
		markerTable: all.find((name) => MARKER.test(name)),
		ledger: all.includes('c15t_migrations'),
		// Only interesting when the unprefixed names found nothing; a database
		// holding both is answering as itself.
		prefix: tables.size === 0 ? detectPrefix(all) : undefined,
	} satisfies Observed;
});

/**
 * Reads the schema version fumadb recorded, where it recorded one.
 *
 * Authoritative when present. Returns `undefined` when the marker table exists
 * but holds no version row, which is itself a signal that something
 * half-applied.
 */
const markerVersion = Effect.fn('classify.markerVersion')(function* (
	table: string
) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{ key: string; value: string }>`
		select ${sql('key')}, ${sql('value')} from ${sql(table)}
	`;
	return rows.find((row) => row.key === 'version')?.value;
});

/**
 * Distinguishes legacy from fumadb 1.0.0, which carry identical table sets.
 *
 * Uses `consent.metadata`: legacy declares it `jsonb` on Postgres, fumadb
 * declares it `json`. On SQLite both collapse to `TEXT`, so the two are
 * genuinely indistinguishable there by type — hence the marker check runs
 * first and this is only reached without one.
 */
const looksLikeFumadb = Effect.fn('classify.looksLikeFumadb')(function* () {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql.onDialectOrElse({
		orElse: () =>
			Effect.gen(function* () {
				const rows = yield* sql<{ data_type: string }>`
					select data_type from information_schema.columns
					where table_name = 'consent' and column_name = 'metadata'
				`;
				const type = rows[0]?.data_type?.toLowerCase();
				return type === undefined ? undefined : type === 'json';
			}),
		sqlite: () => Effect.succeed(undefined),
		// On MySQL the question does not arise: fumadb cannot migrate MySQL in
		// either era, so no fumadb-shaped MySQL database exists to confuse this
		// with. Both `fumadb-1.0.0/mysql` and `fumadb-2.0.0/mysql` fixtures
		// record a migration failure rather than a schema.
		//
		// Answering by column type would get it wrong rather than merely be
		// unhelpful: legacy MySQL declares `consent.metadata` as `json`, the
		// same as the `orElse` branch treats as proof of fumadb. Postgres is
		// where that test works, because legacy declares `jsonb` there.
		mysql: () => Effect.succeed(false),
	});
});

/**
 * Classifies the connected database.
 *
 * Never mutates anything. Safe to run against production, and intended to be
 * what `--dry-run` reports.
 */
export const classify: Effect.Effect<
	DatabaseClassification,
	SqlError.SqlError,
	SqlClient.SqlClient
> = Effect.gen(function* () {
	const observed = yield* observe();

	if (observed.tables.size === 0) {
		if (observed.prefix !== undefined) {
			// Refusing beats guessing, and here the guess is expensive: treating
			// this as empty creates a parallel schema and orphans every consent
			// record already in the database.
			return {
				_tag: 'Unknown',
				tables: [],
				why:
					`Found c15t tables prefixed with "${observed.prefix}", which is ` +
					"what @c15t/backend 2.x's `tablePrefix` option produced. c15t 3.0 " +
					'does not support prefixed tables, so migrating would create a ' +
					'second, empty schema beside your data rather than upgrade it. ' +
					'Rename the tables to drop the prefix before migrating.',
			} as const;
		}
		return { _tag: 'Empty' } as const;
	}

	if (observed.ledger) {
		return { _tag: 'Baseline' } as const;
	}

	const has = (table: string) => observed.tables.has(table);

	// 2.0.0 is unambiguous: it is the only shape with runtimePolicyDecision,
	// and the only one that dropped consentRecord.
	if (has('runtimePolicyDecision') && !has('consentRecord')) {
		return {
			_tag: 'Fumadb200',
			hasMarker: observed.markerTable !== undefined,
		} as const;
	}

	if (observed.markerTable) {
		const version = yield* markerVersion(observed.markerTable).pipe(
			Effect.orElseSucceed(() => undefined)
		);
		if (version === '1.0.0') {
			return { _tag: 'Fumadb100', hasMarker: true } as const;
		}
		if (version === '2.0.0') {
			return { _tag: 'Fumadb200', hasMarker: true } as const;
		}
		return {
			_tag: 'Unknown',
			tables: [...observed.tables].sort(),
			why: `A fumadb marker table exists but names schema version ${
				version ?? '<none>'
			}, which this migrator has no fixture for.`,
		} as const;
	}

	// No marker, no runtimePolicyDecision: legacy or an ORM-applied fumadb
	// 1.0.0. Same tables, different column types.
	const fumadbTypes = yield* looksLikeFumadb().pipe(
		Effect.orElseSucceed(() => undefined)
	);

	if (fumadbTypes === true) {
		return { _tag: 'Fumadb100', hasMarker: false } as const;
	}
	if (fumadbTypes === false) {
		return { _tag: 'Legacy' } as const;
	}

	return {
		_tag: 'Unknown',
		tables: [...observed.tables].sort(),
		why:
			'No version marker, and a legacy schema cannot be told apart from an ' +
			'ORM-applied fumadb 1.0.0 by column type here — SQLite collapses both ' +
			'to TEXT, and elsewhere the deciding column is missing. Re-run with ' +
			'--assume-shape to state which it is.',
	} as const;
});
