/**
 * Decision deduplication, and the tenant boundary that runs through it.
 *
 * The unique constraint on `dedupeKey` is on the column alone — the shape
 * shipped 2.0.0 created, present in every production database. That let two
 * tenants resolving the same decision collide:
 * the second lost the conflict and was handed **the first tenant's decision
 * row**, so its consent record cited another tenant's evidence.
 *
 * The tenant is therefore folded into the key's value rather than into the
 * constraint. Why not the constraint is the interesting half, and `a composite
 * unique would not have worked` below is the measurement that settles it.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import { createCompositeDedupeTable } from '../__tests__/composite-dedupe-table';
import { ENGINES, resetDatabase } from '../__tests__/engines';
import * as Dialect from '../db/dialect';
import { up as baseline } from '../db/migrations/1-baseline';
import { up as receipts } from '../db/migrations/3-consent-receipts-and-privacy-directives';
import { up as vendorChoice } from '../db/migrations/4-vendor-choice';
import { up as attribution } from '../db/migrations/6-experiment-attribution';
import { singleTenant, layer as tenantLayer } from '../db/tenant';
import { recordDecision, scopedDedupeKey } from './runtime-policy-decision';

const input = {
	dedupeKey: 'shared|key',
	fingerprint: 'fp_1',
	jurisdiction: 'gdpr',
	matchedBy: 'country',
	model: 'opt-in',
	policyId: 'pol_1',
};

describe('scopedDedupeKey', () => {
	it('hashes a single-tenant key', async () => {
		const key = await scopedDedupeKey(undefined, 'abc');
		assert.match(key, /^d_[0-9a-f]{64}$/u);
		assert.strictEqual(await scopedDedupeKey(undefined, 'abc'), key);
	});

	it('keeps single-tenant and tenanted keys apart', async () => {
		assert.notStrictEqual(
			await scopedDedupeKey(undefined, 'abc'),
			await scopedDedupeKey('tenant_a', 'abc')
		);
	});

	it('qualifies a tenanted key', async () => {
		const key = await scopedDedupeKey('tenant_a', 'abc');
		assert.notStrictEqual(key, 'abc');
		assert.match(key, /^t_[0-9a-f]{64}$/u);
	});

	it('stays within the MySQL column width whatever goes in', async () => {
		// `dedupeKey` is `indexedText`, which is varchar(255) on MySQL because
		// MySQL cannot index TEXT without a prefix length. The key carries the
		// visitor's language, so its raw length is not bounded by the server.
		const keys = await Promise.all(
			[undefined, 'tenant_a'].map((tenantId) =>
				scopedDedupeKey(tenantId, 'x'.repeat(4000))
			)
		);
		for (const key of keys) {
			assert.isBelow(key.length, 255);
		}
	});

	it('does not collide across a shared separator', async () => {
		// Hashing a joined string rather than a structured value would make
		// ('a|b', 'c') and ('a', 'b|c') the same key, and so make two tenants'
		// decisions one row again.
		const [left, right] = await Promise.all([
			scopedDedupeKey('a|b', 'c'),
			scopedDedupeKey('a', 'b|c'),
		]);
		assert.notStrictEqual(left, right);
	});
});

for (const engine of ENGINES) {
	describe(`decision dedupe (${engine.name})`, () => {
		it.effect(
			'the same key from two tenants is two decisions',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* baseline;
					yield* receipts;
					yield* vendorChoice;
					yield* attribution;

					const a = yield* recordDecision(input).pipe(
						Effect.provide(tenantLayer('tenant_a'))
					);
					const b = yield* recordDecision(input).pipe(
						Effect.provide(tenantLayer('tenant_b'))
					);

					assert.notStrictEqual(
						a.id,
						b.id,
						'tenant B was handed tenant A decision row'
					);

					const sql = yield* SqlClient.SqlClient;
					const rows = yield* sql<{ tenantId: string | null }>`
						select ${sql('tenantId')} from ${sql('runtimePolicyDecision')}
						order by ${sql('tenantId')}
					`;
					assert.deepStrictEqual(
						rows.map((row) => row.tenantId),
						['tenant_a', 'tenant_b']
					);
				}).pipe(Effect.provide(engine.client)),
			{ timeout: 60_000 }
		);

		it.effect(
			'deduplicates against a table indexed only on (tenantId, dedupeKey)',
			() =>
				Effect.gen(function* gen() {
					// The hosted schema had this index and no unique index on
					// dedupeKey alone. Postgres rejected `on conflict ("dedupeKey")`
					// against it, so every consent save failed.
					yield* resetDatabase;
					yield* createCompositeDedupeTable;

					const first = yield* recordDecision(input).pipe(
						Effect.provide(tenantLayer('tenant_a'))
					);
					const second = yield* recordDecision(input).pipe(
						Effect.provide(tenantLayer('tenant_a'))
					);

					assert.isTrue(first.created);
					assert.isFalse(second.created);
					assert.strictEqual(first.id, second.id);
				}).pipe(Effect.provide(engine.client)),
			{ timeout: 60_000 }
		);

		it.effect(
			'fails rather than return an unwritten id when another unique index conflicts',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* createCompositeDedupeTable;
					const sql = yield* SqlClient.SqlClient;
					const dialect = yield* Dialect.current;
					const quote = Dialect.escaperFor(dialect);
					// MySQL cannot index a TEXT column without a prefix length.
					const fingerprint =
						dialect === 'mysql'
							? `${quote('fingerprint')}(64)`
							: quote('fingerprint');
					yield* sql.unsafe(
						`create unique index ${quote('decision_fingerprint')} on ${quote(
							'runtimePolicyDecision'
						)} (${fingerprint})`
					);

					yield* recordDecision(input).pipe(
						Effect.provide(tenantLayer('tenant_a'))
					);
					const other = yield* Effect.exit(
						recordDecision({ ...input, dedupeKey: 'other|key' }).pipe(
							Effect.provide(tenantLayer('tenant_a'))
						)
					);

					assert.strictEqual(other._tag, 'Failure');
				}).pipe(Effect.provide(engine.client)),
			{ timeout: 60_000 }
		);

		if (engine.name === 'pglite' || engine.name === 'postgres') {
			it.effect(
				'deduplicates beside an unrelated deferrable unique constraint',
				() =>
					Effect.gen(function* gen() {
						// Postgres checks every unique index for a conflict-free
						// `on conflict do nothing` and rejects deferrable ones. With
						// the expected dedupeKey index present, the targeted form is
						// used and the deferrable constraint never comes into it.
						yield* resetDatabase;
						yield* baseline;
						yield* receipts;
						yield* vendorChoice;
						yield* attribution;
						const sql = yield* SqlClient.SqlClient;
						yield* sql.unsafe(
							'alter table "runtimePolicyDecision" add constraint "decision_fingerprint_deferrable" unique ("fingerprint") deferrable'
						);

						const first = yield* recordDecision(input).pipe(
							Effect.provide(tenantLayer('tenant_a'))
						);
						const second = yield* recordDecision(input).pipe(
							Effect.provide(tenantLayer('tenant_a'))
						);

						assert.isTrue(first.created);
						assert.isFalse(second.created);
						assert.strictEqual(first.id, second.id);
					}).pipe(Effect.provide(engine.client)),
				{ timeout: 60_000 }
			);
		}

		it.effect(
			'the same key from one tenant is one decision',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* baseline;
					yield* receipts;
					yield* vendorChoice;
					yield* attribution;

					// Scoping must not cost idempotency, which is the whole point of
					// the key.
					const first = yield* recordDecision(input).pipe(
						Effect.provide(tenantLayer('tenant_a'))
					);
					const second = yield* recordDecision(input).pipe(
						Effect.provide(tenantLayer('tenant_a'))
					);

					assert.isTrue(first.created);
					assert.isFalse(second.created);
					assert.strictEqual(first.id, second.id);
				}).pipe(Effect.provide(engine.client)),
			{ timeout: 60_000 }
		);

		it.effect(
			'a single-tenant deployment still deduplicates',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* baseline;
					yield* receipts;
					yield* vendorChoice;
					yield* attribution;

					const first = yield* recordDecision(input);
					const second = yield* recordDecision(input);

					assert.strictEqual(first.id, second.id);

					const sql = yield* SqlClient.SqlClient;
					const rows = yield* sql<{ dedupeKey: string }>`
						select ${sql('dedupeKey')} from ${sql('runtimePolicyDecision')}
					`;
					assert.deepStrictEqual(
						rows.map((row) => row.dedupeKey),
						[
							yield* Effect.promise(() =>
								scopedDedupeKey(undefined, input.dedupeKey)
							),
						]
					);
				}).pipe(Effect.provide(engine.client), Effect.provide(singleTenant)),
			{ timeout: 60_000 }
		);

		it.effect(
			'a composite unique would not have worked',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					const sql = yield* SqlClient.SqlClient;
					// Quoted by the dialect, and varchar rather than text: MySQL
					// rejects double-quoted identifiers outright and cannot put a
					// TEXT column in a unique index without a prefix length. Getting
					// this wrong is how the first version of this test "proved" the
					// claim on PGlite alone.
					const q = Dialect.escaperFor(yield* Dialect.current);

					// The repair this test exists to rule out. SQL treats NULLs as
					// distinct in a unique constraint, so `unique (tenantId, dedupeKey)`
					// admits unlimited duplicates for single-tenant deployments — the
					// common case — while appearing to tighten the schema.
					yield* sql.unsafe(
						`create table ${q('probe_composite')} (${q('t')} varchar(64), ${q('k')} varchar(64), unique (${q('t')}, ${q('k')}))`
					);
					for (let i = 0; i < 2; i += 1) {
						yield* sql.unsafe(
							`insert into ${q('probe_composite')} values (null, 'same')`
						);
					}

					const rows = yield* sql<{ n: number | string }>`
						select count(*) as n from ${sql('probe_composite')}
					`;
					assert.strictEqual(
						Number(rows[0]?.n),
						2,
						'a composite unique rejected the duplicate — revisit the approach'
					);

					yield* sql.unsafe(`drop table ${q('probe_composite')}`);
				}).pipe(Effect.provide(engine.client)),
			{ timeout: 60_000 }
		);
	});
}
