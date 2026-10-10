/**
 * Wiring of `@c15t/svelte/kit` onto the core consent route handler. The
 * route behaviour itself is pinned once, in
 * `packages/core/src/server/__tests__/consent-route.test.ts`.
 */
import { clearManifestCache } from '@c15t/core/server';
import type { RequestEvent } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { setGenerated } from '../../__tests__/generated';
import { c15tHandle } from '../handle';
import { hosted, manifest as manifestMode } from '../index';
import { loadConsent } from '../load-consent';
import { createConsentRoute } from '../routes';
import { createEvent } from './event';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const BACKEND = 'https://consent.example.com';
const ROUTE_ID = '/api/c15t/[...path]';

const upstream = () =>
	vi.fn<typeof globalThis.fetch>().mockImplementation((input) =>
		Promise.resolve(
			String(input).endsWith('/manifest')
				? Response.json(MANIFEST_FIXTURE, {
						headers: {
							'cache-control': 'public, s-maxage=1, stale-while-revalidate=600',
						},
					})
				: Response.json({ ok: true }, { status: 201 })
		)
	);

const restEvent = (
	path: string,
	init: Parameters<typeof createEvent>[0] = {}
): RequestEvent =>
	createEvent({
		...init,
		route: { id: ROUTE_ID, params: { path } },
		url: `https://shop.example/api/c15t/${path}`,
	});

beforeEach(() => {
	clearManifestCache();
});

