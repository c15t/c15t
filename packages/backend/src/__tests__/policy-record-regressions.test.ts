import type { PolicyRule } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createConsentKernel } from '../../../core/src/kernel';
import { createHostedTransport } from '../../../core/src/transports/hosted';
import type { HostedTransportOptions } from '../../../core/src/transports/hosted';
import { createManifestTransport } from '../../../core/src/transports/manifest';
import type { ConsentKernel } from '../../../core/src/types';
import { encoder } from '../db/values';
import { ENGINES } from './engines';
import { createHttpHarness } from './http-harness';
import type { HttpHarness } from './http-harness';

const T0 = 1_700_000_000_000;
const T1 = T0 + 1000;
const BASE = {
	domain: 'example.com',
	subjectId: 'sub_receipts1',
	type: 'cookie_banner',
};
const RULES: PolicyRule[] = [
	{
		categories: ['marketing'],
		id: 'eu',
		match: { countries: ['DE'] },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'strict',
	},
];
const SIGNING_KEY = 'test-signing-key-at-least-32-chars-long';

describe.each(ENGINES)('policy record regressions ($name)', (engine) => {
	let harness: HttpHarness;
	let kernel: ConsentKernel | undefined;
	let transportOptions: HostedTransportOptions;

	beforeEach(async () => {
		harness = await createHttpHarness(engine, {});
		transportOptions = {
			backendURL: 'https://example.com',
			domain: 'example.com',
			fetch: (input, init) => harness.app.request(new Request(input, init)),
		};
	});

	afterEach(async () => {
		kernel?.dispose();
		kernel = undefined;
		await harness.dispose();
	});

	const replaceStoredChoices = (value: string | null) =>
		harness.runtime.runPromise(
			Effect.gen(function* replaceChoices() {
				const sql = yield* SqlClient.SqlClient;
				yield* sql`update ${sql('consent')} set ${sql('choice')} = ${value}`;
			})
		);

	const legacySave = async (givenAt: number, marketing: boolean) => {
		const saved = await harness.json('POST', '/subjects', {
			...BASE,
			givenAt,
			preferences: { marketing, necessary: true },
		});
		expect(saved.status, JSON.stringify(saved.body)).toBe(200);
	};

	const signedApp = () =>
		harness.appWith({
			manifest: { policyRules: RULES },
			policySnapshot: { signingKey: SIGNING_KEY },
		});

	it('keeps unreadable receipts distinct from legacy records through HTTP', async () => {
		await legacySave(T0, true);
		await replaceStoredChoices('{"version":99,"categories":{}}');
		const read = await harness.json('GET', `/subjects/${BASE.subjectId}`);
		expect(read.body.subjectChoice).toBeNull();
		expect(read.body.consents).toMatchObject([{ choice: null }]);
		const transport = createHostedTransport(transportOptions);
		expect(
			(await transport.loadSubjectRecord(BASE.subjectId))?.choice
		).toBeNull();
	});

	it('does not recover an older grant when the newer record is unreadable', async () => {
		await legacySave(T0, true);
		await legacySave(T1, false);
		await harness.runtime.runPromise(
			Effect.gen(function* corruptLatest() {
				const sql = yield* SqlClient.SqlClient;
				const encode = yield* encoder;
				yield* sql`update ${sql('consent')} set ${sql('choice')} = ${'{"version":99}'} where ${sql('givenAt')} = ${encode(new Date(T1))}`;
			})
		);
		const transport = createHostedTransport(transportOptions);
		expect(
			(await transport.loadSubjectRecord(BASE.subjectId))?.choice
		).toBeNull();
	});

	it('a newer legacy rejection supersedes older grants in server and legacy client reads', async () => {
		await legacySave(T0, true);
		await legacySave(T1, false);
		await replaceStoredChoices(null);
		const transport = createHostedTransport(transportOptions);
		expect(
			(await transport.loadSubjectRecord(BASE.subjectId))?.choice
		).toBeNull();

		// A pre-receipt backend omits the merged view. Exercise its client reader too.
		const read = await harness.json('GET', `/subjects/${BASE.subjectId}`);
		delete read.body.subjectChoice;
		const legacyTransport = createHostedTransport({
			...transportOptions,
			fetch: () => Promise.resolve(Response.json(read.body)),
		});
		expect(
			(await legacyTransport.loadSubjectRecord(BASE.subjectId))?.choice
		).toBeNull();
	});

	it('saves a scoped rejection without reconfirming historical out-of-scope grants', async () => {
		const app = signedApp();
		const transport = createHostedTransport({
			...transportOptions,
			fetch: (input, init) => app.request(new Request(input, init)),
			headers: { 'x-c15t-country': 'DE' },
		});
		const historical = {
			basis: { kind: 'legacy-v2' as const },
			confirmedAt: T0,
			value: true,
		};
		kernel = createConsentKernel({
			initialRecords: {
				choice: { categories: { functionality: historical }, version: 3 },
			},
			transport,
		});
		await kernel.commands.init();
		expect(kernel.getSnapshot().resolution.status).toBe('matched');
		const saved = await kernel.commands.save('none');
		expect(saved.ok).toBe(true);
		expect(
			kernel.getSnapshot().explicitChoice?.categories.functionality
		).toEqual(historical);
		expect(kernel.getSnapshot().effectivePermissions.functionality).toBe(false);
		const subjectId = kernel.getSnapshot().subject?.subjectId;
		expect(subjectId).toBeDefined();
		const read = await harness.json(
			'GET',
			`/subjects/${subjectId}`,
			undefined,
			{},
			app
		);
		expect(read.body.subjectChoice).toMatchObject({
			categories: { marketing: { value: false } },
		});
		expect(read.body.consents).toMatchObject([
			{ preferences: { necessary: true } },
		]);
		expect(JSON.stringify(read.body)).not.toContain('functionality');
	});

	it.each(['hosted', 'manifest', 'prefetched'] as const)(
		'saves a signed-backend no-match choice through %s',
		async (mode) => {
			const app = signedApp();
			const fetch: typeof globalThis.fetch = (input, init) =>
				app.request(new Request(input, init));
			const hosted = createHostedTransport({
				...transportOptions,
				fetch,
				headers: { 'x-c15t-country': 'US' },
			});
			const transport =
				mode === 'manifest'
					? createManifestTransport({
							backendURL: 'https://example.com',
							fetch,
							inputs: { country: 'US' },
							manifestURL: 'https://example.com/manifest',
						})
					: hosted;
			if (mode === 'prefetched') {
				// A provider may initialize from SSR without calling this transport's init.
				kernel = createConsentKernel({
					initialLocation: { countryCode: 'US', regionCode: null },
					initialPolicyResolution: { policy: null, status: 'no-match' },
					transport: { save: hosted.save },
				});
			} else {
				kernel = createConsentKernel({ transport });
				await kernel.commands.init();
			}
			expect(kernel.getSnapshot().resolution.status).toBe('no-match');
			expect(kernel.getSnapshot().policySnapshotToken).toBeNull();
			expect((await kernel.commands.save('none')).ok).toBe(true);
			expect(await harness.count('consent')).toBe(1);
			expect(await harness.count('runtimePolicyDecision')).toBe(0);
		}
	);

	it.each(['DE', null])(
		'refuses a no-match assertion that resolves differently for %s',
		async (country) => {
			const response = await harness.json(
				'POST',
				'/subjects',
				{
					...BASE,
					country,
					givenAt: T0,
					policyId: null,
					preferences: { marketing: false, necessary: true },
				},
				{},
				signedApp()
			);
			expect(response.status).toBe(422);
			expect(await harness.count('consent')).toBe(0);
		}
	);
});
