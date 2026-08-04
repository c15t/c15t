/**
 * The indexes no shipped version of c15t ever had.
 *
 * Every column indexed here is one the current backend actually filters on,
 * counted from the real query surface of the shipped 2.x backend rather than
 * guessed:
 *
 * ```
 *  30 id          — already the primary key
 *   6 externalId  — unindexed
 *   4 type        — unindexed
 *   4 subjectId   — unindexed
 *   4 isActive    — unindexed
 *   2 name        — indexed in legacy, lost in 2.0.0
 *   2 dedupeKey   — already unique
 *   1 code        — unindexed
 * ```
 *
 * Postgres does not index the referencing side of a foreign key, so
 * `consent.subjectId` and friends were bare in every released version. The
 * chunked `subjectId in (…)` fan-out in `list.handler.ts` was therefore a
 * sequential scan of `consent` per chunk, and the per-policy-type loop in
 * `consent-enrichment.ts` a sequential scan of `consentPolicy` per iteration.
 *
 * ## Why this is a separate migration from the baseline
 *
 * `1-baseline` has to reproduce the shipped 2.0.0 shape exactly, so that a
 * fresh install and an adopted database converge on one known state — that is
 * the property the migrator's adoption step depends on. Adding indexes there
 * would break it.
 *
 * Splitting them keeps both properties: convergence happens at migration 1,
 * and the improvement lands at migration 2 for fresh and adopted databases
 * alike. It also makes the benchmark arms able to measure migration 1 against
 * migration 2 directly, so "unindexed foreign keys were the dominant scaling
 * problem" becomes a number rather than a claim — and so the rewrite's
 * benchmark story does not silently attribute an indexing win to Effect
 * (RFC 0004 §7).
 *
 * ## Operational caveat
 *
 * These are plain `CREATE INDEX` statements, which take a write lock for the
 * duration. On a large `consent` table that is a visible stall. Postgres can
 * avoid it with `CREATE INDEX CONCURRENTLY`, but that cannot run inside a
 * transaction, so it needs the migrator to opt the step out of one. Worth
 * doing before this is pointed at a large production database; not worth
 * blocking the measurement on.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import * as Dialect from '../dialect';

interface IndexSpec {
	readonly name: string;
	readonly table: string;
	readonly columns: readonly string[];
	/** Why this index exists, in terms of the query that needs it. */
	readonly reason: string;
}

export const INDEXES: readonly IndexSpec[] = [
	{
		name: 'c15t_subject_externalId_idx',
		table: 'subject',
		columns: ['externalId'],
		reason:
			'GET /subjects?externalId= — the entry point of the subject list path.',
	},
	{
		name: 'c15t_consent_subjectId_idx',
		table: 'consent',
		columns: ['subjectId'],
		reason:
			'The chunked `subjectId in (…)` fan-out in list.handler.ts, previously a sequential scan per chunk.',
	},
	{
		name: 'c15t_consent_domainId_idx',
		table: 'consent',
		columns: ['domainId'],
		reason: 'Foreign key with no index on the referencing side.',
	},
	{
		name: 'c15t_consent_policyId_idx',
		table: 'consent',
		columns: ['policyId'],
		reason: 'Foreign key with no index on the referencing side.',
	},
	{
		name: 'c15t_consent_runtimePolicyDecisionId_idx',
		table: 'consent',
		columns: ['runtimePolicyDecisionId'],
		reason: 'Foreign key with no index on the referencing side.',
	},
	{
		name: 'c15t_auditLog_subjectId_idx',
		table: 'auditLog',
		columns: ['subjectId'],
		reason: 'Foreign key, and the audit trail is queried per subject.',
	},
	{
		name: 'c15t_consentPolicy_type_isActive_effectiveDate_idx',
		table: 'consentPolicy',
		columns: ['type', 'isActive', 'effectiveDate'],
		reason:
			'findLatestPolicyByType filters isActive = true and type = ? ordered by effectiveDate desc. Leading with type because isActive is a boolean and carries almost no selectivity.',
	},
	{
		name: 'c15t_domain_name_idx',
		table: 'domain',
		columns: ['name'],
		reason:
			'Domain lookup by name. The legacy schema indexed this; 2.0.0 dropped it.',
	},
	{
		name: 'c15t_consentPurpose_code_idx',
		table: 'consentPurpose',
		columns: ['code'],
		reason: 'Purpose lookup by code.',
	},

	// Every table carries tenantId, and `withTenantScope`
	// (2.x's db/tenant-scope.ts) injects a tenantId filter into
	// every findFirst, findMany, count, updateMany and deleteMany on every
	// table — the proxy throws rather than let an unscoped method through. So
	// in a multi-tenant deployment *every read in the system* filters on
	// tenantId, and no shipped version indexes it anywhere.
	//
	// These are plain single-column indexes rather than (tenantId, x)
	// composites on purpose. Single-tenant deployments never set tenantId and
	// so never go through the scoping proxy; they need the bare column indexes
	// above. Keeping the two sets separate serves both, and Postgres can
	// bitmap-AND them where a query filters on both. Composites are worth
	// revisiting once the benchmark has multi-tenant arms to justify them.
	...(
		[
			'subject',
			'domain',
			'consentPolicy',
			'consentPurpose',
			'runtimePolicyDecision',
			'consent',
			'auditLog',
		] as const
	).map((table) => ({
		name: `c15t_${table}_tenantId_idx`,
		table,
		columns: ['tenantId'] as const,
		reason:
			'Tenant scoping filters every query on this table on tenantId; no shipped version indexed it.',
	})),
] as const;

