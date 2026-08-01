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
 * Every column and type is verified against
 * `internals/migration-fixtures/fixtures/fumadb-2.0.0/*.json`, captured from
 * the real published `@c15t/backend@2.1.0`.
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

const id: ColumnSpec = { name: 'id', type: 'id', nullable: false };

/**
 * In creation order. Foreign keys point backwards only, so this order is
 * valid for `create table` and its reverse is valid for dropping.
 */
export const TABLES: readonly TableSpec[] = [
	{
		name: 'subject',
		columns: [
			id,
			{ name: 'externalId', type: 'text', nullable: true },
			{ name: 'identityProvider', type: 'text', nullable: true },
			{ name: 'tenantId', type: 'text', nullable: true },
			{ name: 'createdAt', type: 'timestamp', nullable: false },
			{ name: 'updatedAt', type: 'timestamp', nullable: false },
		],
		foreignKeys: [],
	},
	{
		name: 'domain',
		columns: [
			id,
			{ name: 'name', type: 'text', nullable: false },
			{ name: 'tenantId', type: 'text', nullable: true },
			{ name: 'createdAt', type: 'timestamp', nullable: false },
			{ name: 'updatedAt', type: 'timestamp', nullable: false },
		],
		foreignKeys: [],
	},
	{
		name: 'consentPolicy',
		columns: [
			id,
			{ name: 'version', type: 'text', nullable: false },
			{ name: 'type', type: 'text', nullable: false },
			{ name: 'hash', type: 'text', nullable: true },
			{ name: 'effectiveDate', type: 'timestamp', nullable: false },
			{ name: 'isActive', type: 'bool', nullable: false },
			{ name: 'tenantId', type: 'text', nullable: true },
			{ name: 'createdAt', type: 'timestamp', nullable: false },
		],
		foreignKeys: [],
	},
	{
		name: 'consentPurpose',
		columns: [
			id,
			{ name: 'code', type: 'text', nullable: false },
			{ name: 'tenantId', type: 'text', nullable: true },
			{ name: 'createdAt', type: 'timestamp', nullable: false },
			{ name: 'updatedAt', type: 'timestamp', nullable: false },
		],
		foreignKeys: [],
	},
	{
		name: 'runtimePolicyDecision',
		columns: [
			id,
			{ name: 'tenantId', type: 'text', nullable: true },
			{ name: 'policyId', type: 'text', nullable: false },
			{ name: 'fingerprint', type: 'text', nullable: false },
			{ name: 'matchedBy', type: 'text', nullable: false },
			{ name: 'countryCode', type: 'text', nullable: true },
			{ name: 'regionCode', type: 'text', nullable: true },
			{ name: 'jurisdiction', type: 'text', nullable: false },
			{ name: 'language', type: 'text', nullable: true },
			{ name: 'model', type: 'text', nullable: false },
			{ name: 'policyI18n', type: 'json', nullable: true },
			{ name: 'uiMode', type: 'text', nullable: true },
			{ name: 'bannerUi', type: 'json', nullable: true },
			{ name: 'dialogUi', type: 'json', nullable: true },
			{ name: 'categories', type: 'json', nullable: true },
			{ name: 'preselectedCategories', type: 'json', nullable: true },
			{ name: 'proofConfig', type: 'json', nullable: true },
			// Unique, so on MySQL this must be a bounded varchar — the exact
			// constraint fumadb violates (RFC 0004 §3.5).
			{
				name: 'dedupeKey',
				type: 'indexedText',
				nullable: false,
				unique: true,
			},
			{ name: 'createdAt', type: 'timestamp', nullable: false },
		],
		foreignKeys: [],
	},
	{
		name: 'consent',
		columns: [
			id,
			{ name: 'subjectId', type: 'text', nullable: false },
			{ name: 'domainId', type: 'text', nullable: false },
			{ name: 'policyId', type: 'text', nullable: true },
			{ name: 'purposeIds', type: 'json', nullable: false },
			{ name: 'metadata', type: 'json', nullable: true },
			{ name: 'ipAddress', type: 'text', nullable: true },
			{ name: 'userAgent', type: 'text', nullable: true },
			{ name: 'givenAt', type: 'timestamp', nullable: false },
			{ name: 'validUntil', type: 'timestamp', nullable: true },
			{ name: 'jurisdiction', type: 'text', nullable: true },
			{ name: 'jurisdictionModel', type: 'text', nullable: true },
			{ name: 'tcString', type: 'text', nullable: true },
			{ name: 'uiSource', type: 'text', nullable: true },
			{ name: 'consentAction', type: 'text', nullable: true },
			{ name: 'runtimePolicyDecisionId', type: 'text', nullable: true },
			{ name: 'runtimePolicySource', type: 'text', nullable: true },
			{ name: 'tenantId', type: 'text', nullable: true },
		],
		foreignKeys: [
			{
				column: 'subjectId',
				referencesTable: 'subject',
				referencesColumn: 'id',
			},
			{ column: 'domainId', referencesTable: 'domain', referencesColumn: 'id' },
			{
				column: 'policyId',
				referencesTable: 'consentPolicy',
				referencesColumn: 'id',
			},
			{
				column: 'runtimePolicyDecisionId',
				referencesTable: 'runtimePolicyDecision',
				referencesColumn: 'id',
			},
		],
	},
	{
		name: 'auditLog',
		columns: [
			id,
			{ name: 'entityType', type: 'text', nullable: false },
			{ name: 'entityId', type: 'text', nullable: false },
			{ name: 'actionType', type: 'text', nullable: false },
			{ name: 'subjectId', type: 'text', nullable: true },
			{ name: 'ipAddress', type: 'text', nullable: true },
			{ name: 'userAgent', type: 'text', nullable: true },
			{ name: 'changes', type: 'json', nullable: true },
			{ name: 'metadata', type: 'json', nullable: true },
			{ name: 'tenantId', type: 'text', nullable: true },
			{ name: 'createdAt', type: 'timestamp', nullable: false },
		],
		foreignKeys: [
			{
				column: 'subjectId',
				referencesTable: 'subject',
				referencesColumn: 'id',
			},
		],
	},
] as const;

/** `create table` for one spec, in the given dialect's physical types. */
export function createTableSql(table: TableSpec, types: PhysicalTypes): string {
	const columns = table.columns.map((column) => {
		const physical = types[column.type];
		const nullability = column.nullable ? '' : ' not null';
		const primary = column.name === 'id' ? ' primary key' : '';
		const unique = column.unique ? ' unique' : '';
		return `"${column.name}" ${physical}${nullability}${primary}${unique}`;
	});

	const foreignKeys = table.foreignKeys.map(
		(fk) =>
			`foreign key ("${fk.column}") references "${fk.referencesTable}"("${fk.referencesColumn}")`
	);

	return `create table if not exists "${table.name}" (\n\t${[
		...columns,
		...foreignKeys,
	].join(',\n\t')}\n)`;
}

/**
 * `alter table … add column` for one column.
 *
 * Always nullable regardless of the spec: an existing table already has rows,
 * and a `not null` column with no default cannot be added to a populated
 * table on any engine. The application writes every one of these on insert,
 * so the looser constraint costs nothing that matters and avoids an adoption
 * that fails on any non-empty database.
 */
export function addColumnSql(
	table: string,
	column: ColumnSpec,
	types: PhysicalTypes
): string {
	return `alter table "${table}" add column "${column.name}" ${types[column.type]}`;
}
