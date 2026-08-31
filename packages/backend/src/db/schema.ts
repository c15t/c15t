/**
 * The 2.0.0 schema as data, so the baseline migration and the adoption step
 * cannot drift apart.
 *
 * `1-baseline` turns this into `create table`; the adoption step turns it into
 * `alter table … add column` for whatever an existing database is missing.
 * Two code paths, one definition — if they were written separately, a fresh
 * install and an adopted database would eventually disagree and nothing would
 * catch it.
 *
 * Every column and type is verified against the `fumadb-2.0.0` fixtures under
 * `internals/migration-fixtures`, captured from the real published
 * `@c15t/backend@2.1.0` — except on MySQL, which fumadb cannot migrate, and
 * where the `legacy-…` fixtures are the evidence instead. See `./dialect.ts`.
 *
 * ## `text` versus `indexedText`
 *
 * A column is `indexedText` when something indexes it: a unique constraint, an
 * entry in `2-hot-path-indexes`, or a foreign key — MySQL indexes the
 * referencing side implicitly, and cannot do so on a `TEXT` column. The two
 * logical types are identical on Postgres and SQLite and differ only on MySQL,
 * so this distinction costs the other two engines nothing and is the
 * difference between MySQL working and not.
 *
 * Getting it wrong is loud rather than subtle — `create table` fails with
 * "BLOB/TEXT column … used in key specification without a key length" — so
 * `db/mysql.test.ts` catches a column that should have been marked.
 */

import type { PhysicalTypes } from './dialect';

/** Which entry of `PhysicalTypes` a column resolves to. */
export type LogicalType = keyof PhysicalTypes;

export interface ColumnSpec {
	readonly name: string;
	readonly type: LogicalType;
	readonly nullable: boolean;
	readonly unique?: boolean;
}

export interface ForeignKeySpec {
	readonly column: string;
	readonly referencesTable: string;
	readonly referencesColumn: string;
}

export interface TableSpec {
	readonly name: string;
	readonly columns: readonly ColumnSpec[];
	readonly foreignKeys: readonly ForeignKeySpec[];
}

const id: ColumnSpec = { name: 'id', nullable: false, type: 'id' };

/**
 * In creation order. Foreign keys point backwards only, so this order is
 * valid for `create table` and its reverse is valid for dropping.
 */
