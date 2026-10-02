/**
 * The client against the real backend, in process.
 *
 * Requests go through `c15tInstance(...).handler` on a SQLite database, so
 * every success shape and error code below is what the shipped backend
 * actually sends, not what a fixture claims it sends. No network is used.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { c15tInstance, createMigrator } from '@c15t/backend';
import type { C15TInstance, C15TOptions } from '@c15t/backend';
import type { PolicyRule } from '@c15t/schema/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createC15tClient } from '../index';
import type {
	C15tClient,
	C15tCreateSubjectInput,
	C15tPublicClient,
	LegalDocumentPolicyType,
} from '../index';
import { dataOf, errorOf } from './result-helpers';

const API_KEY = 'sk_test';
const BASE_URL = 'https://api.test/api/c15t';
const SIGNING_KEY = 'sdk-conformance-signing-key-32-chars-min';

/** EU visitors get a strict opt-in scoped to marketing and measurement. */
const RULES: PolicyRule[] = [
	{
		categories: ['marketing', 'measurement'],
		id: 'eu_opt_in',
		match: { countries: ['DE'] },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'strict',
	},
	{
		id: 'world_opt_out',
		match: { isDefault: true },
		model: 'opt-out',
		prompt: 'none',
	},
];

type FetchInput = Parameters<typeof fetch>[0];

type BackendOptions = Omit<C15TOptions, 'basePath' | 'database'>;

let directory: string;
let database: C15TOptions['database'];
const instances: C15TInstance[] = [];

const startBackend = (
	options: BackendOptions,
	db: C15TOptions['database'] = database
): C15TInstance => {
	const instance = c15tInstance({
		apiKeys: [API_KEY],
		basePath: '/api/c15t',
		database: db,
		...options,
	});
	instances.push(instance);
	return instance;
};

interface Connection<Client> {
	readonly client: Client;
	/** Every request the client sent, in order. */
	readonly requests: Request[];
}

const recordingFetch = (instance: C15TInstance, requests: Request[]) =>
	function fetch(input: FetchInput, init?: RequestInit) {
		const request = new Request(input, init);
		requests.push(request.clone());
		return instance.handler(request);
	};

const connect = (
	instance: C15TInstance,
	apiKey = API_KEY
): Connection<C15tClient> => {
	const requests: Request[] = [];
	return {
		client: createC15tClient({
			apiKey,
			baseUrl: BASE_URL,
			fetch: recordingFetch(instance, requests),
		}),
		requests,
	};
};

const connectPublic = (
	instance: C15TInstance
): Connection<C15tPublicClient> => {
	const requests: Request[] = [];
	return {
		client: createC15tClient({
			baseUrl: BASE_URL,
			fetch: recordingFetch(instance, requests),
		}),
		requests,
	};
};

/** A fresh id in the backend's `sub_` + base58 format. */
const newSubjectId = (): string =>
	`sub_${crypto.randomUUID().replaceAll(/[^1-9A-HJ-NP-Za-km-z]/gu, '')}`;

const cookieBanner = (
	overrides: Partial<Record<string, unknown>> = {}
): C15tCreateSubjectInput =>
	({
		domain: 'example.com',
		givenAt: Date.now() - 1000,
		preferences: { measurement: true, necessary: true },
		subjectId: newSubjectId(),
		type: 'cookie_banner',
		...overrides,
	}) as C15tCreateSubjectInput;

let main: C15TInstance;
let api: Connection<C15tClient>;

beforeAll(async () => {
	directory = await mkdtemp(join(tmpdir(), 'c15t-node-sdk-'));
	database = { dialect: 'sqlite', filename: join(directory, 'c15t.sqlite') };
	const migrator = createMigrator(database);
	await migrator.apply();
	await migrator.dispose();

	main = startBackend({ manifest: { appName: 'SDK conformance' } });
	api = connect(main);
});

afterAll(async () => {
	await Promise.all(instances.map((instance) => instance.dispose()));
	await rm(directory, { force: true, recursive: true });
});

