import type { AnySchema, NameVariants } from 'fumadb/schema';
import { v1 } from './1.0.0';
import { v2 } from './2.0.0';

const SCHEMAS = [v1, v2] as const;
const DB_NAME_VARIANTS = ['sql', 'mongodb'] as const;

type DbNameVariantKey = (typeof DB_NAME_VARIANTS)[number];
type StoredNameVariants = Record<string, Partial<NameVariants>>;

export type NamingMismatchRecovery = 'error' | 'adopt-current';

/**
 * Error raised when a naming map cannot be applied safely.
 */
export class NamingOptionsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NamingOptionsError';
	}
}

/**
 * Error raised when the current naming config differs from the names stored
 * by a previous migration.
 */
export class NamingMismatchError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NamingMismatchError';
	}
}

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
 * Use `tables` to map ORM table names to overrides. Provide it directly or
 * generate it via a built-in utility (e.g. {@link snakeCaseTables}). Spread to
 * combine bulk-generated and manual overrides.
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
	 *
	 * When `fields` is provided for a table, it must include every known
	 * column for that table across all c15t schema versions. This makes stale
	 * generated maps fail loudly instead of silently missing columns added by a
	 * future release.
	 */
	tables?: Record<string, TableNaming>;
	/**
	 * Migration behavior for already-initialized self-hosted databases.
	 *
	 * By default, c15t fails closed when the names stored by a previous
	 * migration differ from the current config. Set `onMismatch` to
	 * `adopt-current` only after manually renaming existing database objects to
	 * match the current config; the next migration run will update c15t's stored
	 * name variants without emitting table/column rename operations. Run the
	 * migration command again afterwards to apply any remaining schema changes.
	 */
	migration?: {
		onMismatch?: NamingMismatchRecovery;
	};
}

/**
 * Variant payload applied to a fumadb table or column.
 *
 * We override the database-level identifiers (`sql` for relational
 * adapters, `mongodb` for the Mongo adapter) but leave the ORM-level
 * identifiers (`drizzle`, `prisma`, `convex`) untouched — those drive
 * the generated TypeScript API, which intentionally stays camelCase.
 */
interface DbNameVariant {
	sql: string;
	mongodb: string;
}

const getSchemaTableFields = (): Record<string, Set<string>> => {
	const known: Record<string, Set<string>> = {};

	for (const schema of SCHEMAS) {
		for (const [tableOrm, tableDef] of Object.entries(schema.tables)) {
			const fields = known[tableOrm] ?? new Set<string>();
			for (const colOrm of Object.keys(tableDef.columns)) {
				fields.add(colOrm);
			}
			known[tableOrm] = fields;
		}
	}

	return known;
};

/**
 * Validate that a naming map references only known schema objects and that any
 * table field map is complete across all known c15t schema versions.
 */
export const validateNamingOptions = (
	options: NamingOptions | undefined
): void => {
	const tables = options?.tables;
	if (!tables) return;

	const known = getSchemaTableFields();
	const issues: string[] = [];

	for (const [tableOrm, override] of Object.entries(tables)) {
		const knownFields = known[tableOrm];
		if (!knownFields) {
			issues.push(`unknown table "${tableOrm}"`);
			continue;
		}

		if (!override.fields) continue;

		const unknownFields = Object.keys(override.fields).filter(
			(field) => !knownFields.has(field)
		);
		for (const field of unknownFields) {
			issues.push(`unknown field "${tableOrm}.${field}"`);
		}

		const missingFields = [...knownFields].filter(
			(field) => !Object.hasOwn(override.fields ?? {}, field)
		);
		if (missingFields.length > 0) {
			issues.push(
				`table "${tableOrm}" field map is missing: ${missingFields.join(', ')}`
			);
		}
	}

	if (issues.length > 0) {
		throw new NamingOptionsError(
			`Invalid naming configuration:\n${issues
				.map((issue) => `- ${issue}`)
				.join('\n')}`
		);
	}
};

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
	validateNamingOptions(options);

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
					if (!Object.hasOwn(tableDef.columns, colOrm)) continue;
					if (colDb === colOrm) continue;
					variants[`${tableOrm}.${colOrm}`] = { sql: colDb, mongodb: colDb };
					changed = true;
				}
			}
		}
	}

	if (changed) {
		return variants;
	}
	return null;
};

const copyNameVariants = (names: NameVariants): NameVariants => ({
	sql: names.sql,
	drizzle: names.drizzle,
	prisma: names.prisma,
	convex: names.convex,
	mongodb: names.mongodb,
});

