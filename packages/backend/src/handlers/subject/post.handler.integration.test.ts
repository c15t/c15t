import { Kysely } from 'kysely';
import { KyselyPGlite } from 'kysely-pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { type C15TInstance, c15tInstance } from '~/core';
import { kyselyAdapter } from '~/db/adapters/kysely';
import { DB } from '~/db/schema';
import { buildConsentId } from './post.handler';

const GIVEN_AT = 1_700_000_000_000;

interface ConsentResponse {
	consentId: string;
	givenAt: string;
}

describe('POST /subjects consent idempotency (Postgres integration)', () => {
	let database: Kysely<Record<string, never>>;
	let instance: C15TInstance;
	let orm: ReturnType<ReturnType<(typeof DB)['client']>['orm']>;
	let consentColumnNames: string[];
	let observedConstraintCode: string | undefined;

	const log = vi.fn();

	beforeAll(async () => {
		const pglite = await KyselyPGlite.create();
		database = new Kysely({ dialect: pglite.dialect });

		const adapter = kyselyAdapter({
			db: database,
			provider: 'postgresql',
		});
		const client = DB.client(adapter);

		const migration = await client
			.createMigrator()
			.migrateToLatest({ mode: 'from-database' });
		await migration.execute();
		consentColumnNames =
			(await database.introspection.getTables())
				.find((table) => table.name === 'consent')
				?.columns.map((column) => column.name) ?? [];
		orm = client.orm('2.0.0');

		await orm.create('subject', {
			id: 'sub_integration',
			externalId: null,
			identityProvider: 'anonymous',
		});
		await orm.create('domain', {
			id: 'dom_integration',
			name: 'integration.example',
		});
		await orm.create('consentPolicy', {
			id: 'pol_integration',
			version: '1.0.0',
			type: 'other',
			effectiveDate: new Date(GIVEN_AT),
			isActive: true,
		});

		const winningConsentId = await buildConsentId({
			subjectId: 'sub_integration',
			domainId: 'dom_integration',
			policyId: 'pol_integration',
			givenAt: new Date(GIVEN_AT),
		});
		await orm.create('consent', {
			id: winningConsentId,
			subjectId: 'sub_integration',
			domainId: 'dom_integration',
			policyId: 'pol_integration',
			purposeIds: { json: [] },
			givenAt: new Date(GIVEN_AT),
		});

		let forceConflict = true;
		let transactionStarted = false;
		const concurrentAdapter: typeof adapter = {
			...adapter,
			createORM(schema) {
				const realOrm = adapter.createORM.call(this, schema);
				const findFirst = realOrm.findFirst.bind(realOrm);
				const transaction = realOrm.transaction.bind(realOrm);

				realOrm.findFirst = (async (...args) => {
					// Model the race where the winner is not visible to either
					// pre-transaction lookup, then becomes visible after rollback.
					if (args[0] === 'consent' && forceConflict && !transactionStarted) {
						return null;
					}
					return findFirst(...args);
				}) as typeof realOrm.findFirst;

				realOrm.transaction = (async (run) => {
					const observeConflict = forceConflict;
					transactionStarted = true;

					try {
						return await transaction(run);
					} catch (error) {
						if (
							observeConflict &&
							typeof error === 'object' &&
							error !== null &&
							'code' in error &&
							typeof error.code === 'string'
						) {
							observedConstraintCode = error.code;
						}
						throw error;
					} finally {
						if (observeConflict) {
							forceConflict = false;
						}
					}
				}) as typeof realOrm.transaction;

				return realOrm;
			},
		};

		instance = c15tInstance({
			adapter: concurrentAdapter,
			appName: 'consent-idempotency-integration',
			disableGeoLocation: true,
			logger: {
				level: 'debug',
				log,
			},
			trustedOrigins: ['localhost'],
		});
	}, 30_000);

	afterAll(async () => {
		await database.destroy();
	});

	const submitConsent = async (givenAt = GIVEN_AT) => {
		const response = await instance.handler(
			new Request('http://localhost/subjects', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					origin: 'http://localhost',
				},
				body: JSON.stringify({
					type: 'other',
					subjectId: 'sub_integration',
					domain: 'integration.example',
					givenAt,
				}),
			})
		);

		const body = (await response.json()) as ConsentResponse;
		expect(response.status, JSON.stringify(body)).toBe(200);
		return body;
	};

	it('recovers a real PK conflict and keeps concurrent submissions idempotent', async () => {
		expect(consentColumnNames).toContain('id');
		expect(consentColumnNames).not.toContain('dedupeKey');

		const recovered = await submitConsent();
		expect(observedConstraintCode).toBe('23505');
		expect(await orm.count('consent')).toBe(1);
		expect(log).toHaveBeenCalledWith(
			'debug',
			'Consent insert conflicted, returning existing record',
			expect.objectContaining({ consentId: recovered.consentId })
		);

		const [first, second] = await Promise.all([
			submitConsent(GIVEN_AT + 1),
			submitConsent(GIVEN_AT + 1),
		]);

		expect(second.consentId).toBe(first.consentId);
		expect(await orm.count('consent')).toBe(2);

		const retry = await submitConsent(GIVEN_AT + 1);
		expect(retry.consentId).toBe(first.consentId);
		expect(await orm.count('consent')).toBe(2);

		const distinct = await submitConsent(GIVEN_AT + 2);
		expect(distinct.consentId).not.toBe(first.consentId);
		expect(await orm.count('consent')).toBe(3);
	});
});
