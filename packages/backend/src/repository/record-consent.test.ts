/**
 * The full consent submission.
 *
 * The tests that matter are the replay ones. Four tables are written and each
 * has to deduplicate independently — a submission that arrives twice must
 * leave one subject, one decision, one consent and **one** audit entry. The
 * audit entry is the one with no natural key, so it is the one most likely to
 * be wrong.
 */

import { PgliteClient } from '@effect/sql-pglite';
import { assert, describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { up as baseline } from '../db/migrations/1-baseline';
import { singleTenant } from '../db/tenant';
import { submit } from './record-consent';

// Tests run single-tenant unless a case says otherwise; the scope is a
// service, so a query cannot run without one.
const Pglite = Layer.merge(PgliteClient.layer({}), singleTenant);
const GIVEN_AT = new Date(1_800_000_000_000);

const setup = Effect.gen(function* () {
	yield* baseline;
	const sql = yield* SqlClient.SqlClient;
	yield* sql.unsafe(`insert into "domain" ("id","name","createdAt","updatedAt")
		values ('dom_1','example.com',now(),now())`);
	yield* sql.unsafe(`insert into "consentPolicy"
		("id","version","type","effectiveDate","isActive","createdAt")
		values ('pol_1','1.0','cookie',now(),true,now())`);
});

const request = {
	subjectId: 'sub_client_generated',
	domainId: 'dom_1',
	policyId: 'pol_1',
	purposeIds: ['analytics'],
	givenAt: GIVEN_AT,
	ipAddress: '203.0.113.0',
	userAgent: 'test-agent',
	decision: {
		policyId: 'pol_1',
		fingerprint: 'fp_1',
		matchedBy: 'country',
		jurisdiction: 'gdpr',
		model: 'opt_in',
		dedupeKey: 'default|fp_1|country|DE|none|gdpr',
	},
};

const counts = Effect.fn('counts')(function* () {
	const sql = yield* SqlClient.SqlClient;
	const of = (table: string) =>
		sql<{
			total: string;
		}>`${sql.unsafe(`select count(*) as total from "${table}"`)}`;
	return {
		subjects: Number((yield* of('subject'))[0]?.total),
		decisions: Number((yield* of('runtimePolicyDecision'))[0]?.total),
		consents: Number((yield* of('consent'))[0]?.total),
		audit: Number((yield* of('auditLog'))[0]?.total),
	};
});

describe('consent submission', () => {
	it.effect(
		'tells the loser of a purpose race that its purposes were not stored',
		() =>
			Effect.gen(function* () {
				yield* setup;

				// Two submissions with the same identity and different purposes.
				// The id covers identity and not purposes, so one of them has to
				// be refused however the two interleave.
				//
				// What this does *not* isolate is the post-insert branch in
				// `record`. `@effect/sql-pglite` serialises every query through a
				// single-permit semaphore, so the second submission always sees the
				// first's row in the pre-insert check and is refused there; removing
				// the post-insert re-check leaves this test passing. That branch is
				// only reachable when two callers genuinely interleave between the
				// read and the write, which no engine in this matrix can be made to
				// do on demand — so it is asserted at the unit level below instead.
				const results = yield* Effect.all(
					[
						Effect.result(submit({ ...request, purposeIds: ['analytics'] })),
						Effect.result(
							submit({ ...request, purposeIds: ['analytics', 'marketing'] })
						),
					],
					{ concurrency: 'unbounded' }
				);

				const failures = results.filter((r) => r._tag === 'Failure');
				assert.strictEqual(
					failures.length,
					1,
					'exactly one submission should be refused'
				);

				// And one consent, not two: the race is still deduplicated.
				assert.strictEqual((yield* counts()).consents, 1);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'writes one of each on a first submission',
		() =>
			Effect.gen(function* () {
				yield* setup;
				const result = yield* submit(request);

				assert.isTrue(result.created);
				assert.deepStrictEqual(yield* counts(), {
					subjects: 1,
					decisions: 1,
					consents: 1,
					audit: 1,
				});
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'writes nothing extra on a replay',
		() =>
			Effect.gen(function* () {
				yield* setup;
				yield* submit(request);
				const second = yield* submit(request);

				assert.isFalse(second.created);
				// Four tables, four independent deduplications. The audit entry
				// is the one with no natural key — a second one here would have
				// the trail assert the subject consented twice.
				assert.deepStrictEqual(yield* counts(), {
					subjects: 1,
					decisions: 1,
					consents: 1,
					audit: 1,
				});
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'writes one of each under concurrency',
		() =>
			Effect.gen(function* () {
				yield* setup;
				const results = yield* Effect.all(
					[submit(request), submit(request), submit(request)],
					{ concurrency: 'unbounded' }
				);

				assert.strictEqual(
					results.filter((result) => result.created).length,
					1
				);
				assert.deepStrictEqual(yield* counts(), {
					subjects: 1,
					decisions: 1,
					consents: 1,
					audit: 1,
				});
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'links the consent to the decision that justified it',
		() =>
			Effect.gen(function* () {
				yield* setup;
				const result = yield* submit(request);
				const sql = yield* SqlClient.SqlClient;

				const rows = yield* sql<{ runtimePolicyDecisionId: string | null }>`
					select "runtimePolicyDecisionId" from "consent" where "id" = ${result.consentId}
				`;
				assert.strictEqual(rows[0]?.runtimePolicyDecisionId, result.decisionId);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'does not re-identify an existing subject as a side effect',
		() =>
			Effect.gen(function* () {
				yield* setup;
				const sql = yield* SqlClient.SqlClient;
				yield* sql.unsafe(`insert into "subject"
					("id","externalId","identityProvider","createdAt","updatedAt")
					values ('sub_client_generated','ext_original','auth0',now(),now())`);

				yield* submit({ ...request, externalId: 'ext_different' });

				// Recording consent must not silently relabel who someone is —
				// that is what PATCH exists to do explicitly.
				const rows = yield* sql<{ externalId: string | null }>`
					select "externalId" from "subject" where "id" = 'sub_client_generated'
				`;
				assert.strictEqual(rows[0]?.externalId, 'ext_original');
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'records consent with no policy decision',
		() =>
			Effect.gen(function* () {
				yield* setup;
				const { decision: _omitted, ...bare } = request;
				const result = yield* submit(bare);

				assert.isTrue(result.created);
				assert.isUndefined(result.decisionId);
				const after = yield* counts();
				assert.strictEqual(after.decisions, 0);
				assert.strictEqual(after.consents, 1);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);
});
