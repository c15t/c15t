import { c15tProtocolHeaders } from '@c15t/core';
import { clearManifestCache } from '@c15t/core/server';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { completeGVL } from '../../../../../iab/src/__tests__/fixtures/gvl-sample';
import { c15tHandle } from '../handle';
import { loadConsent } from '../load-consent';
import type { C15tLocals } from '../types';
import { CONSENTED_COOKIE, createEvent } from './event';

const INIT_PAYLOAD = {
	branding: 'c15t',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: 'DE',
			regionCode: null,
			rules: [
				{
					categories: ['marketing'],
					id: 'eu-opt-in',
					match: { fallback: true, isDefault: true },
					model: 'opt-in',
					prompt: 'choice',
					scopeMode: 'permissive',
				},
			],
		})
	),
	translations: { language: 'de', translations: {} },
};

const jsonResponse = function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/json' },
		status,
	});
};

/** Runs `c15tHandle` so `event.locals.c15t` is populated, as in a real app. */
const withHandle = async function withHandle(
	event: ReturnType<typeof createEvent>,
	options: Parameters<typeof c15tHandle>[0] = {}
) {
	await c15tHandle(options)({
		event,
		resolve: () => Promise.resolve(new Response()),
	});
	return event;
};

/** The same stored consent, under a caller-chosen storage key. */
const CUSTOM_COOKIE = CONSENTED_COOKIE.replace('c15t=', 'my-consent=');

