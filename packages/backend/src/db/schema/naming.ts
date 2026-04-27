import { v1 } from './1.0.0';
import { v2 } from './2.0.0';

const SCHEMAS = [v1, v2] as const;

/**
 * Per-table override for SQL/Mongo identifiers.
 */
export interface TableNaming {
	/** Database name for the table itself. */
	name?: string;
	/** Map of ORM column name to database column name. */
	fields?: Record<string, string>;
}

/**
 * Customize SQL table and column names.
 *
 * Backwards compatible: omitting `naming` keeps the historical camelCase
 * identifiers used by every prior c15t release.
 *
 * One knob: `tables` — a map of ORM table names to overrides. Provide it
 * directly or generate it via a built-in utility (e.g. {@link snakeCaseTables}).
 * Spread to combine bulk-generated and manual overrides.
 *
 * @example bulk via utility
 * ```ts
 * naming: { tables: snakeCaseTables() }
 * ```
 *
 * @example manual overrides
 * ```ts
 * naming: { tables: { consentPolicy: { name: 'consent_policies' } } }
 * ```
 *
 * @example bulk + carve-outs (just object spread)
 * ```ts
 * naming: {
 *   tables: {
 *     ...snakeCaseTables(),
 *     auditLog: { name: 'audit_trail' },
 *   },
 * }
 * ```
 */
export interface NamingOptions {
	/**
	 * Per-table database name overrides. Keys are the ORM table names
	 * defined in the c15t schema (`subject`, `consent`, `consentPolicy`,
	 * …). Use the supplied utilities ({@link snakeCaseTables},
	 * {@link lowerCaseTables}) to bulk-generate the map, or pass your own.
	 */
	tables?: Record<string, TableNaming>;
}

/**
 * Variant payload applied to a fumadb table or column.
 *
 * We override the database-level identifiers (`sql` for relational
 * adapters, `mongodb` for the Mongo adapter) but leave the ORM-level
 * identifiers (`drizzle`, `prisma`, `convex`) untouched — those drive
 * the generated TypeScript API, which intentionally stays camelCase.
 */
type DbNameVariant = { sql: string; mongodb: string };

/**
 * Build the `BuildNameVariants` map consumed by fumadb's `db.names()`
 * builder so every table and column DB identifier reflects the requested
 * naming options.
 *
 * Only the database-side identifiers (`sql` and `mongodb`) are changed.
 * The TypeScript API exposed by the c15t/fumadb ORM keeps the original
 * camelCase identifiers (`db.consent.findMany`, `subjectId`, …) so
 * application code is unaffected by the rename.
 *
 * Returns `null` when the options would not change any name, letting
 * callers skip the rebuild entirely (the historical fast path).
 */
export const buildNamingVariants = (
	options: NamingOptions | undefined
): Record<string, DbNameVariant> | null => {
	const tables = options?.tables;
	if (!tables) return null;

	const variants: Record<string, DbNameVariant> = {};
	let changed = false;

	for (const schema of SCHEMAS) {
		for (const [tableOrm, tableDef] of Object.entries(schema.tables)) {
			const override = tables[tableOrm];
			if (!override) continue;

			if (override.name && override.name !== tableOrm) {
				variants[tableOrm] = { sql: override.name, mongodb: override.name };
				changed = true;
			}

			if (override.fields) {
				for (const [colOrm, colDb] of Object.entries(override.fields)) {
					if (!(colOrm in tableDef.columns)) continue;
					if (colDb === colOrm) continue;
					variants[`${tableOrm}.${colOrm}`] = { sql: colDb, mongodb: colDb };
					changed = true;
				}
			}
		}
	}

	return changed ? variants : null;
};

const toSnakeCase = (input: string): string =>
	input
		.replace(/([a-z\d])([A-Z])/g, '$1_$2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
		.toLowerCase();

// Merge tables and columns across every known schema version so columns
// added in a newer version (or removed in a newer version but still present
// during legacy → latest migrations) all receive a renamed variant.
const buildTablesMap = (
	transform: (ormName: string) => string
): Record<string, TableNaming> => {
	const out: Record<string, TableNaming> = {};

	for (const schema of SCHEMAS) {
		for (const [tableOrm, tableDef] of Object.entries(schema.tables)) {
			const existing = out[tableOrm];
			const fields: Record<string, string> = existing?.fields ?? {};
			for (const colOrm of Object.keys(tableDef.columns)) {
				if (!(colOrm in fields)) {
					fields[colOrm] = transform(colOrm);
				}
			}
			out[tableOrm] = {
				name: existing?.name ?? transform(tableOrm),
				fields,
			};
		}
	}

	return out;
};

/**
 * Generate a `tables` map that snake_cases every c15t table and column.
 *
 * The map is computed against the current c15t schema at call time, so
 * new tables and columns introduced by future c15t releases are picked
 * up automatically.
 *
 * Call this at config load time (each boot) and pass the result directly
 * to `naming.tables`. Do not serialize/cache the returned object — a
 * stale snapshot will silently miss tables and columns added by future
 * c15t versions, leading to a half-renamed schema.
 *
 * @example
 * ```ts
 * naming: { tables: snakeCaseTables() }
 * ```
 *
 * @example combine with manual overrides via spread
 * ```ts
 * naming: {
 *   tables: {
 *     ...snakeCaseTables(),
 *     auditLog: { name: 'audit_trail' },
 *   },
 * }
 * ```
 */
export const snakeCaseTables = (): Record<string, TableNaming> =>
	buildTablesMap(toSnakeCase);

/**
 * Generate a `tables` map that lowercases every c15t table and column
 * without inserting separators.
 *
 * Call this at config load time (each boot) and pass the result directly
 * to `naming.tables`. Do not serialize/cache the returned object — a
 * stale snapshot will silently miss tables and columns added by future
 * c15t versions, leading to a half-renamed schema.
 *
 * @example
 * ```ts
 * naming: { tables: lowerCaseTables() }
 * ```
 */
export const lowerCaseTables = (): Record<string, TableNaming> =>
	buildTablesMap((name) => name.toLowerCase());
