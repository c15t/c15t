/**
 * Adoption is the riskiest code in the package: it is the only part that
 * touches a database someone else's production data lives in. These tests
 * exist mostly to pin the properties that make it safe.
 */

import { PgliteClient } from '@effect/sql-pglite';
import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { apply, LEDGER_TABLE, plan } from './adopt';
import { classify } from './classify';
import { up as baseline } from './migrations/1-baseline';

const Pglite = PgliteClient.layer({});

/** A 1.0.0-era database: seven tables, no runtimePolicyDecision, with data. */
const legacyish = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql.unsafe(`create table "subject" (
		"id" varchar(255) primary key, "externalId" text, "createdAt" timestamp
	)`);
	yield* sql.unsafe(`create table "domain" (
		"id" varchar(255) primary key, "name" text
	)`);
	yield* sql.unsafe(
		`create table "consentPolicy" ("id" varchar(255) primary key)`
	);
	yield* sql.unsafe(
		`create table "consentPurpose" ("id" varchar(255) primary key)`
	);
	yield* sql.unsafe(`create table "auditLog" ("id" varchar(255) primary key)`);
	yield* sql.unsafe(`create table "consent" (
		"id" varchar(255) primary key,
		"subjectId" text,
		"domainId" text,
		"metadata" jsonb,
		"status" text,
		"withdrawalReason" text
	)`);
	yield* sql.unsafe(`create table "consentRecord" (
		"id" varchar(255) primary key, "consentId" text
	)`);

	yield* sql.unsafe(
		`insert into "subject" ("id", "externalId") values ('sub_1', 'ext_1')`
	);
	yield* sql.unsafe(
		`insert into "domain" ("id", "name") values ('dom_1', 'a.com')`
	);
	yield* sql.unsafe(
		`insert into "consent" ("id", "subjectId", "domainId", "status", "withdrawalReason") values ('cns_1', 'sub_1', 'dom_1', 'active', 'changed mind')`
	);
	yield* sql.unsafe(
		`insert into "consentRecord" ("id", "consentId") values ('rec_1', 'cns_1')`
	);
});

const columnsOf = Effect.fn('columnsOf')(function* (table: string) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{ column_name: string }>`
		select column_name from information_schema.columns where table_name = ${table}
	`;
	return rows.map((row) => row.column_name).sort();
});

