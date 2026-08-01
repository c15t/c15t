/**
 * The 2.0.0 schema, as the baseline every c15t database converges on.
 *
 * This is not a fresh design. It reproduces the physical shape that shipped
 * `@c15t/backend` 2.x already put in users' databases, verified column by
 * column against `internals/migration-fixtures/fixtures/fumadb-2.0.0/*.json`.
 * RFC 0004 freezes this schema until cutover, which is what makes the rewrite
 * behaviour-preserving and the benchmarks comparable.
 *
 * Two consequences of "reproduce, don't redesign":
 *
 * - A **fresh** install running this migration and an **adopted** 2.0.0
 *   database must introspect identically. `db/migrations/baseline.test.ts`
 *   asserts exactly that against the committed fixtures.
 * - Improvements to the schema — indexes the old code lacked, the missing
 *   `COUNT` for pagination, tighter types — belong after cutover, not here.
 *
 * The one deliberate divergence is `runtimePolicyDecision.dedupeKey`, which
 * has to be a bounded `varchar` on MySQL because MySQL cannot index `TEXT`
 * without a prefix length. That single constraint is why fumadb cannot migrate
 * MySQL at all (RFC 0004 §3.5); see `../dialect.ts`.
 *
 * **What is deliberately absent:** any index on a foreign key column. No
 * shipped version has one — the only non-primary indexes in any captured
 * fixture are `domain.name` (legacy) and `dedupeKey` (2.0.0) — and Postgres
 * does not create them implicitly. That is very likely the dominant scaling
 * problem in the current backend, but adding them here would mean a fresh
 * install no longer matches an adopted database, which is the one property
 * this migration exists to guarantee. They belong immediately after cutover,
 * measured by the §7 benchmark arms rather than assumed.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import * as Dialect from '../dialect';

/**
 * Tables in creation order. Foreign keys point backwards only, so this order
 * is also a valid drop order reversed.
 */
const TABLE_ORDER = [
	'subject',
	'domain',
	'consentPolicy',
	'consentPurpose',
	'runtimePolicyDecision',
	'consent',
	'auditLog',
] as const;

export const up = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	const dialect = yield* Dialect.current;
	const t = Dialect.typesFor(dialect);

	yield* sql.unsafe(`
		create table if not exists "subject" (
			"id" ${t.id} not null primary key,
			"externalId" ${t.text},
			"identityProvider" ${t.text},
			"tenantId" ${t.text},
			"createdAt" ${t.timestamp} not null,
			"updatedAt" ${t.timestamp} not null
		)
	`);

	yield* sql.unsafe(`
		create table if not exists "domain" (
			"id" ${t.id} not null primary key,
			"name" ${t.text} not null,
			"tenantId" ${t.text},
			"createdAt" ${t.timestamp} not null,
			"updatedAt" ${t.timestamp} not null
		)
	`);

	yield* sql.unsafe(`
		create table if not exists "consentPolicy" (
			"id" ${t.id} not null primary key,
			"version" ${t.text} not null,
			"type" ${t.text} not null,
			"hash" ${t.text},
			"effectiveDate" ${t.timestamp} not null,
			"isActive" ${t.bool} not null,
			"tenantId" ${t.text},
			"createdAt" ${t.timestamp} not null
		)
	`);

	yield* sql.unsafe(`
		create table if not exists "consentPurpose" (
			"id" ${t.id} not null primary key,
			"code" ${t.text} not null,
			"tenantId" ${t.text},
			"createdAt" ${t.timestamp} not null,
			"updatedAt" ${t.timestamp} not null
		)
	`);

	// dedupeKey is unique, so on MySQL it must be varchar rather than text.
	yield* sql.unsafe(`
		create table if not exists "runtimePolicyDecision" (
			"id" ${t.id} not null primary key,
			"tenantId" ${t.text},
			"policyId" ${t.text} not null,
			"fingerprint" ${t.text} not null,
			"matchedBy" ${t.text} not null,
			"countryCode" ${t.text},
			"regionCode" ${t.text},
			"jurisdiction" ${t.text} not null,
			"language" ${t.text},
			"model" ${t.text} not null,
			"policyI18n" ${t.json},
			"uiMode" ${t.text},
			"bannerUi" ${t.json},
			"dialogUi" ${t.json},
			"categories" ${t.json},
			"preselectedCategories" ${t.json},
			"proofConfig" ${t.json},
			"dedupeKey" ${t.indexedText} not null unique,
			"createdAt" ${t.timestamp} not null
		)
	`);

	yield* sql.unsafe(`
		create table if not exists "consent" (
			"id" ${t.id} not null primary key,
			"subjectId" ${t.text} not null,
			"domainId" ${t.text} not null,
			"policyId" ${t.text},
			"purposeIds" ${t.json} not null,
			"metadata" ${t.json},
			"ipAddress" ${t.text},
			"userAgent" ${t.text},
			"givenAt" ${t.timestamp} not null,
			"validUntil" ${t.timestamp},
			"jurisdiction" ${t.text},
			"jurisdictionModel" ${t.text},
			"tcString" ${t.text},
			"uiSource" ${t.text},
			"consentAction" ${t.text},
			"runtimePolicyDecisionId" ${t.text},
			"runtimePolicySource" ${t.text},
			"tenantId" ${t.text},
			foreign key ("subjectId") references "subject"("id"),
			foreign key ("domainId") references "domain"("id"),
			foreign key ("policyId") references "consentPolicy"("id"),
			foreign key ("runtimePolicyDecisionId") references "runtimePolicyDecision"("id")
		)
	`);

	yield* sql.unsafe(`
		create table if not exists "auditLog" (
			"id" ${t.id} not null primary key,
			"entityType" ${t.text} not null,
			"entityId" ${t.text} not null,
			"actionType" ${t.text} not null,
			"subjectId" ${t.text},
			"ipAddress" ${t.text},
			"userAgent" ${t.text},
			"changes" ${t.json},
			"metadata" ${t.json},
			"tenantId" ${t.text},
			"createdAt" ${t.timestamp} not null,
			foreign key ("subjectId") references "subject"("id")
		)
	`);
});

export { TABLE_ORDER };