describe('createConsentRoute', () => {
	test('serves and resolves a snapshot without an upstream policy request', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const { GET } = createConsentRoute({
			backendURL: BACKEND,
			fetch,
			reportSessions: false,
			snapshot: MANIFEST_FIXTURE,
		});
		expect(await (await GET(restEvent('manifest'))).json()).toEqual(
			MANIFEST_FIXTURE
		);
		const response = await GET(
			restEvent('init', { headers: { 'x-vercel-ip-country': 'DE' } })
		);
		expect(await response.json()).toMatchObject({
			policyResolution: { policyId: 'eu-opt-in', status: 'matched' },
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	test('returns GET, and the write methods with proxy on', () => {
		expect(Object.keys(createConsentRoute()).sort()).toEqual(['GET']);
		expect(
			Object.keys(
				createConsentRoute({ backendURL: BACKEND, proxy: true })
			).sort()
		).toEqual(['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']);
	});

	test('GET dispatches on the rest parameter, or the path of a fixed route', async () => {
		const fetch = upstream();
		const { GET } = createConsentRoute({
			backendURL: BACKEND,
			fetch,
			reportSessions: false,
		});
		const manifest = await GET(restEvent('manifest'));
		const root = await GET(restEvent(''));
		const fixed = await GET(
			createEvent({ url: 'https://shop.example/api/c15t/manifest' })
		);
		expect(manifest.headers.get('cache-control')).toContain('s-maxage=1');
		expect(root.headers.get('cache-control')).toBe('private, no-store');
		expect(fixed.headers.get('cache-control')).toContain('s-maxage=1');
	});

	test('fetches a relative backend in-process through event.fetch', async () => {
		const eventFetch = upstream();
		const { GET } = createConsentRoute({
			backendURL: '/api/self-host',
			reportSessions: false,
		});
		await GET(
			createEvent({
				fetch: eventFetch,
				headers: { host: 'evil.example' },
				route: { id: ROUTE_ID, params: { path: 'init' } },
				url: 'https://shop.example/api/c15t/init',
			})
		);
		expect(eventFetch).toHaveBeenCalledWith(
			'/api/self-host/manifest',
			expect.anything()
		);
	});

	test('hands detached work to platform.context.waitUntil by default', async () => {
		vi.useFakeTimers();
		try {
			const fetch = upstream();
			const waitUntil = vi.fn();
			const { GET } = createConsentRoute({ backendURL: BACKEND, fetch });
			const event = () =>
				Object.assign(restEvent('manifest'), {
					platform: { context: { waitUntil } },
				});
			await GET(event());
			vi.advanceTimersByTime(1500);
			await GET(event());
			expect(waitUntil).toHaveBeenCalledTimes(1);
			expect(waitUntil.mock.contexts[0]).toEqual({ waitUntil });
		} finally {
			vi.useRealTimers();
		}
	});

	test('the proxy vouches for the hop chain with event.getClientAddress()', async () => {
		const fetch = upstream();
		const { POST } = createConsentRoute({
			backendURL: BACKEND,
			fetch,
			proxy: true,
		});
		const response = await POST(
			restEvent('subjects', {
				body: '{}',
				clientAddress: '203.0.113.7',
				headers: { 'x-forwarded-for': '198.51.100.1' },
				method: 'POST',
			})
		);
		expect(response.status).toBe(201);
		const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
		expect(fetch.mock.calls[0]?.[0]).toBe(`${BACKEND}/subjects`);
		expect(headers.get('x-forwarded-for')).toBe('203.0.113.7');
		expect(headers.get('x-forwarded-host')).toBe('shop.example');
		expect(headers.get('x-c15t-proxy')).toBe('@c15t/svelte');
	});
});

describe('createConsentRoute with c15tHandle', () => {
	afterEach(() => {
		setGenerated({});
	});

	/** Runs the handle, then the route, on one request, as SvelteKit does. */
	const throughHandle = (
		handle: ReturnType<typeof c15tHandle>,
		route: (event: RequestEvent) => Response | Promise<Response>,
		event: RequestEvent
	): Promise<Response> =>
		handle({ event, resolve: (resolved) => route(resolved) });

	test("reads the handle's snapshot, so it is passed once", async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const own = { ...MANIFEST_FIXTURE, revision: 'from-the-handle' };
		const { GET } = createConsentRoute({ fetch, reportSessions: false });
		const response = await throughHandle(
			c15tHandle({ backendURL: BACKEND, snapshot: own }),
			GET,
			restEvent('manifest')
		);
		expect(await response.json()).toMatchObject({
			revision: 'from-the-handle',
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	test("reads the handle's backend URL and a hosted() mode's own", async () => {
		const fetch = upstream();
		const { GET } = createConsentRoute({ fetch, reportSessions: false });
		await throughHandle(
			c15tHandle({ backendURL: 'https://handle.example' }),
			GET,
			restEvent('manifest')
		);
		await throughHandle(
			c15tHandle({ mode: hosted({ backendURL: 'https://hosted.example' }) }),
			GET,
			restEvent('manifest')
		);
		expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
			'https://handle.example/manifest',
			'https://hosted.example/manifest',
		]);
	});

	test("reads a manifest() mode's manifestURL", async () => {
		const fetch = upstream();
		const { GET } = createConsentRoute({ fetch, reportSessions: false });
		await throughHandle(
			c15tHandle({
				backendURL: BACKEND,
				mode: manifestMode({ manifestURL: 'https://cdn.example/manifest' }),
			}),
			GET,
			restEvent('manifest')
		);
		expect(String(fetch.mock.calls[0]?.[0])).toBe(
			'https://cdn.example/manifest'
		);
	});

	test('explicit route options win over the handle', async () => {
		const fetch = upstream();
		const { GET } = createConsentRoute({
			backendURL: 'https://route.example',
			fetch,
			reportSessions: false,
		});
		await throughHandle(
			c15tHandle({ backendURL: 'https://handle.example' }),
			GET,
			restEvent('manifest')
		);
		expect(String(fetch.mock.calls[0]?.[0])).toBe(
			'https://route.example/manifest'
		);
	});

	test('the proxy setup forwards saves to the build backend, not to itself', async () => {
		// c15tHandle({ backendURL: '/api/c15t', routePrefix: '/api/c15t' })
		// points the browser at the route; the route must forward upstream.
		setGenerated({ backendURL: BACKEND });
		const fetch = upstream();
		const eventFetch = vi.fn<typeof globalThis.fetch>();
		const handle = c15tHandle({
			backendURL: '/api/c15t',
			routePrefix: '/api/c15t',
		});
		const { GET, POST } = createConsentRoute({ fetch, proxy: true });

		const page = createEvent({ url: 'https://shop.example/' });
		const { consent } = await handle({
			event: page,
			resolve: async (event) =>
				Response.json(
					await loadConsent(event, { fetch, reportSessions: false })
				),
		}).then((response) => response.json());
		expect(consent).toMatchObject({
			backendURL: '/api/c15t',
			routePrefix: '/api/c15t',
		});

		const save = await throughHandle(
			handle,
			POST,
			restEvent('subjects', {
				body: '{}',
				clientAddress: '203.0.113.7',
				fetch: eventFetch,
				method: 'POST',
			})
		);
		expect(save.status).toBe(201);
		const init = await throughHandle(
			handle,
			GET,
			restEvent('init', {
				fetch: eventFetch,
				headers: { 'x-vercel-ip-country': 'DE' },
			})
		);
		expect(await init.json()).toMatchObject({
			policyResolution: { policyId: 'eu-opt-in', status: 'matched' },
		});
		expect(eventFetch).not.toHaveBeenCalled();
		expect(fetch.mock.calls.map(([url]) => String(url))).toEqual(
			expect.arrayContaining([`${BACKEND}/subjects`, `${BACKEND}/manifest`])
		);
	});
});