describe('adopt', () => {
	it.effect(
		'plans a full create for an empty database',
		() =>
			Effect.gen(function* () {
				const adoption = yield* plan;
				assert.strictEqual(adoption.shape._tag, 'Empty');
				assert.isUndefined(adoption.blocked);
				assert.strictEqual(
					adoption.steps.filter((step) => step.kind === 'create-table').length,
					7
				);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'never drops data that schema 2.0.0 removed',
		() =>
			Effect.gen(function* () {
				yield* legacyish;
				const adoption = yield* plan;

				assert.isUndefined(adoption.blocked);
				assert.deepStrictEqual(
					adoption.steps.filter(
						(step) =>
							step.sql.includes('drop table') ||
							step.sql.includes('drop column')
					),
					[],
					'adoption must never drop anything'
				);

				yield* apply(adoption);

				// consentRecord was dropped in 2.0.0. Discarding it would discard
				// consent history, so it stays and is reported instead.
				const sql = yield* SqlClient.SqlClient;
				const kept = yield* sql<{
					count: string;
				}>`select count(*) as count from "consentRecord"`;
				assert.strictEqual(Number(kept[0]?.count), 1);

				const consent = yield* columnsOf('consent');
				assert.include(consent, 'withdrawalReason');
				assert.include(consent, 'status');
				assert.include(
					adoption.retained.join(' '),
					'withdrawalReason',
					'retained columns should be reported to the operator'
				);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'brings a 1.0.0-era database up to the baseline contract',
		() =>
			Effect.gen(function* () {
				yield* legacyish;
				yield* apply(yield* plan);

				// Every column the backend reads must now exist, whatever else does.
				const consent = yield* columnsOf('consent');
				for (const column of [
					'runtimePolicyDecisionId',
					'runtimePolicySource',
					'tcString',
					'uiSource',
					'consentAction',
					'jurisdiction',
					'tenantId',
				]) {
					assert.include(consent, column);
				}

				const tables = yield* (function* () {
					const sql = yield* SqlClient.SqlClient;
					const rows = yield* sql<{ table_name: string }>`
						select table_name from information_schema.tables
						where table_schema = 'public' and table_type = 'BASE TABLE'
					`;
					return rows.map((row) => row.table_name);
				})();
				assert.include(tables, 'runtimePolicyDecision');
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'emits no destructive statement for any shape it can encounter',
		() =>
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				const destructive = /\b(drop|truncate)\b|\bdelete\s+from\b/i;

				// Empty database.
				for (const step of (yield* plan).steps) {
					assert.notMatch(step.sql, destructive, step.description);
				}

				// A 1.0.0-era database with data.
				yield* legacyish;
				for (const step of (yield* plan).steps) {
					assert.notMatch(step.sql, destructive, step.description);
				}

				// A 2.0.0-shaped database missing only the newer columns.
				yield* sql.unsafe('drop schema public cascade');
				yield* sql.unsafe('create schema public');
				yield* baseline;
				yield* sql.unsafe(`alter table "consent" drop column "tenantId"`);
				for (const step of (yield* plan).steps) {
					assert.notMatch(step.sql, destructive, step.description);
				}
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'refuses to apply a plan carrying a destructive statement',
		() =>
			Effect.gen(function* () {
				yield* legacyish;
				const adoption = yield* plan;

				// Simulates a future edit smuggling a drop into an additive step.
				const tampered = {
					...adoption,
					steps: [
						...adoption.steps,
						{
							kind: 'add-column' as const,
							description: 'sneaky',
							sql: 'drop table "consentRecord"',
						},
					],
				};

				const outcome = yield* Effect.exit(apply(tampered));
				assert.isTrue(outcome._tag === 'Failure');

				// And the table it targeted is untouched.
				const sql = yield* SqlClient.SqlClient;
				const rows = yield* sql<{
					count: string;
				}>`select count(*) as count from "consentRecord"`;
				assert.strictEqual(Number(rows[0]?.count), 1);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'reports the database as ours once adopted',
		() =>
			Effect.gen(function* () {
				yield* legacyish;
				yield* apply(yield* plan);
				const shape = yield* classify;
				assert.strictEqual(shape._tag, 'Baseline');
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'is safe to re-run after a partial application',
		() =>
			Effect.gen(function* () {
				yield* legacyish;
				yield* apply(yield* plan);
				const first = yield* columnsOf('consent');

				// Re-planning against the now-adopted database should be a no-op.
				const second = yield* plan;
				assert.strictEqual(second.shape._tag, 'Baseline');
				yield* apply(second);
				assert.deepStrictEqual(yield* columnsOf('consent'), first);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'refuses to add a foreign key that existing rows would violate',
		() =>
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				yield* baseline;
				// Drop the constraint so we can create the orphan, mimicking a
				// MySQL database that never had foreign keys at all.
				yield* sql.unsafe(
					`alter table "consent" drop constraint "consent_subjectId_fkey"`
				);
				yield* sql.unsafe(`insert into "domain" ("id", "name", "createdAt", "updatedAt")
					values ('dom_1', 'a.com', now(), now())`);
				yield* sql.unsafe(`insert into "consent"
					("id", "subjectId", "domainId", "purposeIds", "givenAt")
					values ('cns_1', 'sub_missing', 'dom_1', '[]', now())`);

				const adoption = yield* plan;

				assert.isDefined(adoption.blocked);
				assert.include(adoption.blocked ?? '', '1 row(s)');
				assert.include(adoption.blocked ?? '', 'skipForeignKeys');
				assert.strictEqual(adoption.orphans.length, 1);
				assert.strictEqual(adoption.orphans[0]?.table, 'consent');
				assert.strictEqual(adoption.orphans[0]?.count, 1);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'proceeds without foreign keys when explicitly told to',
		() =>
			Effect.gen(function* () {
				const sql = yield* SqlClient.SqlClient;
				yield* baseline;
				yield* sql.unsafe(
					`alter table "consent" drop constraint "consent_subjectId_fkey"`
				);
				yield* sql.unsafe(`insert into "domain" ("id", "name", "createdAt", "updatedAt")
					values ('dom_1', 'a.com', now(), now())`);
				yield* sql.unsafe(`insert into "consent"
					("id", "subjectId", "domainId", "purposeIds", "givenAt")
					values ('cns_1', 'sub_missing', 'dom_1', '[]', now())`);

				const adoption = yield* plan;
				yield* apply(adoption, { skipForeignKeys: true });

				// The orphan row survives — the operator chose integrity later
				// over losing data now.
				const rows = yield* sql<{
					count: string;
				}>`select count(*) as count from "consent"`;
				assert.strictEqual(Number(rows[0]?.count), 1);

				const ledger = yield* sql<{ name: string }>`${sql.unsafe(
					`select "name" from "${LEDGER_TABLE}"`
				)}`;
				assert.strictEqual(ledger[0]?.name, '1-baseline');
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);
});
