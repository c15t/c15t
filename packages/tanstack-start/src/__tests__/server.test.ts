/**
 * Tests for resolveConsent without a backendURL: the server-only helper
 * then produces the visitor's ConsentState from the incoming TanStack
 * Start request alone, without touching the network.
 *
 * Each test builds a plain `Request`, which is exactly what `getRequest()`
 * hands the helper at runtime.
 */

import { describe, expect, test, vi } from 'vitest';

import {
	createConsentStateHandler,
	resolveConsent as baseResolveConsent,
} from '../server';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const createRequest = function createRequest(
	headers: Record<string, string> = {}
) {
	return new Request('https://app.example.com/', { headers });
};

const resolveConsent = (
	headers: Record<string, string> = {},
	options: Omit<
		NonNullable<Parameters<typeof baseResolveConsent>[0]>,
		'request'
	> = {}
) => baseResolveConsent({ ...options, request: createRequest(headers) });

describe('resolveConsent without backendURL: cookies', () => {
	test('returns empty state when nothing is present', async () => {
		expect(await resolveConsent()).toMatchObject({
			initialRecords: { choice: null, subject: null },
			now: expect.any(Number),
		});
	});

	test('reads cookies and headers without fetching', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockRejectedValue(new Error('resolveConsent must not fetch'));
		try {
			const state = await resolveConsent({
				cookie: 'c15t=c.necessary:1,c.marketing:1,i.t:1',
				'x-vercel-ip-country': 'DE',
			});
			expect(fetchSpy).not.toHaveBeenCalled();
			expect(!!state.initialRecords?.choice).toBe(true);
			expect(state.initialOverrides?.country).toBe('DE');
			expect(state.initialPolicyResolution).toBeUndefined();
		} finally {
			fetchSpy.mockRestore();
		}
	});

	test('reads the compact persistence module cookie', async () => {
		// Returning visitors must not get the banner re-rendered into the
		// first HTML: the server has to see what the client persisted.
		const state = await resolveConsent({
			cookie: 'c15t=c.necessary:1,c.marketing:1,c.measurement:0,i.t:1234567890',
		});
		expect(!!state.initialRecords?.choice).toBe(true);
		expect(state.initialRecords?.choice?.categories).toMatchObject({
			marketing: { value: true },
			measurement: { value: false },
		});
	});

	test('ignores malformed cookie values', async () => {
		const state = await resolveConsent({
			cookie: 'c15t=not-a-consent-payload',
		});
		expect(state.initialRecords?.choice).toBeNull();
		expect(state.initialRecords?.choice).toBeNull();
	});

	test('respects a customized storage key', async () => {
		const state = await resolveConsent(
			{ cookie: 'my-consent=c.necessary:1,c.marketing:1,i.t:1' },
			{ cookieName: 'my-consent' }
		);
		expect(!!state.initialRecords?.choice).toBe(true);
		expect(state.initialRecords?.choice?.categories.marketing?.value).toBe(
			true
		);
	});

	test('accepts a request factory', async () => {
		const state = await baseResolveConsent({
			request: () => createRequest({ 'x-c15t-country': 'FR' }),
		});
		expect(state.initialOverrides?.country).toBe('FR');
	});
});

describe('resolveConsent without backendURL: geo headers', () => {
	test('uses x-vercel-ip-country', async () => {
		const state = await resolveConsent({
			'x-vercel-ip-country': 'DE',
		});
		expect(state.initialOverrides?.country).toBe('DE');
	});

	test('x-c15t-country from the middleware wins over CDN headers', async () => {
		const state = await resolveConsent({
			'cf-ipcountry': 'FR',
			'x-c15t-country': 'DE',
		});
		expect(state.initialOverrides?.country).toBe('DE');
	});

	test('reads region when present', async () => {
		const state = await resolveConsent({
			'x-vercel-ip-country': 'US',
			'x-vercel-ip-country-region': 'CA',
		});
		expect(state.initialOverrides).toMatchObject({
			country: 'US',
			region: 'CA',
		});
	});

	test('options.country overrides the header', async () => {
		const state = await resolveConsent(
			{ 'x-vercel-ip-country': 'US' },
			{ country: 'DE' }
		);
		expect(state.initialOverrides?.country).toBe('DE');
	});
});

describe('resolveConsent without backendURL: language and GPC', () => {
	test('negotiates the first language from accept-language', async () => {
		const state = await resolveConsent({
			'accept-language': 'de-DE,de;q=0.9,en;q=0.5',
		});
		expect(state.initialOverrides?.language).toBe('de');
	});

	test('options.language overrides the header', async () => {
		const state = await resolveConsent(
			{ 'accept-language': 'de' },
			{ language: 'fr' }
		);
		expect(state.initialOverrides?.language).toBe('fr');
	});

	test('reads sec-gpc', async () => {
		const state = await resolveConsent({ 'sec-gpc': '1' });
		expect(state.initialPrivacySignals?.gpc).toBe(true);
	});
});

describe('createConsentStateHandler: server function contract', () => {
	test('never carries a transport in the resolved state', async () => {
		const state = await createConsentStateHandler({
			request: createRequest({ 'x-c15t-country': 'DE' }),
		})();
		expect(state).not.toHaveProperty('transport');
		expect(state.initialOverrides).toMatchObject({ country: 'DE' });
	});
});

describe('resolveConsent with an inline manifest: session reports', () => {
	test('reports the render to the backend, handed to onBackgroundRevalidate', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 204 }));
		const registered: Promise<void>[] = [];

		const state = await resolveConsent(
			{
				'user-agent': 'Mozilla/5.0',
				'x-forwarded-for': '203.0.113.42',
				'x-vercel-ip-country': 'DE',
			},
			{
				backendURL: 'https://consent.example.com',
				fetch: fetchSpy,
				manifest: MANIFEST_FIXTURE,
				onBackgroundRevalidate: (task) => {
					registered.push(task);
				},
			}
		);
		expect(state.initialPolicyResolution).toMatchObject({
			policyId: 'eu-opt-in',
		});
		expect(registered).toHaveLength(1);
		await registered[0];

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://consent.example.com/sessions');
		expect((init.headers as Record<string, string>)['x-c15t-client-ip']).toBe(
			'203.0.113.42'
		);
		expect(JSON.parse(init.body as string)).toMatchObject({
			adapter: '@c15t/tanstack-start',
			country: 'DE',
			source: 'render',
		});
	});

	test('sends nothing when reportSessions is false', async () => {
		const fetchSpy = vi.fn();
		await resolveConsent(
			{},
			{
				backendURL: 'https://consent.example.com',
				fetch: fetchSpy,
				manifest: MANIFEST_FIXTURE,
				reportSessions: false,
			}
		);
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