describe('success shapes', () => {
	it('status revives the timestamp and keeps the base path prefix', async () => {
		const { client, requests } = connect(main);

		const result = await client.status();

		const data = dataOf(result);
		expect(data.timestamp).toBeInstanceOf(Date);
		expect(Number.isNaN(data.timestamp.getTime())).toBe(false);
		expect(result.ok && result.status).toBe(200);
		expect(new URL(requests[0]?.url ?? '').pathname).toBe('/api/c15t/status');
	});

	it('init sends the visitor context the backend resolves against', async () => {
		const data = dataOf(await api.client.init({ country: 'DE', region: 'BE' }));

		expect(data.location).toMatchObject({
			countryCode: 'DE',
			regionCode: 'BE',
		});
		expect(data.jurisdiction).toBeDefined();
	});

	it('manifest answers 200 with an etag, then not-modified for that etag', async () => {
		const first = dataOf(await api.client.manifest());
		expect(first.status).toBe('modified');
		expect(first.etag).toEqual(expect.any(String));

		const second = await api.client.manifest({ ifNoneMatch: first.etag });

		expect(second.ok && second.status).toBe(304);
		expect(dataOf(second)).toEqual({
			etag: first.etag,
			status: 'not-modified',
		});
	});

	it('subjects.create returns the recorded consent without the wire ok flag', async () => {
		const givenAt = new Date(Date.now() - 5000);
		const input = cookieBanner({ givenAt });

		const data = dataOf(await api.client.subjects.create(input));

		expect(data).not.toHaveProperty('ok');
		expect(data.givenAt).toBeInstanceOf(Date);
		expect(data.givenAt.getTime()).toBe(givenAt.getTime());
		expect(data.subjectId).toBe(input.subjectId);
		expect(data.consentId).toEqual(expect.any(String));
	});

	it('a retried subjects.create resolves to the same consent', async () => {
		const input = cookieBanner();

		const first = dataOf(await api.client.subjects.create(input));
		const second = dataOf(await api.client.subjects.create(input));

		expect(second.consentId).toBe(first.consentId);
	});

	it('subjects.get revives subject and consent dates', async () => {
		const input = cookieBanner();
		dataOf(await api.client.subjects.create(input));

		const data = dataOf(await api.client.subjects.get(input.subjectId));

		expect(data.subject.id).toBe(input.subjectId);
		expect(data.subject.createdAt).toBeInstanceOf(Date);
		expect(data.consents).toHaveLength(1);
		const [consent] = data.consents;
		expect(consent?.givenAt).toBeInstanceOf(Date);
		expect(consent?.givenAt.getTime()).toBe(input.givenAt);
		expect(consent?.policyEffectiveDate).toBeInstanceOf(Date);
	});

	it('subjects.get filters consents by type', async () => {
		const input = cookieBanner();
		dataOf(await api.client.subjects.create(input));

		const data = dataOf(
			await api.client.subjects.get(input.subjectId, {
				types: ['privacy_policy'],
			})
		);

		expect(data.consents).toEqual([]);
	});

	it('subjects.identify links an external id', async () => {
		const input = cookieBanner();
		dataOf(await api.client.subjects.create(input));

		const data = dataOf(
			await api.client.subjects.identify(input.subjectId, {
				externalId: 'user_identify',
			})
		);

		expect(data.subject).toMatchObject({
			externalId: 'user_identify',
			id: input.subjectId,
		});
	});

	it('subjects.list revives subject and consent dates', async () => {
		const input = cookieBanner();
		dataOf(await api.client.subjects.create(input));
		dataOf(
			await api.client.subjects.identify(input.subjectId, {
				externalId: 'user_list',
			})
		);

		const data = dataOf(
			await api.client.subjects.list({ externalId: 'user_list' })
		);

		expect(data.subjects).toHaveLength(1);
		const [subject] = data.subjects;
		expect(subject?.id).toBe(input.subjectId);
		expect(subject?.createdAt).toBeInstanceOf(Date);
		expect(subject?.consents[0]?.givenAt).toBeInstanceOf(Date);
	});

	it('consents.check reports every requested type', async () => {
		const input = cookieBanner();
		dataOf(await api.client.subjects.create(input));
		dataOf(
			await api.client.subjects.identify(input.subjectId, {
				externalId: 'user_check',
			})
		);

		const data = dataOf(
			await api.client.consents.check({
				externalId: 'user_check',
				types: ['cookie_banner', 'privacy_policy', 'marketing_communications'],
			})
		);

		expect(new Set(Object.keys(data.results))).toEqual(
			new Set(['cookie_banner', 'marketing_communications', 'privacy_policy'])
		);
		expect(data.results.cookie_banner.hasConsent).toBe(true);
		expect(data.results.privacy_policy.hasConsent).toBe(false);
		expect(data.results.marketing_communications.hasConsent).toBe(false);
	});

	it('experiments.summary returns the arms', async () => {
		const data = dataOf(
			await api.client.experiments.summary('exp_conformance', {
				from: new Date('2026-01-01T00:00:00Z'),
				to: '2026-12-31',
			})
		);

		expect(data.experimentId).toBe('exp_conformance');
		expect(data.arms).toEqual([]);
	});

	it('legalDocuments.publish revives the effective date', async () => {
		const effectiveDate = new Date('2026-01-01T00:00:00Z');

		const data = dataOf(
			await api.client.legalDocuments.publish('privacy_policy', {
				effectiveDate,
				hash: 'sha256:publish',
				version: '2026-01-01',
			})
		);

		expect(data.policy.effectiveDate).toBeInstanceOf(Date);
		expect(data.policy.effectiveDate.getTime()).toBe(effectiveDate.getTime());
		expect(data.policy).toMatchObject({
			hash: 'sha256:publish',
			isActive: true,
			type: 'privacy_policy',
			version: '2026-01-01',
		});
	});
});

