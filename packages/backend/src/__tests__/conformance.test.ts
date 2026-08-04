/**
 * The shared conformance suite, run against this backend.
 *
 * This is the half that makes the suite mean something. The expectations in
 * `@c15t/backend-conformance` were written by reading this implementation, so
 * until they actually run against it they are a description of what the
 * rewrite *believes* v2 does. Running them here turns each case into a
 * characterisation of real behaviour, and any case that fails is a case that
 * was mis-specified — a bug in the expectation, not in the shipped backend.
 *
 * Both runners execute the identical `CASES` array. Neither package owns the
 * expectations, so making one pass cannot quietly change what the other is
 * held to.
 */

import { CASES, type SeedFixture } from '@c15t/backend-conformance';
import { Kysely } from 'kysely';
import { KyselyPGlite } from 'kysely-pglite';
import { afterAll, assert, beforeEach, describe, it } from 'vitest';
import { type C15TInstance, c15tInstance } from '~/core';
import { kyselyAdapter } from '~/db/adapters/kysely';
import { DB } from '~/db/schema';

const API_KEY = 'sk_conformance';

let database: Kysely<Record<string, never>>;
let instance: C15TInstance;
let orm: ReturnType<ReturnType<(typeof DB)['client']>['orm']>;

/**
 * A fresh database per case.
 *
 * The suite assumes isolation — a case that inherited another's rows would
 * pass or fail on ordering rather than on behaviour.
 */
beforeEach(async () => {
	const pglite = await KyselyPGlite.create();
	database = new Kysely({ dialect: pglite.dialect });

	const client = DB.client(
		kyselyAdapter({ db: database, provider: 'postgresql' })
	);
	const migration = await client
		.createMigrator()
		.migrateToLatest({ mode: 'from-database' });
	await migration.execute();
	orm = client.orm('2.0.0');

	instance = c15tInstance({
		adapter: kyselyAdapter({ db: database, provider: 'postgresql' }),
		appName: 'conformance',
		disableGeoLocation: true,
		apiKeys: [API_KEY],
		trustedOrigins: ['https://app.example.com'],
		logger: { level: 'error', log: () => {} },
	});
});

afterAll(async () => {
	await database?.destroy();
});

const seed = async (fixture: SeedFixture) => {
	for (const subject of fixture.subjects) {
		await orm.create('subject', {
			id: subject.id,
			externalId: subject.externalId ?? null,
			identityProvider: subject.identityProvider ?? 'anonymous',
		});
	}
	for (const domain of fixture.domains) {
		await orm.create('domain', { id: domain.id, name: domain.name });
	}
	for (const policy of fixture.policies) {
		await orm.create('consentPolicy', {
			id: policy.id,
			version: policy.version,
			type: policy.type,
			effectiveDate: policy.effectiveDate,
			isActive: policy.isActive,
		});
	}
	for (const consent of fixture.consents) {
		await orm.create('consent', {
			id: consent.id,
			subjectId: consent.subjectId,
			domainId: consent.domainId,
			policyId: consent.policyId,
			purposeIds: [],
			givenAt: consent.givenAt,
		});
	}
};

describe('conformance: @c15t/backend', () => {
	for (const testCase of CASES) {
		const known = testCase.knownGap?.backend === '@c15t/backend';
		// A recorded gap still runs — if it starts passing, the record is stale
		// and should be removed rather than left to rot.
		it(testCase.name, async () => {
			if (testCase.seed) {
				await seed(testCase.seed);
			}

			const response = await instance.handler(
				testCase.request({ apiKey: API_KEY })
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
				assert.fail(
					`${testCase.name}\n  why it matters: ${testCase.rationale}\n  ${
						error instanceof Error ? error.message : String(error)
					}`
				);
			}
		});
	}
});
