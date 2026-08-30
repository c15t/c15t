/**
 * The shared conformance suite, run against this backend.
 *
 * The expectations live in `@c15t/backend-conformance`, not here, and the same
 * suite runs against `@c15t/backend`. That is the point: a case cannot be
 * quietly weakened to make this implementation pass, because weakening it
 * would change what the shipped backend is held to as well.
 */

import { CASES } from '@c15t/backend-conformance';
import type { Backend, SeedFixture } from '@c15t/backend-conformance';
import { Effect, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import { ENGINES, resetDatabase } from '../__tests__/engines';
import { up as baseline } from '../db/migrations/1-baseline';
import { up as indexes } from '../db/migrations/2-hot-path-indexes';
import { encodeRow, encoder } from '../db/values';
import { createApp } from './app';

const API_KEY = 'sk_conformance';

for (const engine of ENGINES) {
	let runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;
	let backend: Backend;

	beforeEach(async () => {
		runtime = ManagedRuntime.make(engine.client);
		await runtime.runPromise(
			Effect.gen(function* () {
				yield* resetDatabase;
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
						// Through the encoder and the dialect's own quoting: the same
						// fixture has to load on all four engines or the wire contract
						// is only proven on one.
						const encode = yield* encoder;
						const now = new Date(1_800_000_000_000);

						for (const subject of fixture.subjects) {
							yield* sql`insert into ${sql('subject')} ${sql.insert(
								encodeRow(encode, {
									id: subject.id,
									externalId: subject.externalId ?? null,
									identityProvider: subject.identityProvider ?? null,
									createdAt: now,
									updatedAt: now,
								})
							)}`;
						}
						for (const domain of fixture.domains) {
							yield* sql`insert into ${sql('domain')} ${sql.insert(
								encodeRow(encode, {
									id: domain.id,
									name: domain.name,
									createdAt: now,
									updatedAt: now,
								})
							)}`;
						}
						for (const policy of fixture.policies) {
							yield* sql`insert into ${sql('consentPolicy')} ${sql.insert(
								encodeRow(encode, {
									id: policy.id,
									version: policy.version,
									type: policy.type,
									effectiveDate: policy.effectiveDate,
									isActive: policy.isActive,
									createdAt: now,
								})
							)}`;
						}
						for (const consent of fixture.consents) {
							yield* sql`insert into ${sql('consent')} ${sql.insert(
								encodeRow(encode, {
									id: consent.id,
									subjectId: consent.subjectId,
									domainId: consent.domainId,
									policyId: consent.policyId,
									purposeIds: '[]',
									givenAt: consent.givenAt,
								})
							)}`;
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
}