describe('loadConsent', () => {
	beforeEach(() => {
		clearManifestCache();
	});

	test('reuses the config the handle already computed', async () => {
		const event = await withHandle(
			createEvent({
				headers: { cookie: CONSENTED_COOKIE, 'x-c15t-country': 'DE' },
			})
		);

		const config = await loadConsent(event);

		expect(config).toBe((event.locals as { c15t: C15tLocals }).c15t.config);
		expect(config.initialRecords?.choice).not.toBeNull();
		expect(config.initialOverrides?.country).toBe('DE');
	});

	test('per-call inputs beat the ones the handle resolved', async () => {
		const event = await withHandle(
			createEvent({
				headers: { cookie: CONSENTED_COOKIE, 'x-c15t-country': 'CA' },
			})
		);

		const config = await loadConsent(event, { country: 'DE' });

		expect(config.initialOverrides?.country).toBe('DE');
	});

	test('falls back to reading the request itself when the handle is absent', async () => {
		const event = createEvent({
			headers: { 'cf-ipcountry': 'FR', cookie: CONSENTED_COOKIE },
		});

		const config = await loadConsent(event);

		expect(config.initialRecords?.choice).not.toBeNull();
		expect(config.initialOverrides?.country).toBe('FR');
	});

	test('keeps the handle cookie name when a per-call input overrides', async () => {
		// A route naming its own country must not move the cookie read back
		// to the default `c15t` key.
		const event = await withHandle(
			createEvent({
				headers: { cookie: CUSTOM_COOKIE, 'x-c15t-country': 'CA' },
			}),
			{ cookieName: 'my-consent' }
		);

		const config = await loadConsent(event, { country: 'DE' });

		expect(config.initialRecords?.choice).not.toBeNull();
		expect(config.initialOverrides?.country).toBe('DE');
	});

	test('hosted mode reuses the handle cookie name', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(INIT_PAYLOAD)));
		const event = await withHandle(
			createEvent({ headers: { cookie: CUSTOM_COOKIE } }),
			{ cookieName: 'my-consent' }
		);

		const config = await loadConsent(event, {
			backendURL: 'https://api.example.com',
			country: 'DE',
			fetch: fetchImpl as unknown as typeof globalThis.fetch,
		});

		expect(config.initialRecords?.choice).not.toBeNull();
	});

	test('a per-call cookie name still beats the handle one', async () => {
		const event = await withHandle(
			createEvent({ headers: { cookie: CONSENTED_COOKIE } }),
			{ cookieName: 'my-consent' }
		);

		const config = await loadConsent(event, { cookieName: 'c15t' });

		expect(config.initialRecords?.choice).not.toBeNull();
	});

	test('manifest mode folds the same-origin init route into the config', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(INIT_PAYLOAD)));
		const event = createEvent({
			fetch: fetchImpl as unknown as typeof globalThis.fetch,
			headers: { 'x-c15t-country': 'DE' },
		});

		const config = await loadConsent(event, { initRoute: '/api/c15t' });

		expect(fetchImpl).toHaveBeenCalledWith('/api/c15t', {
			headers: { ...c15tProtocolHeaders, 'x-c15t-country': 'DE' },
		});
		expect(config.initialPolicyResolution?.policy.id).toBe('eu-opt-in');
		expect(config.initialPolicyResolution?.policyId).toBe('eu-opt-in');
		expect(config.initialOverrides?.country).toBe('DE');
	});

	test.each(['999', 'invalid'])(
		'rejects an unsupported init-route producer contract %s',
		async (contract) => {
			const event = createEvent({
				fetch: vi.fn(() =>
					Promise.resolve(
						Response.json(INIT_PAYLOAD, {
							headers: { 'x-c15t-policy-contract': contract },
						})
					)
				) as typeof globalThis.fetch,
			});
			const config = await loadConsent(event, { initRoute: '/api/c15t' });
			expect(config.initialPolicyResolution).toMatchObject({
				reason: 'unsupported-contract',
				status: 'failed',
			});
		}
	);

	test('restates geo, language and GPC on the same-origin init call', async () => {
		// event.fetch only inherits cookie/authorization, so anything the init
		// route needs to resolve the policy has to be passed explicitly.
		const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(INIT_PAYLOAD)));
		const event = createEvent({
			fetch: fetchImpl as unknown as typeof globalThis.fetch,
			headers: {
				'accept-language': 'de-DE,de;q=0.9',
				'cf-ipcountry': 'DE',
				'sec-gpc': '1',
			},
		});

		const config = await loadConsent(event, { initRoute: '/api/c15t' });

		expect(fetchImpl.mock.calls[0]?.[1]?.headers).toEqual({
			...c15tProtocolHeaders,
			'accept-language': 'de',
			'sec-gpc': '1',
			'x-c15t-country': 'DE',
		});
		expect(config.initialPrivacySignals?.gpc).toBe(true);
	});

	test('option overrides reach the init route instead of the raw headers', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(INIT_PAYLOAD)));
		const event = createEvent({
			fetch: fetchImpl as unknown as typeof globalThis.fetch,
			headers: { 'cf-ipcountry': 'DE' },
		});

		await loadConsent(event, {
			country: 'CA',
			initRoute: '/api/c15t',
			region: 'QC',
		});

		expect(fetchImpl.mock.calls[0]?.[1]?.headers).toEqual({
			...c15tProtocolHeaders,
			'x-c15t-country': 'CA',
			'x-c15t-region': 'QC',
		});
	});

	test('degrades to the cookie-only config when the init route fails', async () => {
		const event = createEvent({
			fetch: (() =>
				Promise.resolve(
					jsonResponse({}, 500)
				)) as unknown as typeof globalThis.fetch,
			headers: { cookie: CONSENTED_COOKIE },
		});

		const config = await loadConsent(event, { initRoute: '/api/c15t' });

		expect(config.initialRecords?.choice).not.toBeNull();
		expect(config.initialPolicyResolution).toBeUndefined();
	});

	test('degrades to the cookie-only config when the init route throws', async () => {
		const event = createEvent({
			fetch: (() =>
				Promise.reject(
					new Error('offline')
				)) as unknown as typeof globalThis.fetch,
			headers: { cookie: CONSENTED_COOKIE },
		});

		const config = await loadConsent(event, { initRoute: '/api/c15t' });

		expect(config.initialRecords?.choice).not.toBeNull();
	});

	test('hosted mode calls the backend /init directly', async () => {
		const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(INIT_PAYLOAD)));
		const event = createEvent({ headers: { 'cf-ipcountry': 'DE' } });

		const config = await loadConsent(event, {
			backendURL: 'https://api.example.com',
			fetch: fetchImpl as unknown as typeof globalThis.fetch,
		});

		expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.example.com/init');
		expect(config.initialPolicyResolution?.policy.id).toBe('eu-opt-in');
	});

	test('returns the base config when no mode is configured', async () => {
		const event = createEvent({ headers: { 'cf-ipcountry': 'DE' } });

		const config = await loadConsent(event);

		expect(config).toMatchObject({ initialOverrides: { country: 'DE' } });
	});

	test('returns a JSON-serializable config', async () => {
		const event = createEvent({
			fetch: (() =>
				Promise.resolve(
					jsonResponse(INIT_PAYLOAD)
				)) as unknown as typeof globalThis.fetch,
			headers: { cookie: CONSENTED_COOKIE, 'x-c15t-country': 'DE' },
		});

		const config = await loadConsent(event, { initRoute: '/api/c15t' });

		expect(JSON.parse(JSON.stringify(config))).toEqual(config);
	});
});