describe('typed backend errors', () => {
	it('subjects.get on an unknown id is NOT_FOUND', async () => {
		const error = errorOf(await api.client.subjects.get(newSubjectId()));

		expect(error.code).toBe('NOT_FOUND');
		expect(error.status).toBe(404);
		expect(error.requestId).toEqual(expect.any(String));
	});

	it('subjects.identify on an unknown id is NOT_FOUND', async () => {
		const error = errorOf(
			await api.client.subjects.identify(newSubjectId(), {
				externalId: 'user_missing',
			})
		);

		expect(error.code).toBe('NOT_FOUND');
	});

	it.each([
		[
			'subjects.list',
			(client: C15tClient) => client.subjects.list({ externalId: 'user_1' }),
		],
		[
			'experiments.summary',
			(client: C15tClient) => client.experiments.summary('exp_1'),
		],
		[
			'legalDocuments.publish',
			(client: C15tClient) =>
				client.legalDocuments.publish('privacy_policy', {
					effectiveDate: '2026-01-01T00:00:00Z',
					hash: 'sha256:unauthorized',
					version: '2026-01-01',
				}),
		],
	] as const)('%s with a wrong key is UNAUTHORIZED', async (_name, call) => {
		const { client } = connect(main, 'sk_wrong');

		const error = errorOf(await call(client));

		expect(error.code).toBe('UNAUTHORIZED');
		expect(error.status).toBe(401);
	});

	it('subjects.create reports a resubmission with different purposes as CONFLICT', async () => {
		const input = cookieBanner();
		dataOf(await api.client.subjects.create(input));

		const error = errorOf(
			await api.client.subjects.create({
				...input,
				preferences: { marketing: true, measurement: false, necessary: true },
			})
		);

		expect(error.code).toBe('CONFLICT');
		expect(error.status).toBe(409);
	});

	it('subjects.create reports a subject owned by another tenant as SUBJECT_CONFLICT', async () => {
		const input = cookieBanner();
		dataOf(await api.client.subjects.create(input));
		const otherTenant = connect(startBackend({ tenantId: 'tenant_other' }));

		const error = errorOf(await otherTenant.client.subjects.create(input));

		expect(error.code).toBe('SUBJECT_CONFLICT');
	});

	it('subjects.create refuses a receipt that disagrees with preferences', async () => {
		const givenAt = Date.now() - 1000;

		const error = errorOf(
			await api.client.subjects.create(
				cookieBanner({
					choice: {
						categories: {
							measurement: {
								basis: { kind: 'legacy-v2' },
								confirmedAt: givenAt,
								value: true,
							},
						},
						version: 3,
					},
					givenAt,
					preferences: { measurement: false, necessary: true },
				})
			)
		);

		expect(error.code).toBe('CHOICE_PREFERENCE_MISMATCH');
	});

	it('subjects.create refuses a givenAt later than the server clock', async () => {
		const error = errorOf(
			await api.client.subjects.create(
				cookieBanner({ givenAt: Date.now() + 3_600_000 })
			)
		);

		expect(error.code).toBe('INPUT_VALIDATION_FAILED');
		expect(error.status).toBe(400);
	});

	it('STALE_POLICY carries reason incomplete-inputs', async () => {
		const error = errorOf(
			await api.client.subjects.create(cookieBanner({ country: 'DE' }))
		);

		expect(error.code).toBe('STALE_POLICY');
		expect(error.reason).toBe('incomplete-inputs');
		expect(error.status).toBe(422);
	});

	it('STALE_POLICY carries reason decision-mismatch', async () => {
		const error = errorOf(
			await api.client.subjects.create(
				cookieBanner({ fingerprint: 'fp_stale', policyId: 'missing_policy' })
			)
		);

		expect(error.code).toBe('STALE_POLICY');
		expect(error.reason).toBe('decision-mismatch');
	});

	it('an unverifiable snapshot token is POLICY_SNAPSHOT_INVALID', async () => {
		const error = errorOf(
			await api.client.subjects.create(
				cookieBanner({ policySnapshotToken: 'not-a-token' })
			)
		);

		expect(error.code).toBe('POLICY_SNAPSHOT_INVALID');
		expect(error.reason).toBeUndefined();
	});

	it('legalDocuments.publish reports changed metadata for a published hash as CONFLICT', async () => {
		const release = {
			effectiveDate: '2026-02-01T00:00:00Z',
			hash: 'sha256:conflict',
			version: '2026-02-01',
		};
		dataOf(await api.client.legalDocuments.publish('privacy_policy', release));

		const error = errorOf(
			await api.client.legalDocuments.publish('privacy_policy', {
				...release,
				version: '2026-02-02',
			})
		);

		expect(error.code).toBe('CONFLICT');
	});

	it('legalDocuments.publish refuses an unparseable date string before sending', async () => {
		const { client, requests } = connect(main);

		const error = errorOf(
			await client.legalDocuments.publish('privacy_policy', {
				effectiveDate: 'next tuesday',
				hash: 'sha256:bad-date',
				version: '2026-03-01',
			})
		);

		expect(error.code).toBe('INVALID_INPUT');
		expect(error.issues?.[0]?.path).toEqual(['effectiveDate']);
		expect(requests).toHaveLength(0);
	});

	it('experiments.summary refuses from later than to', async () => {
		const error = errorOf(
			await api.client.experiments.summary('exp_1', {
				from: '2026-09-02',
				to: '2026-09-01',
			})
		);

		expect(error.code).toBe('INPUT_VALIDATION_FAILED');
	});
});