export const TABLES: readonly TableSpec[] = [
	{
		columns: [
			id,
			{ name: 'externalId', nullable: true, type: 'indexedText' },
			{ name: 'identityProvider', nullable: true, type: 'text' },
			{ name: 'tenantId', nullable: true, type: 'indexedText' },
			{ name: 'createdAt', nullable: false, type: 'timestamp' },
			{ name: 'updatedAt', nullable: false, type: 'timestamp' },
		],
		foreignKeys: [],
		name: 'subject',
	},
	{
		columns: [
			id,
			{ name: 'name', nullable: false, type: 'indexedText' },
			{ name: 'tenantId', nullable: true, type: 'indexedText' },
			{ name: 'createdAt', nullable: false, type: 'timestamp' },
			{ name: 'updatedAt', nullable: false, type: 'timestamp' },
		],
		foreignKeys: [],
		name: 'domain',
	},
	{
		columns: [
			id,
			{ name: 'version', nullable: false, type: 'text' },
			{ name: 'type', nullable: false, type: 'indexedText' },
			{ name: 'hash', nullable: true, type: 'text' },
			{ name: 'effectiveDate', nullable: false, type: 'timestamp' },
			{ name: 'isActive', nullable: false, type: 'bool' },
			{ name: 'tenantId', nullable: true, type: 'indexedText' },
			{ name: 'createdAt', nullable: false, type: 'timestamp' },
		],
		foreignKeys: [],
		name: 'consentPolicy',
	},
	{
		columns: [
			id,
			{ name: 'code', nullable: false, type: 'indexedText' },
			{ name: 'tenantId', nullable: true, type: 'indexedText' },
			{ name: 'createdAt', nullable: false, type: 'timestamp' },
			{ name: 'updatedAt', nullable: false, type: 'timestamp' },
		],
		foreignKeys: [],
		name: 'consentPurpose',
	},
	{
		columns: [
			id,
			{ name: 'tenantId', nullable: true, type: 'indexedText' },
			{ name: 'policyId', nullable: false, type: 'text' },
			{ name: 'fingerprint', nullable: false, type: 'text' },
			{ name: 'matchedBy', nullable: false, type: 'text' },
			{ name: 'countryCode', nullable: true, type: 'text' },
			{ name: 'regionCode', nullable: true, type: 'text' },
			{ name: 'jurisdiction', nullable: false, type: 'text' },
			{ name: 'language', nullable: true, type: 'text' },
			{ name: 'model', nullable: false, type: 'text' },
			{ name: 'policyI18n', nullable: true, type: 'json' },
			{ name: 'uiMode', nullable: true, type: 'text' },
			{ name: 'bannerUi', nullable: true, type: 'json' },
			{ name: 'dialogUi', nullable: true, type: 'json' },
			{ name: 'categories', nullable: true, type: 'json' },
			{ name: 'preselectedCategories', nullable: true, type: 'json' },
			{ name: 'proofConfig', nullable: true, type: 'json' },
			// Unique, so on MySQL this must be a bounded varchar — the exact
			// constraint fumadb violates (RFC 0004 §3.5).
			{
				name: 'dedupeKey',
				nullable: false,
				type: 'indexedText',
				unique: true,
			},
			{ name: 'createdAt', nullable: false, type: 'timestamp' },
		],
		foreignKeys: [],
		name: 'runtimePolicyDecision',
	},
	{
		columns: [
			id,
			{ name: 'subjectId', nullable: false, type: 'indexedText' },
			{ name: 'domainId', nullable: false, type: 'indexedText' },
			{ name: 'policyId', nullable: true, type: 'indexedText' },
			{ name: 'purposeIds', nullable: false, type: 'json' },
			{ name: 'metadata', nullable: true, type: 'json' },
			{ name: 'ipAddress', nullable: true, type: 'text' },
			{ name: 'userAgent', nullable: true, type: 'text' },
			{ name: 'givenAt', nullable: false, type: 'timestamp' },
			{ name: 'validUntil', nullable: true, type: 'timestamp' },
			{ name: 'jurisdiction', nullable: true, type: 'text' },
			{ name: 'jurisdictionModel', nullable: true, type: 'text' },
			{ name: 'tcString', nullable: true, type: 'text' },
			{ name: 'uiSource', nullable: true, type: 'text' },
			{ name: 'consentAction', nullable: true, type: 'text' },
			{ name: 'runtimePolicyDecisionId', nullable: true, type: 'indexedText' },
			{ name: 'runtimePolicySource', nullable: true, type: 'text' },
			{ name: 'tenantId', nullable: true, type: 'indexedText' },
		],
		foreignKeys: [
			{
				column: 'subjectId',
				referencesColumn: 'id',

				referencesTable: 'subject',
			},
			{ column: 'domainId', referencesColumn: 'id', referencesTable: 'domain' },
			{
				column: 'policyId',
				referencesColumn: 'id',

				referencesTable: 'consentPolicy',
			},
			{
				column: 'runtimePolicyDecisionId',
				referencesColumn: 'id',

				referencesTable: 'runtimePolicyDecision',
			},
		],
		name: 'consent',
	},
	{
		columns: [
			id,
			{ name: 'entityType', nullable: false, type: 'text' },
			{ name: 'entityId', nullable: false, type: 'text' },
			{ name: 'actionType', nullable: false, type: 'text' },
			{ name: 'subjectId', nullable: true, type: 'indexedText' },
			{ name: 'ipAddress', nullable: true, type: 'text' },
			{ name: 'userAgent', nullable: true, type: 'text' },
			{ name: 'changes', nullable: true, type: 'json' },
			{ name: 'metadata', nullable: true, type: 'json' },
			{ name: 'tenantId', nullable: true, type: 'indexedText' },
			{ name: 'createdAt', nullable: false, type: 'timestamp' },
		],
		foreignKeys: [
			{
				column: 'subjectId',
				referencesColumn: 'id',

				referencesTable: 'subject',
			},
		],
		name: 'auditLog',
	},
] as const;

/**
 * `create table` for one spec, in the given dialect's physical types.
 *
 * `quote` comes from `Dialect.escaperFor` rather than being hardcoded to `"`:
 * MySQL delimits identifiers with backticks and rejects double-quoted ones
 * outright.
 */
export const createTableSql = function createTableSql(
	table: TableSpec,
	types: PhysicalTypes,
	quote: (name: string) => string
): string {
	const columns = table.columns.map((column) => {
		const physical = types[column.type];
		const nullability = column.nullable ? '' : ' not null';
		const primary = column.name === 'id' ? ' primary key' : '';
		const unique = column.unique ? ' unique' : '';
		return `${quote(column.name)} ${physical}${nullability}${primary}${unique}`;
	});

	const foreignKeys = table.foreignKeys.map(
		(fk) =>
			`foreign key (${quote(fk.column)}) references ${quote(
				fk.referencesTable
			)}(${quote(fk.referencesColumn)})`
	);

	return `create table if not exists ${quote(table.name)} (\n\t${[
		...columns,
		...foreignKeys,
	].join(',\n\t')}\n)`;
};

/**
 * `alter table … add column` for one column.
 *
 * Always nullable regardless of the spec: an existing table already has rows,
 * and a `not null` column with no default cannot be added to a populated
 * table on any engine. The application writes every one of these on insert,
 * so the looser constraint costs nothing that matters and avoids an adoption
 * that fails on any non-empty database.
 */
export const addColumnSql = function addColumnSql(
	table: string,
	column: ColumnSpec,
	types: PhysicalTypes,
	quote: (name: string) => string
): string {
	return `alter table ${quote(table)} add column ${quote(column.name)} ${
		types[column.type]
	}`;
};
