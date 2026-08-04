/**
 * The shared conformance suite, run against this backend.
 *
 * The expectations live in `@c15t/backend-conformance`, not here, and the same
 * suite runs against `@c15t/backend`. That is the point: a case cannot be
 * quietly weakened to make this implementation pass, because weakening it
 * would change what the shipped backend is held to as well.
 */

import {
	type Backend,
	CASES,
	type SeedFixture,
} from '@c15t/backend-conformance';
import { PgliteClient } from '@effect/sql-pglite';
import { Effect, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';
import { up as baseline } from '../db/migrations/1-baseline';
import { up as indexes } from '../db/migrations/2-hot-path-indexes';
import { createApp } from './app';

const API_KEY = 'sk_conformance';

let runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;
let backend: Backend;

beforeEach(async () => {
	runtime = ManagedRuntime.make(PgliteClient.layer({}));
	await runtime.runPromise(
		Effect.gen(function* () {
			yield* baseline;
			yield* indexes;
		})
	);

	const app = createApp(runtime, {
		apiKeys: [API_KEY],
		trustedOrigins: ['https://app.example.com'],
		version: '3.0.0-conformance',
	});

	backend = {
		name: 'backend',
		apiKey: API_KEY,
		reset: async () => {},
		seed: (fixture: SeedFixture) =>
			runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					for (const subject of fixture.subjects) {
						yield* sql`insert into "subject" ("id","externalId","identityProvider","createdAt","updatedAt")
							values (${subject.id}, ${subject.externalId ?? null},
								${subject.identityProvider ?? null}, ${new Date()}, ${new Date()})`;
					}
					for (const domain of fixture.domains) {
						yield* sql`insert into "domain" ("id","name","createdAt","updatedAt")
							values (${domain.id}, ${domain.name}, ${new Date()}, ${new Date()})`;
					}
					for (const policy of fixture.policies) {
						yield* sql`insert into "consentPolicy"
							("id","version","type","effectiveDate","isActive","createdAt")
							values (${policy.id}, ${policy.version}, ${policy.type},
								${policy.effectiveDate}, ${policy.isActive}, ${new Date()})`;
					}
					for (const consent of fixture.consents) {
						yield* sql`insert into "consent"
							("id","subjectId","domainId","policyId","purposeIds","givenAt")
							values (${consent.id}, ${consent.subjectId}, ${consent.domainId},
								${consent.policyId}, ${'[]'}, ${consent.givenAt})`;
					}
				})
			),
		request: (request) => app.request(request),
	};
});

afterEach(async () => {
	await runtime.dispose();
});

describe('conformance: backend', () => {
	for (const testCase of CASES) {
		const known = testCase.knownGap?.backend === 'backend';
		// A recorded gap still runs — if it starts passing, the record is stale
		// and should be removed rather than left to rot.
		it(testCase.name, async () => {
			if (testCase.seed) {
				await backend.seed(testCase.seed);
			}

			const response = await backend.request(
				testCase.request({ apiKey: backend.apiKey })
			);
			const body = await response
				.clone()
				.json()
				.catch(() => undefined);

			try {
				await testCase.expect(response, body);
				if (known) {
					assert.fail(
						`${testCase.name} now passes — remove its knownGap entry`
					);
				}
			} catch (error) {
				if (known) {
					return;
				}
				// Surface the rationale on failure: a conformance break should
				// say what behaviour was lost, not just which assertion tripped.
				assert.fail(
					`${testCase.name}\n  why it matters: ${testCase.rationale}\n  ${
						error instanceof Error ? error.message : String(error)
					}`
				);
			}
		});
	}
});