describe('typed errors from a backend with policy snapshots', () => {
	let policy: Connection<C15tClient>;
	let token: string;

	beforeAll(async () => {
		policy = connect(
			startBackend({
				manifest: { appName: 'SDK conformance', policyRules: RULES },
				policySnapshot: { signingKey: SIGNING_KEY },
			})
		);
		const init = dataOf(await policy.client.init({ country: 'DE' }));
		if (init.policySnapshotToken === undefined) {
			throw new Error('Expected /init to mint a policy snapshot token.');
		}
		token = init.policySnapshotToken;
	});

	const receipt = (value: boolean, confirmedAt: number) => ({
		basis: { fingerprint: 'choice-v1:sdk', kind: 'choice-v1' as const },
		confirmedAt,
		value,
	});

	it('accepts a save carrying the minted token', async () => {
		const data = dataOf(
			await policy.client.subjects.create(
				cookieBanner({ policySnapshotToken: token })
			)
		);

		expect(data.givenAt).toBeInstanceOf(Date);
	});

	it('a save without a token is POLICY_SNAPSHOT_REQUIRED', async () => {
		const error = errorOf(await policy.client.subjects.create(cookieBanner()));

		expect(error.code).toBe('POLICY_SNAPSHOT_REQUIRED');
	});

	it('a receipt granting a category outside the scope is CHOICE_OUT_OF_SCOPE', async () => {
		const givenAt = Date.now() - 1000;

		const error = errorOf(
			await policy.client.subjects.create(
				cookieBanner({
					choice: {
						categories: { functionality: receipt(true, givenAt) },
						version: 3,
					},
					givenAt,
					policySnapshotToken: token,
					preferences: { necessary: true },
				})
			)
		);

		expect(error.code).toBe('CHOICE_OUT_OF_SCOPE');
	});

	it('preferences granting a category a strict policy excludes are PURPOSE_NOT_ALLOWED', async () => {
		const error = errorOf(
			await policy.client.subjects.create(
				cookieBanner({
					policySnapshotToken: token,
					preferences: { functionality: true, necessary: true },
				})
			)
		);

		expect(error.code).toBe('PURPOSE_NOT_ALLOWED');
	});

	it('a token for a policy the manifest dropped is STALE_POLICY policy-changed', async () => {
		const changed = connect(
			startBackend({
				manifest: {
					appName: 'SDK conformance',
					policyRules: RULES.filter((rule) => rule.id !== 'eu_opt_in'),
				},
				policySnapshot: { signingKey: SIGNING_KEY },
			})
		);

		const error = errorOf(
			await changed.client.subjects.create(
				cookieBanner({ policySnapshotToken: token })
			)
		);

		expect(error.code).toBe('STALE_POLICY');
		expect(error.reason).toBe('policy-changed');
	});

	it('a token that expired before the choice was made is POLICY_SNAPSHOT_EXPIRED', async () => {
		// `ttlSeconds: 0` mints tokens that are already expired, and a givenAt
		// before the token was issued rules out a late replay.
		const shortLived = connect(
			startBackend({
				manifest: { appName: 'SDK conformance', policyRules: RULES },
				policySnapshot: { signingKey: SIGNING_KEY, ttlSeconds: 0 },
			})
		);
		const init = dataOf(await shortLived.client.init({ country: 'DE' }));

		const error = errorOf(
			await shortLived.client.subjects.create(
				cookieBanner({
					givenAt: Date.now() - 3_600_000,
					policySnapshotToken: init.policySnapshotToken,
				})
			)
		);

		expect(error.code).toBe('POLICY_SNAPSHOT_EXPIRED');
	});
});

