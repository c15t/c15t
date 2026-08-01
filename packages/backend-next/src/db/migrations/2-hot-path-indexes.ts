/**
 * The indexes no shipped version of c15t ever had.
 *
 * Every column indexed here is one the current backend actually filters on,
 * counted from the real query surface in `packages/backend/src` rather than
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
	// (packages/backend/src/db/tenant-scope.ts) injects a tenantId filter into
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

export const up = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	// Resolved so an unsupported dialect fails here rather than part-way
	// through emitting DDL.
	yield* Dialect.current;

	for (const index of INDEXES) {
		const columns = index.columns.map((column) => `"${column}"`).join(', ');
		yield* sql.unsafe(
			`create index if not exists "${index.name}" on "${index.table}" (${columns})`
		);
	}
});
