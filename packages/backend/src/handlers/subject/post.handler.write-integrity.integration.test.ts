import { Kysely } from 'kysely';
import { KyselyPGlite } from 'kysely-pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type C15TInstance, c15tInstance } from '~/core';
import { kyselyAdapter } from '~/db/adapters/kysely';
import { DB } from '~/db/schema';
import { createSubjectCapability } from '~/write-integrity/subject-capability';

const SUBJECT_ID = 'sub_2jv6z8n4q9';
const DOMAIN = 'example.com';
const GIVEN_AT = 1_775_000_000_000;
const CAPABILITY_SECRET = 'integration-capability-secret-for-consent-writes';

describe('POST /subjects write integrity (Postgres integration)', () => {
	let database: Kysely<Record<string, never>>;
	let instance: C15TInstance;
	let orm: ReturnType<ReturnType<(typeof DB)['client']>['orm']>;
	let capabilityToken: string;

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
		orm = client.orm('2.1.0');

		instance = c15tInstance({
			adapter,
			disableGeoLocation: true,
			trustedOrigins: ['app.example.com'],
			writeIntegrity: {
				anonymousConsent: { mode: 'capability' },
				identityLinking: { mode: 'disabled' },
				domains: { allowlist: [DOMAIN] },
				subjectCapability: { signingKey: CAPABILITY_SECRET },
			},
		});

		const capability = await createSubjectCapability({
			options: { signingKey: CAPABILITY_SECRET },
			subjectId: SUBJECT_ID,
			action: 'consent:create',
			domain: DOMAIN,
		});
		capabilityToken = capability.token;
	}, 30_000);

	afterAll(async () => {
		await database.destroy();
	});

	const submit = (body: Record<string, unknown>) =>
		instance.handler(
			new Request('https://backend.example/subjects', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					origin: 'https://app.example.com',
				},
				body: JSON.stringify(body),
			})
		);

	it('persists scoped domain, replay state, and capability provenance', async () => {
		const body = {
			type: 'other',
			subjectId: SUBJECT_ID,
			domain: 'EXAMPLE.COM.',
			givenAt: GIVEN_AT,
			subjectCapability: capabilityToken,
		};

		const first = await submit(body);
		expect(first.status, await first.clone().text()).toBe(200);
		const retry = await submit(body);
		expect(retry.status, await retry.clone().text()).toBe(200);

		expect(await orm.count('consent')).toBe(1);
		expect(await orm.count('writeReplay')).toBe(1);
		expect(await orm.count('domain')).toBe(1);
		const consent = await orm.findFirst('consent', {
			where: (builder) => builder('subjectId', '=', SUBJECT_ID),
		});
		const domain = await orm.findFirst('domain', {
			where: (builder) => builder('name', '=', DOMAIN),
		});

		expect(consent).toMatchObject({
			writeSource: 'subject_capability',
			writeOrigin: 'https://app.example.com',
		});
		expect(consent?.writeCredentialId).toBeTruthy();
		expect(consent?.writeIssuer).toBe('c15t');
		expect(domain?.scopeKey).toMatch(/^domain:[a-f0-9]{64}$/);
	});

	it('rejects altered reuse of the consumed capability', async () => {
		const response = await submit({
			type: 'other',
			subjectId: SUBJECT_ID,
			domain: DOMAIN,
			givenAt: GIVEN_AT,
			metadata: { altered: true },
			subjectCapability: capabilityToken,
		});

		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toMatchObject({
			code: 'SUBJECT_CAPABILITY_REPLAYED',
		});
		expect(await orm.count('consent')).toBe(1);
	});
});