describe('typed errors from a backend whose database is not migrated', () => {
	let broken: C15tClient;

	beforeAll(() => {
		const instance = startBackend(
			{},
			{ dialect: 'sqlite', filename: join(directory, 'unmigrated.sqlite') }
		);
		broken = createC15tClient({
			apiKey: API_KEY,
			baseUrl: BASE_URL,
			fetch: (input, init) => instance.handler(new Request(input, init)),
			retry: false,
		});
	});

	it('status is SERVICE_UNAVAILABLE and retryable', async () => {
		const error = errorOf(await broken.status());

		expect(error.code).toBe('SERVICE_UNAVAILABLE');
		expect(error.status).toBe(503);
		expect(error.retryable).toBe(true);
	});

	it.each([
		['subjects.get', (client: C15tClient) => client.subjects.get('sub_abc')],
		[
			'subjects.list',
			(client: C15tClient) => client.subjects.list({ externalId: 'user_1' }),
		],
		[
			'consents.check',
			(client: C15tClient) =>
				client.consents.check({
					externalId: 'user_1',
					types: ['cookie_banner'],
				}),
		],
	] as const)('%s is DATABASE_ERROR', async (_name, call) => {
		const error = errorOf(await call(broken));

		expect(error.code).toBe('DATABASE_ERROR');
		expect(error.status).toBe(500);
	});
});

