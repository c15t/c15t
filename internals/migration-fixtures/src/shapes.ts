/**
 * The database shapes that exist in the wild, and the published package that
 * produces each one.
 *
 * See `internals/rfcs/0004-backend-effect-rewrite.md` §3.1 for why there are
 * three eras rather than two. In short: 1.0.x–1.8.x shipped a legacy
 * introspection-diff migrator at the root export, 1.8.x *additionally* shipped
 * an opt-in `/v2` subpath backed by fumadb at schema 1.0.0, and 2.x promoted
 * that surface to the root at schema 2.0.0.
 */

/** How a given package era exposes its migrator. */
export type MigratorEra =
	/** `getMigrations(options)` from `@c15t/backend/pkgs/migrations`. */
	| 'legacy'
	/** `migrator({ db, schema })` from `@c15t/backend/v2/db/migrator`. */
	| 'fumadb-v2-subpath'
	/** `migrator({ db, schema })` from `@c15t/backend/db/migrator`. */
	| 'fumadb-root';

export interface Shape {
	/** Directory name under `fixtures/`. */
	readonly name: string;
	/**
	 * Published versions applied in order against the same database. Most
	 * shapes are a single fresh install; `legacy-upgraded` walks a database
	 * through several releases the way a long-lived deployment did.
	 */
	readonly versions: readonly string[];
	readonly era: MigratorEra;
	/** Why this shape exists — copied into the fixture manifest. */
	readonly rationale: string;
	/**
	 * Engines this shape provably cannot be produced on, with the observed
	 * reason. Recorded rather than silently skipped: "this release could never
	 * migrate this engine" is a fact the v3 migrator needs, not a gap in
	 * coverage.
	 */
	readonly unsupported?: Readonly<Record<string, string>>;
}

/**
 * Both fumadb eras fail to migrate a blank MySQL database. fumadb maps a
 * `string` column to MySQL `TEXT` and then puts an index on it, and MySQL
 * requires a prefix length to index TEXT/BLOB. Different eras trip over
 * different columns — `domain.name` at schema 1.0.0, and
 * `runtimePolicyDecision.dedupeKey` at 2.0.0 — but the cause is the same.
 *
 * Reproduced on fumadb 0.2.2 (pinned by 2.1.0) *and* 0.3.0 (pinned by this
 * repo on the v3 line), so it is not fixed upstream. The implication is that
 * fumadb-managed MySQL databases most likely do not exist in the wild: the
 * documented migrator could never have created one.
 */
const FUMADB_MYSQL_FAILURE =
	'fumadb migration fails on MySQL: "BLOB/TEXT column used in key specification without a key length". fumadb maps string columns to TEXT and indexes them; MySQL needs a prefix length. Trips on domain.name at schema 1.0.0 and runtimePolicyDecision.dedupeKey at 2.0.0. Reproduced on fumadb 0.2.2 and 0.3.0.';

export const SHAPES: readonly Shape[] = [
	{
		name: 'legacy-fresh-1.0',
		versions: ['1.0.0'],
		era: 'legacy',
		rationale:
			'Earliest published release. The floor of what a legacy database can look like.',
	},
	{
		name: 'legacy-fresh-1.8',
		versions: ['1.8.6'],
		era: 'legacy',
		rationale:
			'Last legacy release, installed fresh. Contrast with legacy-upgraded to expose drift.',
	},
	{
		name: 'legacy-upgraded',
		versions: ['1.0.0', '1.4.2', '1.8.6'],
		era: 'legacy',
		rationale:
			'A database created at 1.0 and walked forward. The legacy migrator only ever added tables and columns (RFC §3.2), so this can retain columns a fresh 1.8 install never had. Cannot be reproduced from any schema definition in the repo.',
	},
	{
		name: 'fumadb-1.0.0',
		versions: ['1.8.6'],
		era: 'fumadb-v2-subpath',
		rationale:
			'The opt-in /v2 path shipped inside 1.8.x. Writes c15t_settings = 1.0.0.',
		unsupported: { mysql: FUMADB_MYSQL_FAILURE },
	},
	{
		name: 'fumadb-2.0.0',
		versions: ['2.1.0'],
		era: 'fumadb-root',
		rationale: 'Current shipping shape. Writes c15t_settings = 2.0.0.',
		unsupported: { mysql: FUMADB_MYSQL_FAILURE },
	},
] as const;

export function shapeByName(name: string): Shape {
	const shape = SHAPES.find((candidate) => candidate.name === name);
	if (!shape) {
		const known = SHAPES.map((candidate) => candidate.name).join(', ');
		throw new Error(`Unknown shape "${name}". Known shapes: ${known}`);
	}
	return shape;
}