/**
 * Export the effective table/column name variants for a specific schema
 * version from a configured FumaDB instance.
 */
export const exportNameVariantsForVersion = (
	schemas: readonly AnySchema[],
	version: string
): StoredNameVariants | null => {
	const schema = schemas.find((candidate) => candidate.version === version);
	if (!schema) return null;

	const out: StoredNameVariants = {};
	for (const table of Object.values(schema.tables)) {
		out[table.ormName] = copyNameVariants(table.names);
		for (const column of Object.values(table.columns)) {
			out[`${table.ormName}.${column.ormName}`] = copyNameVariants(
				column.names
			);
		}
	}

	return out;
};

const stableStringify = (value: unknown): string => {
	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value);
	}

	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(',')}]`;
	}

	const record = value as Record<string, unknown>;
	const entries = Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
	return `{${entries.join(',')}}`;
};

/**
 * Produce a short deterministic fingerprint for a persisted naming map.
 */
export const namingFingerprint = (variants: StoredNameVariants): string => {
	let hash = 0x811c9dc5;
	const input = stableStringify(variants);
	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(16).padStart(8, '0');
};

export interface NamingVariantMismatch {
	path: string;
	variant: DbNameVariantKey;
	expected: string;
	actual: string | undefined;
}

/**
 * Compare the DB-side names persisted by FumaDB with the names produced by
 * the current c15t config.
 */
export const compareNameVariants = (
	stored: StoredNameVariants,
	current: StoredNameVariants
): NamingVariantMismatch[] => {
	const mismatches: NamingVariantMismatch[] = [];

	for (const [path, expectedNames] of Object.entries(current)) {
		const actualNames = stored[path];
		for (const variant of DB_NAME_VARIANTS) {
			const expected = expectedNames[variant];
			if (typeof expected !== 'string') continue;

			const actual = actualNames?.[variant];
			if (actual !== expected) {
				mismatches.push({
					path,
					variant,
					expected,
					actual,
				});
			}
		}
	}

	return mismatches;
};

const formatMismatch = (mismatch: NamingVariantMismatch): string => {
	const actual = mismatch.actual ? `"${mismatch.actual}"` : 'missing';
	return `${mismatch.path}.${mismatch.variant}: stored ${actual}, current "${mismatch.expected}"`;
};

/**
 * Throw a recovery-oriented error for naming drift.
 */
export const throwNamingMismatchError = (
	mismatches: NamingVariantMismatch[],
	stored: StoredNameVariants,
	current: StoredNameVariants
): never => {
	const preview = mismatches.slice(0, 8).map(formatMismatch);
	const remaining = mismatches.length - preview.length;
	if (remaining > 0) {
		preview.push(`...and ${remaining} more mismatch(es)`);
	}

	throw new NamingMismatchError(
		[
			'The current c15t naming config does not match the name variants stored by a previous migration.',
			'Changing `naming` after the database has been initialized is unsafe because migrations may target the wrong tables or columns.',
			`Stored fingerprint: ${namingFingerprint(stored)}`,
			`Current fingerprint: ${namingFingerprint(current)}`,
			'Mismatches:',
			...preview.map((line) => `- ${line}`),
			'Recovery:',
			'- Restore the previous `naming` config and run migrations normally, or',
			'- Manually rename the existing database objects to match the current config, set `naming.migration.onMismatch` to `adopt-current`, run the migration once to update c15t settings, then remove that option and run migrations again.',
		].join('\n')
	);
};

/**
 * Convert a camelCase or PascalCase identifier to snake_case.
 *
 * Internal helper used by {@link snakeCaseTables} and shared with any
 * future case-style utilities that need the same transform.
 */
const toSnakeCase = (input: string): string =>
	input
		.replace(/([a-z\d])([A-Z])/g, '$1_$2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
		.toLowerCase();

/**
 * Build a `tables` map by walking every known schema version and applying
 * `transform` to each table and column ORM name.
 *
 * Merging across every schema version (v1, v2, …) ensures columns added
 * in a newer version — or removed in a newer version but still present
 * during legacy → latest migrations — all receive a renamed variant. The
 * first occurrence of a table or column wins, so callers cannot collide
 * with earlier versions when iteration order is preserved.
 *
 * Internal helper backing {@link snakeCaseTables} and {@link lowerCaseTables}.
 */
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