describe('client-side refusals', () => {
	it('a keyless client calling a key-only method gets MISSING_API_KEY without sending', async () => {
		const { client, requests } = connectPublic(main);
		// The public client's type has no `list`; JavaScript callers can still
		// reach it.
		const { subjects } = client as unknown as C15tClient;

		const error = errorOf(await subjects.list({ externalId: 'user_1' }));

		expect(error.code).toBe('MISSING_API_KEY');
		expect(error.requestId).toBeUndefined();
		expect(requests).toHaveLength(0);
	});

	it.each([
		{
			call: (client: C15tClient) =>
				client.consents.check({ externalId: '', types: ['cookie_banner'] }),
			name: 'consents.check with an empty externalId',
			path: ['externalId'],
		},
		{
			call: (client: C15tClient) =>
				client.consents.check({
					externalId: 'user_1',
					types: [] as unknown as ['cookie_banner'],
				}),
			name: 'consents.check with no types',
			path: ['types'],
		},
		{
			call: (client: C15tClient) =>
				client.consents.check({
					externalId: 'user_1',
					types: ['cookie_banner,privacy_policy' as 'cookie_banner'],
				}),
			name: 'consents.check with a comma in a type',
			path: ['types', 0],
		},
		{
			call: (client: C15tClient) =>
				client.legalDocuments.publish(
					'cookie_banner' as LegalDocumentPolicyType,
					{
						effectiveDate: '2026-01-01T00:00:00Z',
						hash: 'sha256:x',
						version: '1',
					}
				),
			name: 'legalDocuments.publish with a type that is not a legal document',
			path: ['type'],
		},
		{
			call: (client: C15tClient) =>
				client.legalDocuments.publish('privacy_policy', {
					effectiveDate: new Date('invalid'),
					hash: 'sha256:x',
					version: '1',
				}),
			name: 'legalDocuments.publish with an invalid Date',
			path: ['effectiveDate'],
		},
		{
			call: (client: C15tClient) =>
				client.experiments.summary('exp_1', { from: 'last week' }),
			name: 'experiments.summary with a from that is not ISO 8601',
			path: ['from'],
		},
		{
			call: (client: C15tClient) =>
				client.subjects.create(cookieBanner({ subjectId: 'not-a-subject' })),
			name: 'subjects.create with a malformed subjectId',
			path: ['subjectId'],
		},
		{
			call: (client: C15tClient) =>
				client.subjects.identify('sub_abc', { externalId: '' }),
			name: 'subjects.identify with an empty externalId',
			path: ['externalId'],
		},
		{
			call: (client: C15tClient) => client.subjects.list({ externalId: ' ' }),
			name: 'subjects.list with a blank externalId',
			path: ['externalId'],
		},
		{
			call: (client: C15tClient) => client.subjects.get(''),
			name: 'subjects.get with an empty id',
			path: ['id'],
		},
	])('$name is INVALID_INPUT and sends nothing', async ({ call, path }) => {
		const { client, requests } = connect(main);

		const error = errorOf(await call(client));

		expect(error.code).toBe('INVALID_INPUT');
		expect(error.issues).toContainEqual(expect.objectContaining({ path }));
		expect(error.requestId).toBeUndefined();
		expect(requests).toHaveLength(0);
	});
});
