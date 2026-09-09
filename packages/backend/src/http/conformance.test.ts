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
import { up as receipts } from '../db/migrations/3-consent-receipts-and-privacy-directives';
import { encodeRow, encoder } from '../db/values';
import { createApp } from './app';

const API_KEY = 'sk_conformance';

for (const engine of ENGINES) {
	let runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;
	let backend: Backend;

	beforeEach(async () => {
		runtime = ManagedRuntime.make(engine.client);
		await runtime.runPromise(
			Effect.gen(function* gen() {
				yield* resetDatabase;
				yield* baseline;
				yield* indexes;
				yield* receipts;
			})
		);

		const app = createApp(runtime, {
			apiKeys: [API_KEY],
			trustedOrigins: ['https://app.example.com'],
			version: '3.0.0-conformance',
		});

		backend = {
			apiKey: API_KEY,
			name: 'backend',
			request: (request) => app.request(request),
			reset: async () => {},
			seed: (fixture: SeedFixture) =>
				runtime.runPromise(
					Effect.gen(function* gen() {
						const sql = yield* SqlClient.SqlClient;
						// Through the encoder and the dialect's own quoting: the same
						// fixture has to load on all four engines or the wire contract
						// is only proven on one.
						const encode = yield* encoder;
						const now = new Date(1_800_000_000_000);

						for (const subject of fixture.subjects) {
							yield* sql`insert into ${sql('subject')} ${sql.insert(
								encodeRow(encode, {
									createdAt: now,
									externalId: subject.externalId ?? null,
									id: subject.id,
									identityProvider: subject.identityProvider ?? null,
									updatedAt: now,
								})
							)}`;
						}
						for (const domain of fixture.domains) {
							yield* sql`insert into ${sql('domain')} ${sql.insert(
								encodeRow(encode, {
									createdAt: now,
									id: domain.id,
									name: domain.name,
									updatedAt: now,
								})
							)}`;
						}
						for (const policy of fixture.policies) {
							yield* sql`insert into ${sql('consentPolicy')} ${sql.insert(
								encodeRow(encode, {
									createdAt: now,

									effectiveDate: policy.effectiveDate,
									id: policy.id,
									isActive: policy.isActive,
									type: policy.type,
									version: policy.version,
								})
							)}`;
						}
						for (const consent of fixture.consents) {
							yield* sql`insert into ${sql('consent')} ${sql.insert(
								encodeRow(encode, {
									domainId: consent.domainId,
									givenAt: consent.givenAt,

									id: consent.id,
									policyId: consent.policyId,
									purposeIds: '[]',
									subjectId: consent.subjectId,
								})
							)}`;
						}
					})
				),
		};
	});

	afterEach(async () => {
		await runtime.dispose();
	});

	const createBackendConformanceTest =
		(currentTestCase: (typeof CASES)[number], known: boolean) => async () => {
			if (currentTestCase.seed) {
				await backend.seed(currentTestCase.seed);
			}

			const response = await backend.request(
				currentTestCase.request({ apiKey: backend.apiKey })
			);
			const body = await response
				.clone()
				.json()
				.catch(() => undefined);

			try {
				await currentTestCase.expect(response, body);
				if (known) {
					assert.fail(
						`${currentTestCase.name} now passes — remove its knownGap entry`
					);
				}
			} catch (error) {
				if (known) {
					return;
				}
				// Surface the rationale on failure: a conformance break should
				// say what behaviour was lost, not just which assertion tripped.
				assert.fail(
					`${currentTestCase.name}\n  why it matters: ${currentTestCase.rationale}\n  ${
						error instanceof Error ? error.message : String(error)
					}`
				);
			}
		};

	describe('conformance: backend', () => {
		for (const testCase of CASES) {
			const currentTestCase = testCase;
			const known = currentTestCase.knownGap?.backend === 'backend';
			// A recorded gap still runs — if it starts passing, the record is stale
			// and should be removed rather than left to rot.
			it(
				currentTestCase.name,
				createBackendConformanceTest(currentTestCase, known)
			);
		}
	});
}
