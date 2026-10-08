/**
 * Wiring tests for `loadConsent` on top of `resolveRequestConsent` from
 * `@c15t/core/server`. The core suite pins the rules (forwarding, budget,
 * self-route guard, deferral, experiment); these check what SvelteKit
 * supplies: the inputs `c15tHandle` normalized, `event.url`, `event.fetch`
 * as the in-process fetch, the platform's `waitUntil`, and the shared flag.
 */
import { clearManifestCache } from '@c15t/core/server';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { c15tHandle } from '../handle';
import { loadConsent } from '../load-consent';
import { createSvelteKitConsentRouteHandlers } from '../routes';
import { CONSENTED_COOKIE, createEvent } from './event';
import { MANIFEST_FIXTURE } from './manifest-fixture';

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

const answer = () =>
	vi.fn<typeof globalThis.fetch>(() =>
		Promise.resolve(
			new Response(JSON.stringify(INIT_PAYLOAD), {
				headers: { 'x-c15t-policy-contract': '1' },
			})
		)
	);

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

const CUSTOM_COOKIE = CONSENTED_COOKIE.replace('c15t=', 'my-consent=');

beforeEach(() => {
	clearManifestCache();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('loadConsent', () => {
	test.each([false, true])(
		'keeps snapshot session reports alive, platform hook available: %s',
		async (hasPlatformHook) => {
			let finish: ((response: Response) => void) | undefined;
			const fetch = vi.fn<typeof globalThis.fetch>(
				() =>
					new Promise((resolve) => {
						finish = resolve;
					})
			);
			const callerHook = vi.fn();
			const platform = { waitUntil: vi.fn() };
			const event = createEvent({ fetch, headers: { 'x-c15t-country': 'DE' } });
			if (hasPlatformHook) {
				(event as { platform?: unknown }).platform = { context: platform };
			}
			const state = await loadConsent(event, {
				backendURL: 'https://consent.example.com',
				fetch,
				manifest: MANIFEST_FIXTURE,
				onBackgroundRevalidate: callerHook,
			});
			expect(state.initialPolicyResolution?.status).toBe('matched');
			expect(fetch).toHaveBeenCalledWith(
				'https://consent.example.com/sessions',
				expect.objectContaining({ method: 'POST' })
			);
			const hook = hasPlatformHook ? platform.waitUntil : callerHook;
			expect(hook).toHaveBeenCalledTimes(1);
			expect(callerHook).toHaveBeenCalledTimes(hasPlatformHook ? 0 : 1);
			expect(platform.waitUntil.mock.contexts[0]).toBe(
				hasPlatformHook ? platform : undefined
			);
			expect(callerHook.mock.calls[0]?.[1]).toBe(
				hasPlatformHook ? undefined : event
			);
			const task = hook.mock.calls[0]?.[0];
			expect(task).toBeInstanceOf(Promise);
			finish?.(new Response(null, { status: 204 }));
			await task;
		}
	);

	test('resolves a deployment manifest locally even when an init route is configured', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const event = createEvent({
			fetch,
			headers: {
				'accept-language': 'de-DE',
				'x-vercel-ip-country': 'DE',
			},
		});
		const state = await loadConsent(event, {
			backendURL: 'https://consent.example.com',
			fetch,
			initRoute: '/api/c15t',
			manifest: MANIFEST_FIXTURE,
			reportSessions: false,
		});
		expect(state.initialPolicyResolution).toMatchObject({
			policyId: 'eu-opt-in',
			status: 'matched',
		});
		expect(state.initialTranslations?.language).toBe('de');
		expect(fetch).not.toHaveBeenCalled();
	});

	test('reads the inputs the handle normalized; per-call inputs win', async () => {
		const event = await withHandle(
			createEvent({
				headers: { cookie: CONSENTED_COOKIE, 'x-c15t-country': 'CA' },
			})
		);
		const fromHandle = await loadConsent(event);
		expect(fromHandle.initialOverrides?.country).toBe('CA');
		expect(fromHandle.initialRecords?.choice).not.toBeNull();

		const perCall = await loadConsent(event, { country: 'DE' });
		expect(perCall.initialOverrides?.country).toBe('DE');
	});

	test('keeps the handle cookie name when a per-call input overrides', async () => {
		const event = await withHandle(
			createEvent({ headers: { cookie: CUSTOM_COOKIE } }),
			{ cookieName: 'my-consent' }
		);
		const config = await loadConsent(event, { country: 'DE' });
		expect(config.initialRecords?.choice).not.toBeNull();
	});

	test('initRoute resolves through event.fetch with the request inputs', async () => {
		const fetch = answer();
		const event = createEvent({
			fetch,
			headers: {
				'accept-language': 'de-DE',
				'sec-gpc': '1',
				'x-c15t-country': 'DE',
			},
		});
		const config = await loadConsent(event, { initRoute: '/api/c15t' });
		// The query carries the consent journey the render started.
		expect(String(fetch.mock.calls[0]?.[0]).split('?')[0]).toBe('/api/c15t');
		const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
		expect(headers.get('x-c15t-country')).toBe('DE');
		expect(headers.get('accept-language')).toBe('de');
		expect(headers.get('sec-gpc')).toBe('1');
		expect(headers.get('x-c15t-timeout-ms')).toMatch(/^\d+$/u);
		expect(config.initialPolicyResolution?.policyId).toBe('eu-opt-in');
	});

	test('initRoute reaches the real route handler in-process', async () => {
		const upstream = vi.fn<typeof globalThis.fetch>(() =>
			Promise.resolve(
				new Response(JSON.stringify(MANIFEST_FIXTURE), {
					headers: { 'cache-control': 'public, s-maxage=300' },
				})
			)
		);
		const { GET } = createSvelteKitConsentRouteHandlers({
			backendURL: 'https://api.example.com',
			fetch: upstream,
			reportSessions: false,
		});
		const event = createEvent({ headers: { 'x-c15t-country': 'DE' } });
		(event as { fetch: typeof globalThis.fetch }).fetch = (input, init) => {
			const request = new Request(
				new URL(String(input), 'http://localhost:5173/'),
				init
			);
			const nested = createEvent({
				route: { id: '/api/c15t/[...path]', params: { path: '' } },
				url: request.url,
			});
			(nested as { request: Request }).request = request;
			return GET(nested);
		};
		const config = await loadConsent(event, { initRoute: '/api/c15t' });
		expect(config.initialPolicyResolution?.policyId).toBe('eu-opt-in');
	});

	test('a relative backendURL resolves against event.url and stays in-process', async () => {
		const fetch = answer();
		const event = createEvent({
			fetch,
			headers: {
				host: 'attacker.example',
				'x-forwarded-host': 'attacker.example',
			},
			url: 'http://localhost:5173/',
		});
		await loadConsent(event, { backendURL: '/api/self-host' });
		expect(String(fetch.mock.calls[0]?.[0]).split('?')[0]).toBe(
			'/api/self-host/init'
		);
	});

	test('a cross-origin backend uses the configured fetch', async () => {
		const fetch = answer();
		const eventFetch = answer();
		await loadConsent(createEvent({ fetch: eventFetch }), {
			backendURL: 'https://api.example.com',
			fetch,
		});
		expect(eventFetch).not.toHaveBeenCalled();
		expect(String(fetch.mock.calls[0]?.[0]).split('?')[0]).toBe(
			'https://api.example.com/init'
		);
	});

	test('a slow init route renders without a decision and is kept alive', async () => {
		vi.useFakeTimers();
		const registered: Promise<unknown>[] = [];
		const event = createEvent({
			fetch: (_input, init) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () =>
						reject(new DOMException('aborted', 'AbortError'))
					);
				}),
		});
		(event as { platform?: unknown }).platform = {
			context: { waitUntil: (task: Promise<unknown>) => registered.push(task) },
		};
		const pending = loadConsent(event, { initRoute: '/api/c15t' });
		await vi.advanceTimersByTimeAsync(500);
		const config = await pending;
		expect(config.initialPolicyResolution).toBeUndefined();
		expect(registered).toHaveLength(1);
	});

	test('a prerender carries no visitor state and makes no request', async () => {
		const fetch = answer();
		const event = await withHandle(
			createEvent({
				fetch,
				headers: { cookie: CONSENTED_COOKIE, 'x-c15t-country': 'DE' },
			}),
			{ shared: true }
		);
		expect((event.locals as { c15t: { config: unknown } }).c15t.config).toEqual(
			{}
		);
		const config = await loadConsent(event, { initRoute: '/api/c15t' });
		expect(fetch).not.toHaveBeenCalled();
		expect(config).toEqual({});

		const direct = await loadConsent(
			createEvent({ fetch, headers: { cookie: CONSENTED_COOKIE } }),
			{ initRoute: '/api/c15t', shared: true }
		);
		expect(direct).toEqual({});
		expect(fetch).not.toHaveBeenCalled();
	});
});
