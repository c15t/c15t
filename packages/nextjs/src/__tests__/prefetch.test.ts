import {
	resolvePolicyRules,
	writePolicyResolutionWire,
	buildConsentManifestFromConfig,
} from '@c15t/schema/types';
/**
 * Tests for prefetchInitialConsent, the server-side helper that calls
 * the backend's /init, folds the response into KernelConfig, and hands
 * it to the client `ConsentBoundary` for first-paint accurate rendering.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { prefetchInitialConsent as basePrefetchInitialConsent } from '../server';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const cookieStore = new Map<string, string>();
const headerStore = new Map<string, string>();
const POLICY_RESOLUTION = writePolicyResolutionWire(
	resolvePolicyRules({
		countryCode: null,
		regionCode: null,
		rules: [
			{
				id: 'gdpr',
				match: { fallback: true },
				model: 'opt-in',
				prompt: 'choice',
			},
		],
	})
);

const createCookieHeader = () =>
	Array.from(cookieStore.entries())
		.map(([key, value]) => `${key}=${value}`)
		.join('; ');

const createHeaders = () => {
	const headers = new Headers(Array.from(headerStore.entries()));
	const cookieHeader = createCookieHeader();
	if (cookieHeader && !headers.has('cookie')) {
		headers.set('cookie', cookieHeader);
	}
	return headers;
};

const createInitOutput = function createInitOutput(
	overrides: Record<string, unknown> = {}
) {
	return {
		branding: 'c15t',
		jurisdiction: 'GDPR',
		location: { countryCode: null, regionCode: null },
		translations: { language: 'en', translations: { common: {} } },
		...overrides,
	};
};

const request = {
	cookies: () =>
		Promise.resolve({
			get: (name: string) => {
				const value = cookieStore.get(name);
				return value === undefined ? undefined : { name, value };
			},
			toString: createCookieHeader,
		}),
	headers: () => Promise.resolve(createHeaders()),
};

const prefetchInitialConsent = (
	options: Omit<Parameters<typeof basePrefetchInitialConsent>[0], 'request'>
) => basePrefetchInitialConsent({ ...options, request });

beforeEach(() => {
	cookieStore.clear();
	headerStore.clear();
});

describe('prefetchInitialConsent: backend call', () => {
	test('calls backendURL/init with current context', async () => {
		headerStore.set('x-vercel-ip-country', 'DE');
		headerStore.set('host', 'app.example.com');
		headerStore.set('x-forwarded-proto', 'https');
		cookieStore.set('sess', 'abc');

		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify(
					createInitOutput({
						branding: 'c15t',
						cmpId: 28,
						customVendors: [],
						gvl: null,
						location: { countryCode: 'DE', regionCode: null },
						policyResolution: POLICY_RESOLUTION,
						policySnapshotToken: 'snap-1',
						translations: { language: 'de', translations: {} },
					})
				),
				{ headers: { 'content-type': 'application/json' }, status: 200 }
			)
		);

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('https://app.example.com/api/c15t/init');

		const headers = (init as RequestInit).headers as Record<string, string>;
		expect((init as RequestInit).method).toBe('GET');
		expect(headers['x-c15t-country']).toBe('DE');

		// Cookies are forwarded.
		expect(headers.cookie).toContain('sess=abc');

		// Response was merged into config.
		expect(config.initialPolicyResolution).toMatchObject({
			policyId: 'gdpr',
			status: 'matched',
		});
		expect(config.initialPolicySnapshotToken).toBe('snap-1');
		expect(config.initialLocation).toEqual({
			countryCode: 'DE',
			regionCode: null,
		});
		expect(config.initialTranslations?.language).toBe('de');
		expect(config.initialBranding).toBe('c15t');
		expect(config.initialIab).toMatchObject({
			cmpId: 28,
			customVendors: [],
			enabled: false,
			gvl: null,
		});
	});

	test('absolute backendURL bypasses host resolution', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(createInitOutput()), { status: 200 })
			);
		await prefetchInitialConsent({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		const [url] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('https://consent.example.com/init');
	});

	test('failed backend call returns baseline config (silent degradation)', async () => {
		headerStore.set('cf-ipcountry', 'US');
		headerStore.set('cookie', 'c15t=c.necessary:1,c.marketing:1,i.t:1');

		const fetchSpy = vi.fn().mockRejectedValue(new Error('network down'));

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		// Baseline from cookie + header is preserved.
		expect(config.initialOverrides?.country).toBe('US');
		expect(config.initialRecords?.choice?.categories.marketing?.value).toBe(
			true
		);
		expect(Object.hasOwn(config, 'initialHasConsented')).toBe(false);
		// Init response missing; fields stay undefined.
		expect(Object.hasOwn(config, 'initialPolicy')).toBe(false);
		expect(config.initialPolicySnapshotToken).toBeUndefined();
	});

	test('boolean-only server consents do not become receipts', async () => {
		headerStore.set('host', 'app.example.com');
		headerStore.set('x-forwarded-proto', 'https');
		headerStore.set(
			'cookie',
			'c15t=c.necessary:1,c.marketing:1,c.measurement:0,i.t:1'
		);

		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify(
					createInitOutput({
						consents: {
							functionality: true,
							marketing: false,
						},
					})
				),
				{
					headers: { 'content-type': 'application/json' },
					status: 200,
				}
			)
		);

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		// Boolean-only backend projections cannot overwrite persisted receipts.
		expect(config.initialRecords?.choice?.categories).toMatchObject({
			marketing: { confirmedAt: 1, value: true },
			measurement: { confirmedAt: 1, value: false },
		});
		expect(Object.hasOwn(config, 'initialDraft')).toBe(false);
	});

	test('resolvedOverrides from server merge into overrides', async () => {
		headerStore.set('accept-language', 'de');
		headerStore.set('host', 'app.example.com');

		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify(
					createInitOutput({
						location: { countryCode: 'DE', regionCode: 'BE' },
						translations: { language: 'de', translations: {} },
					})
				),
				{ headers: { 'content-type': 'application/json' }, status: 200 }
			)
		);

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		expect(config.initialOverrides).toEqual({
			country: 'DE',
			language: 'de',
			region: 'BE',
		});
	});

	test('forwardHeaders forwards requested request-headers', async () => {
		headerStore.set('authorization', 'Bearer token-xyz');
		headerStore.set('x-trace-id', 'trace-1');
		headerStore.set('host', 'app.example.com');

		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(createInitOutput()), { status: 200 })
			);

		await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			forwardHeaders: ['authorization', 'x-trace-id'],
		});

		const [, init] = fetchSpy.mock.calls[0] ?? [];
		const headers = (init as RequestInit).headers as Record<string, string>;
		expect(headers.authorization).toBe('Bearer token-xyz');
		expect(headers['x-trace-id']).toBe('trace-1');
	});
});

describe('prefetchInitialConsent: manifest mode', () => {
	test('resolves init from manifestURL without calling /init', async () => {
		headerStore.set('x-vercel-ip-country', 'DE');
		headerStore.set('accept-language', 'de-DE,de;q=0.9');
		headerStore.set('host', 'app.example.com');
		headerStore.set('x-forwarded-proto', 'https');

		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(MANIFEST_FIXTURE), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);

		const config = await prefetchInitialConsent({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifestURL: '/api/c15t/manifest',
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('https://app.example.com/api/c15t/manifest');
		expect(String(url)).not.toContain('/init');
		expect(
			config.initialPolicyResolution?.status === 'matched'
				? config.initialPolicyResolution.policyId
				: undefined
		).toBe('eu-opt-in');
		expect(config.initialPolicyResolution).toMatchObject({
			policyId: 'eu-opt-in',
			status: 'matched',
		});
		expect(config.initialTranslations?.language).toBe('de');
	});

	test('inline manifest keeps the prefetch request path backend-free', async () => {
		headerStore.set('cf-ipcountry', 'US');
		headerStore.set('x-region-code', 'CA');

		const fetchSpy = vi.fn();

		const config = await prefetchInitialConsent({
			backendURL: 'https://consent.example.com/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifest: MANIFEST_FIXTURE,
		});

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(
			config.initialPolicyResolution?.status === 'matched'
				? config.initialPolicyResolution.policyId
				: undefined
		).toBe('us-ca-opt-out');
		expect(config.initialLocation).toEqual({
			countryCode: 'US',
			regionCode: 'CA',
		});
	});
});

describe('prefetch policy negotiation', () => {
	for (const contract of ['1', '99']) {
		test(`does not lift a legacy policy from a producer declaring ${contract}`, async () => {
			const config = await prefetchInitialConsent({
				backendURL: 'https://consent.example.com',
				fetch: vi.fn().mockResolvedValue(
					new Response(
						JSON.stringify(
							createInitOutput({
								gvl: { vendors: {} },
								policy: {
									id: 'legacy',
									model: 'opt-in',
									ui: { mode: 'banner' },
								},
								policySnapshotToken: 'stale',
							})
						),
						{ headers: { 'x-c15t-policy-contract': contract } }
					)
				),
			});
			expect(config.initialPolicyResolution).toMatchObject({
				reason: contract === '1' ? 'invalid-payload' : 'unsupported-contract',
				status: 'failed',
			});
			expect(config.initialPolicySnapshotToken).toBeUndefined();
			expect(config.initialIab).toBeUndefined();
		});
	}
});

test('versioned inline manifest prepares notice policy and GPC without an init fetch', async () => {
	const manifest = await buildConsentManifestFromConfig({
		policyRules: [
			{
				categories: ['marketing'],
				id: 'notice-v3',
				match: { fallback: true },
				model: 'opt-out',
				privacySignals: { gpc: { denyCategories: ['marketing'] } },
				prompt: 'notice',
			},
		],
	});
	headerStore.set('sec-gpc', '1');
	const fetch = vi.fn();
	const config = await prefetchInitialConsent({
		backendURL: 'https://consent.example.com',
		fetch,
		manifest,
	});
	expect(config.initialPolicyResolution).toMatchObject({
		policy: { model: 'opt-out', prompt: 'notice' },
		policyId: 'notice-v3',
		status: 'matched',
	});
	expect(config.initialPrivacySignals?.gpc).toBe(true);
	expect(config.initialOverrides?.gpc).toBeUndefined();
	expect(fetch).not.toHaveBeenCalled();
});

test('keeps a backend subject identifier without manufacturing consent', async () => {
	const config = await prefetchInitialConsent({
		backendURL: 'https://consent.example.com',
		fetch: vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify(
					createInitOutput({
						policyResolution: POLICY_RESOLUTION,
						subjectId: 'legacy:subject+literal',
					})
				)
			)
		),
	});
	expect(config.initialRecords?.subject).toEqual({
		subjectId: 'legacy:subject+literal',
	});
	expect(config.initialRecords?.choice).toBeNull();
});