/**
 * Index names already present, for the engine that cannot say
 * `if not exists`.
 *
 * MySQL supports `create index if not exists` for nothing — re-running the
 * migration would fail with "Duplicate key name" rather than no-op — so the
 * check has to happen before the DDL. Postgres and SQLite both accept the
 * clause and get an empty set, keeping one code path for all three.
 */
const existingIndexNames = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql.onDialectOrElse({
		mysql: () =>
			Effect.map(
				sql<{ name: string }>`
					select distinct index_name as name
					from information_schema.statistics
					where table_schema = database()
				`,
				(rows) => new Set(rows.map((row) => row.name))
			),
		orElse: () => Effect.succeed(new Set<string>()),
	});
});

/**
 * How many leading characters of a MySQL `TEXT` column to index.
 *
 * 191 is the largest prefix that fits the 767-byte index limit of InnoDB's
 * older `COMPACT` row format under `utf8mb4` (191 × 4 = 764). Modern
 * `DYNAMIC` tables allow far more, but the smaller bound works on both and
 * this is a selectivity aid, not a uniqueness constraint.
 */
const TEXT_PREFIX = 191;

/**
 * The MySQL columns that must be indexed by prefix rather than whole.
 *
 * A **fresh** MySQL install has no such columns: the baseline declares
 * everything indexed here as `varchar(255)`. An **adopted** one can, because
 * adoption is add-only and the legacy migrator declared `subject.externalId`
 * and `consentPurpose.code` as `TEXT` — which MySQL refuses to index without
 * a length.
 *
 * Widening those columns instead would be the tidier schema and the wrong
 * trade: `alter table … modify` rewrites the table under a lock, on exactly
 * the tables most likely to be large, to buy nothing this index does not
 * already buy.
 */
const blobColumns = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql.onDialectOrElse({
		mysql: () =>
			Effect.map(
				// Aliased explicitly: MySQL uppercases `information_schema`
				// labels regardless of the case written here.
				sql<{ table_name: string; column_name: string }>`
					select table_name as table_name, column_name as column_name
					from information_schema.columns
					where table_schema = database()
						and data_type in ('tinytext', 'text', 'mediumtext', 'longtext',
							'tinyblob', 'blob', 'mediumblob', 'longblob')
				`,
				(rows) =>
					new Set(rows.map((row) => `${row.table_name}.${row.column_name}`))
			),
		orElse: () => Effect.succeed(new Set<string>()),
	});
});

export const up = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	// Resolved so an unsupported dialect fails here rather than part-way
	// through emitting DDL.
	const dialect = yield* Dialect.current;
	const quote = Dialect.escaperFor(dialect);
	const existing = yield* existingIndexNames;
	const needsPrefix = yield* blobColumns;

	// MySQL rejects the clause outright; the pre-flight check above covers it.
	const ifNotExists = dialect === 'mysql' ? '' : 'if not exists ';

	for (const index of INDEXES) {
		if (existing.has(index.name)) {
			continue;
		}

		const columns = index.columns
			.map((column) =>
				needsPrefix.has(`${index.table}.${column}`)
					? `${quote(column)}(${TEXT_PREFIX})`
					: quote(column)
			)
			.join(', ');

		yield* sql.unsafe(
			`create index ${ifNotExists}${quote(index.name)} on ${quote(
				index.table
			)} (${columns})`
		);
	}
});
