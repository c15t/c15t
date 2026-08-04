import { Kysely } from 'kysely';
import { KyselyPGlite } from 'kysely-pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type C15TInstance, c15tInstance } from '~/core';
import { kyselyAdapter } from '~/db/adapters/kysely';
import { DB } from '~/db/schema';
import { createIdentityAssertion } from '~/write-integrity/identity-assertion';
import { createSubjectCapability } from '~/write-integrity/subject-capability';

const DOMAIN = 'example.com';
const CAPABILITY_SECRET = 'integration-capability-secret-for-identity-writes';
const ASSERTION_SECRET = 'integration-assertion-secret-for-identity-writes';

describe('PATCH /subjects/:id write integrity (Postgres integration)', () => {
	let database: Kysely<Record<string, never>>;
	let instance: C15TInstance;
	let legacyInstance: C15TInstance;
	let orm: ReturnType<ReturnType<(typeof DB)['client']>['orm']>;

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
				anonymousConsent: { mode: 'public' },
				identityLinking: {
					mode: 'capability-and-assertion',
					reassignment: 'disabled',
				},
				domains: { allowlist: [DOMAIN] },
				subjectCapability: { signingKey: CAPABILITY_SECRET },
				identityAssertion: { verificationKey: ASSERTION_SECRET },
			},
		});
		legacyInstance = c15tInstance({
			adapter,
			disableGeoLocation: true,
			trustedOrigins: ['app.example.com'],
		});
	}, 30_000);

	afterAll(async () => {
		await database.destroy();
	});

	const createSubject = (subjectId: string) =>
		orm.create('subject', {
			id: subjectId,
			externalId: null,
			identityProvider: 'anonymous',
		});

	const createProofs = async (params: {
		subjectId: string;
		externalId: string;
		identityProvider?: string;
	}) => {
		const identityProvider = params.identityProvider ?? 'clerk';
		const capability = await createSubjectCapability({
			options: { signingKey: CAPABILITY_SECRET },
			subjectId: params.subjectId,
			action: 'identity:link',
			domain: DOMAIN,
		});
		const assertion = await createIdentityAssertion({
			options: { signingKey: ASSERTION_SECRET },
			subjectId: params.subjectId,
			action: 'identity:link',
			domain: DOMAIN,
			externalId: params.externalId,
			identityProvider,
		});

		return {
			domain: DOMAIN,
			externalId: params.externalId,
			identityProvider,
			subjectCapability: capability.token,
			identityAssertion: assertion.token,
		};
	};

	const patch = (subjectId: string, body: Record<string, unknown>) =>
		instance.handler(
			new Request(`https://backend.example/subjects/${subjectId}`, {
				method: 'PATCH',
				headers: {
					'content-type': 'application/json',
					origin: 'https://app.example.com',
				},
				body: JSON.stringify(body),
			})
		);

	it('preserves legacy public replacement when configuration is omitted', async () => {
		const subjectId = 'sub_2jv6z8n4qE';
		await orm.create('subject', {
			id: subjectId,
			externalId: 'user_before',
			identityProvider: 'legacy',
		});
		const response = await legacyInstance.handler(
			new Request(`https://backend.example/subjects/${subjectId}`, {
				method: 'PATCH',
				headers: {
					'content-type': 'application/json',
					origin: 'https://app.example.com',
				},
				body: JSON.stringify({
					externalId: 'user_after',
					identityProvider: 'legacy',
				}),
			})
		);

		expect(response.status, await response.clone().text()).toBe(200);
		const subject = await orm.findFirst('subject', {
			where: (builder) => builder('id', '=', subjectId),
		});
		expect(subject?.externalId).toBe('user_after');
	});

	it('requires both proofs, records provenance, and allows exact retries', async () => {
		const subjectId = 'sub_2jv6z8n4qA';
		await createSubject(subjectId);
		const body = await createProofs({
			subjectId,
			externalId: 'user_123',
		});

		const missingProofs = await patch(subjectId, {
			domain: DOMAIN,
			externalId: 'user_123',
			identityProvider: 'clerk',
		});
		expect(missingProofs.status).toBe(401);

		const first = await patch(subjectId, body);
		expect(first.status, await first.clone().text()).toBe(200);
		const retry = await patch(subjectId, body);
		expect(retry.status, await retry.clone().text()).toBe(200);

		const subject = await orm.findFirst('subject', {
			where: (builder) => builder('id', '=', subjectId),
		});
		const audit = await orm.findFirst('auditLog', {
			where: (builder) => builder('subjectId', '=', subjectId),
		});
		expect(subject).toMatchObject({
			externalId: 'user_123',
			identityProvider: 'clerk',
		});
		expect(audit?.metadata).toMatchObject({
			writeProvenance: {
				source: 'identity_assertion',
				domain: DOMAIN,
				credentials: [
					{ type: 'subject_capability' },
					{ type: 'identity_assertion' },
				],
			},
		});
		expect(
			await orm.count('auditLog', {
				where: (builder) => builder('subjectId', '=', subjectId),
			})
		).toBe(1);
		expect(await orm.count('writeReplay')).toBe(2);
	});

	it('rejects reassignment when it is disabled', async () => {
		const subjectId = 'sub_2jv6z8n4qB';
		await createSubject(subjectId);
		const body = await createProofs({
			subjectId,
			externalId: 'user_original',
		});
		expect((await patch(subjectId, body)).status).toBe(200);

		const response = await patch(subjectId, {
			domain: DOMAIN,
			externalId: 'user_replacement',
			identityProvider: 'clerk',
		});
		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toMatchObject({
			code: 'IDENTITY_REASSIGNMENT_DISABLED',
		});
	});

	it('applies the same proof rules to identity supplied during consent creation', async () => {
		const subjectId = 'sub_2jv6z8n4qD';
		const proofs = await createProofs({
			subjectId,
			externalId: 'user_from_consent',
		});
		const response = await instance.handler(
			new Request('https://backend.example/subjects', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					origin: 'https://app.example.com',
				},
				body: JSON.stringify({
					type: 'other',
					subjectId,
					domain: DOMAIN,
					givenAt: 1_775_000_000_100,
					externalSubjectId: proofs.externalId,
					identityProvider: proofs.identityProvider,
					identitySubjectCapability: proofs.subjectCapability,
					identityAssertion: proofs.identityAssertion,
				}),
			})
		);

		expect(response.status, await response.clone().text()).toBe(200);
		const subject = await orm.findFirst('subject', {
			where: (builder) => builder('id', '=', subjectId),
		});
		expect(subject).toMatchObject({
			externalId: 'user_from_consent',
			identityProvider: 'clerk',
		});
	});

	it('allows only one concurrent initial assignment', async () => {
		const subjectId = 'sub_2jv6z8n4qC';
		await createSubject(subjectId);
		const [firstBody, secondBody] = await Promise.all([
			createProofs({ subjectId, externalId: 'user_a' }),
			createProofs({ subjectId, externalId: 'user_b' }),
		]);

		const responses = await Promise.all([
			patch(subjectId, firstBody),
			patch(subjectId, secondBody),
		]);
		expect(responses.map((response) => response.status).sort()).toEqual([
			200, 409,
		]);
		const subject = await orm.findFirst('subject', {
			where: (builder) => builder('id', '=', subjectId),
		});
		expect(['user_a', 'user_b']).toContain(subject?.externalId);
	});
});
