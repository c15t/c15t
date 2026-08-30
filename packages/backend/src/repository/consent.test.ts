/**
 * Consent writes must record exactly one row per submission.
 *
 * A duplicate is not cosmetic here — it is a second legal record of the same
 * act, and it corrupts the audit trail the platform exists to produce. So
 * these tests care mostly about the ways a second row could sneak in:
 * retries, concurrency, and rows written by older code.
 */

import { PgliteClient } from '@effect/sql-pglite';
import { assert, describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { up as baseline } from '../db/migrations/1-baseline';
import { singleTenant } from '../db/tenant';
import { assertSamePurposes, record } from './consent';

// Tests run single-tenant unless a case says otherwise; the scope is a
// service, so a query cannot run without one.
const Pglite = Layer.merge(PgliteClient.layer({}), singleTenant);

const GIVEN_AT = new Date(1_800_000_000_000);

const setup = Effect.gen(function* () {
	yield* baseline;
	const sql = yield* SqlClient.SqlClient;
	yield* sql.unsafe(`insert into "domain" ("id","name","createdAt","updatedAt")
		values ('dom_1','example.com',now(),now())`);
	yield* sql.unsafe(`insert into "subject" ("id","externalId","createdAt","updatedAt")
		values ('sub_1','ext_1',now(),now())`);
});

const submission = {
	subjectId: 'sub_1',
	domainId: 'dom_1',
	policyId: null,
	givenAt: GIVEN_AT,
	purposeIds: ['analytics'],
};

const countConsents = Effect.fn('countConsents')(function* () {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{
		total: string;
	}>`select count(*) as total from "consent"`;
	return Number(rows[0]?.total ?? 0);
});

describe('consent.record', () => {
	it.effect(
		'records a new submission',
		() =>
			Effect.gen(function* () {
				yield* setup;
				const result = yield* record(submission);

				assert.isTrue(result.created);
				assert.match(result.id, /^cns_/);
				assert.strictEqual(yield* countConsents(), 1);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'is idempotent across retries',
		() =>
			Effect.gen(function* () {
				yield* setup;
				const first = yield* record(submission);
				const second = yield* record(submission);

				assert.isTrue(first.created);
				// The caller can tell a replay from a fresh consent, so the audit
				// trail records one act rather than two.
				assert.isFalse(second.created);
				assert.strictEqual(second.id, first.id);
				assert.strictEqual(yield* countConsents(), 1);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'records one row when the same submission arrives concurrently',
		() =>
			Effect.gen(function* () {
				yield* setup;

				// The case the old read-then-write could lose: both calls read
				// "absent" before either wrote. `on conflict` closes that window
				// because the check and the write are one statement.
				const results = yield* Effect.all(
					[record(submission), record(submission), record(submission)],
					{ concurrency: 'unbounded' }
				);

				assert.strictEqual(yield* countConsents(), 1);
				assert.strictEqual(
					results.filter((result) => result.created).length,
					1,
					'exactly one caller should be told it created the row'
				);
				const ids = new Set(results.map((result) => result.id));
				assert.strictEqual(ids.size, 1);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'treats a different givenAt as a different consent',
		() =>
			Effect.gen(function* () {
				yield* setup;
				yield* record(submission);
				const later = yield* record({
					...submission,
					givenAt: new Date(GIVEN_AT.getTime() + 1000),
				});

				// Consent given at a different moment is a distinct act, even
				// from the same subject for the same policy.
				assert.isTrue(later.created);
				assert.strictEqual(yield* countConsents(), 2);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'finds a row written before deterministic ids existed',
		() =>
			Effect.gen(function* () {
				yield* setup;
				const sql = yield* SqlClient.SqlClient;

				// Older code wrote a random primary key, so the conflict target
				// cannot see it — only the identity tuple can. A rolling deploy
				// can still produce these after the new code is live.
				yield* sql.unsafe(`insert into "consent"
					("id","subjectId","domainId","policyId","purposeIds","givenAt")
					values ('cns_legacyrandom','sub_1','dom_1',null,'[]',
						to_timestamp(${GIVEN_AT.getTime()} / 1000.0))`);

				const result = yield* record(submission);

				assert.isFalse(result.created);
				assert.strictEqual(result.id, 'cns_legacyrandom');
				assert.strictEqual(yield* countConsents(), 1);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'keeps tenants apart',
		() =>
			Effect.gen(function* () {
				yield* setup;
				yield* record({ ...submission, tenantId: 'tenant_a' });
				const other = yield* record({ ...submission, tenantId: 'tenant_b' });

				// Two tenants recording structurally identical consent are two
				// separate legal records, not a duplicate.
				assert.isTrue(other.created);
				assert.strictEqual(yield* countConsents(), 2);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);
});

describe('assertSamePurposes', () => {
	// The comparison `record` applies on both paths that can find an existing
	// row. The second — a lost insert race — cannot be forced end to end: PGlite
	// serialises every query, so the second caller always sees the first's row in
	// the pre-insert check instead. Covered here so the branch is not merely
	// written and never executed.
	const run = <A>(effect: Effect.Effect<A, unknown, never>) =>
		Effect.runPromise(Effect.result(effect));

	it('accepts an identical set', async () => {
		const result = await run(assertSamePurposes('["a","b"]', ['a', 'b']));
		assert.strictEqual(result._tag, 'Success');
	});

	it('accepts the same set in a different order', async () => {
		// Order is not part of what was consented to; treating it as a change
		// would refuse ordinary retries.
		const result = await run(assertSamePurposes('["b","a"]', ['a', 'b']));
		assert.strictEqual(result._tag, 'Success');
	});

	it('refuses a different set', async () => {
		const result = await run(assertSamePurposes('["a"]', ['a', 'b']));
		assert.strictEqual(result._tag, 'Failure');
	});

	it('accepts an already-decoded array', async () => {
		// Postgres and MySQL hand back JSON as a value; SQLite as a string.
		const result = await run(assertSamePurposes(['a', 'b'], ['b', 'a']));
		assert.strictEqual(result._tag, 'Success');
	});

	it('says nothing about a row it cannot read', async () => {
		// Unparseable or absent is not evidence of a mismatch, and refusing on
		// it would turn a storage oddity into a rejected consent.
		assert.strictEqual(
			(await run(assertSamePurposes(null, ['a'])))._tag,
			'Success'
		);
		assert.strictEqual(
			(await run(assertSamePurposes('not json', ['a'])))._tag,
			'Success'
		);
	});
});