describe('loadConsent time budget', () => {
	/** A fetch that answers only when its request is aborted. */
	const hangingFetch = function hangingFetch() {
		const signals: (AbortSignal | undefined)[] = [];
		const fetchImpl = vi.fn(
			(_input: RequestInfo | URL, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					signals.push(init?.signal ?? undefined);
					init?.signal?.addEventListener('abort', () =>
						reject(new DOMException('aborted', 'AbortError'))
					);
				})
		);
		return { fetchImpl, signals };
	};

	beforeEach(() => {
		clearManifestCache();
		vi.useFakeTimers();
		return () => {
			vi.useRealTimers();
		};
	});

	test('stops waiting for a hanging init route after 500 ms', async () => {
		const { fetchImpl } = hangingFetch();
		const event = createEvent({
			fetch: fetchImpl as unknown as typeof globalThis.fetch,
			headers: { cookie: CONSENTED_COOKIE, 'x-c15t-country': 'DE' },
		});
		let settled: Awaited<ReturnType<typeof loadConsent>> | undefined;
		void loadConsent(event, { initRoute: '/api/c15t' }).then((config) => {
			settled = config;
		});

		await vi.advanceTimersByTimeAsync(499);
		expect(settled).toBeUndefined();
		await vi.advanceTimersByTimeAsync(1);

		expect(settled?.initialRecords?.choice).not.toBeNull();
		expect(settled?.initialOverrides?.country).toBe('DE');
		expect(settled?.initialPolicyResolution).toBeUndefined();
	});

	test('aborts a hosted /init that outlives timeoutMs', async () => {
		const { fetchImpl, signals } = hangingFetch();
		const event = createEvent({
			fetch: fetchImpl as unknown as typeof globalThis.fetch,
			headers: { cookie: CONSENTED_COOKIE },
		});
		const pending = loadConsent(event, {
			backendURL: 'https://api.example.com',
			timeoutMs: 200,
		});

		await vi.advanceTimersByTimeAsync(200);
		const config = await pending;

		expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.example.com/init');
		expect(signals[0]?.aborted).toBe(true);
		expect(config.initialRecords?.choice).not.toBeNull();
		expect(config.initialPolicyResolution).toBeUndefined();
	});

	test('keeps a response that arrives within the budget', async () => {
		const event = createEvent({
			fetch: (() =>
				new Promise((resolve) => {
					setTimeout(() => resolve(jsonResponse(INIT_PAYLOAD)), 400);
				})) as unknown as typeof globalThis.fetch,
			headers: { 'x-c15t-country': 'DE' },
		});
		const pending = loadConsent(event, { initRoute: '/api/c15t' });

		await vi.advanceTimersByTimeAsync(400);

		expect((await pending).initialPolicyResolution?.policy.id).toBe(
			'eu-opt-in'
		);
	});

	test('timeoutMs: false waits for a slow upstream', async () => {
		const event = createEvent({
			fetch: (() =>
				new Promise((resolve) => {
					setTimeout(() => resolve(jsonResponse(INIT_PAYLOAD)), 5000);
				})) as unknown as typeof globalThis.fetch,
			headers: { 'x-c15t-country': 'DE' },
		});
		const pending = loadConsent(event, {
			initRoute: '/api/c15t',
			timeoutMs: false,
		});

		await vi.advanceTimersByTimeAsync(5000);

		expect((await pending).initialPolicyResolution?.policy.id).toBe(
			'eu-opt-in'
		);
	});
});

test.each(['public', 'custom', 'cookie', 'authorization'] as const)(
	'preserves the %s hosted SvelteKit GVL loading contract',
	async (mode) => {
		const fetch = vi.fn(() =>
			Promise.resolve(Response.json({ ...INIT_PAYLOAD, gvl: completeGVL }))
		);
		const headers = new Headers();
		if (mode === 'cookie') {
			headers.set('cookie', 'session=private');
		}
		if (mode === 'authorization') {
			headers.set('authorization', 'Bearer private');
		}
		const event = createEvent({ fetch, headers: Object.fromEntries(headers) });
		const config = await loadConsent(event, {
			backendURL: 'https://api.example.com',
			fetch: mode === 'custom' ? fetch : undefined,
		});
		expect(fetch).toHaveBeenCalledOnce();
		expect(config.initialIab?.gvl).toEqual(
			mode === 'public' ? null : completeGVL
		);
		expect(Boolean(config.initialIab?.gvlReference)).toBe(mode === 'public');
	}
);
