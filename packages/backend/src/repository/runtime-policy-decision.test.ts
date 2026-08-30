/**
 * Decision deduplication, and the tenant boundary that runs through it.
 *
 * `dedupeKey` is client-supplied and its unique constraint is on the column
 * alone — the shape shipped 2.0.0 created, present in every production
 * database. That combination let two tenants sending the same key collide:
 * the second lost the conflict and was handed **the first tenant's decision
 * row**, so its consent record cited another tenant's evidence.
 *
 * The tenant is therefore folded into the key's value rather than into the
 * constraint. Why not the constraint is the interesting half, and `a composite
 * unique would not have worked` below is the measurement that settles it.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { ENGINES, resetDatabase } from '../__tests__/engines';
import * as Dialect from '../db/dialect';
import { up as baseline } from '../db/migrations/1-baseline';
import { singleTenant, layer as tenantLayer } from '../db/tenant';
import { recordDecision, scopedDedupeKey } from './runtime-policy-decision';

const input = {
	policyId: 'pol_1',
	fingerprint: 'fp_1',
	matchedBy: 'country',
	jurisdiction: 'gdpr',
	model: 'opt-in',
	dedupeKey: 'shared|key',
};

describe('scopedDedupeKey', () => {
	it('leaves a single-tenant key untouched', async () => {
		// Load-bearing for adoption: a 2.x database upgraded in place keeps
		// producing byte-identical keys, so its existing decision rows still
		// deduplicate instead of every decision being recorded a second time.
		assert.strictEqual(await scopedDedupeKey(undefined, 'abc'), 'abc');
	});

	it('qualifies a tenanted key', async () => {
		const key = await scopedDedupeKey('tenant_a', 'abc');
		assert.notStrictEqual(key, 'abc');
		assert.match(key, /^t_[0-9a-f]{64}$/);
	});

	it('stays within the MySQL column width whatever goes in', async () => {
		// `dedupeKey` is `indexedText`, which is varchar(255) on MySQL because
		// MySQL cannot index TEXT without a prefix length. Concatenating the
		// tenant would push a key that already fitted past the limit, so a
		// submission that recorded fine before scoping would start failing.
		const key = await scopedDedupeKey('tenant_a', 'x'.repeat(4000));
		assert.isBelow(key.length, 255);
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
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* baseline;

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
			'the same key from one tenant is one decision',
			() =>
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* baseline;

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
				Effect.gen(function* () {
					yield* resetDatabase;
					yield* baseline;

					const first = yield* recordDecision(input);
					const second = yield* recordDecision(input);

					assert.strictEqual(first.id, second.id);

					// Stored unqualified, so a database adopted from 2.x matches its
					// existing rows rather than duplicating them.
					const sql = yield* SqlClient.SqlClient;
					const rows = yield* sql<{ dedupeKey: string }>`
						select ${sql('dedupeKey')} from ${sql('runtimePolicyDecision')}
					`;
					assert.deepStrictEqual(
						rows.map((row) => row.dedupeKey),
						['shared|key']
					);
				}).pipe(Effect.provide(engine.client), Effect.provide(singleTenant)),
			{ timeout: 60_000 }
		);

		it.effect(
			'a composite unique would not have worked',
			() =>
				Effect.gen(function* () {
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
					for (let i = 0; i < 2; i++) {
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
