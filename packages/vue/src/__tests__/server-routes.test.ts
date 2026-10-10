import { clientMode } from '@c15t/core/runtime/client-mode';
/**
 * Wiring of the Nitro consent route onto the core consent route handler:
 * one catch-all at `${routePrefix}/**`, h3 to Web `Request` and back,
 * runtime config, Nitro's in-process fetch, and the preset's `waitUntil`. The route behaviour itself is pinned once,
 * in `packages/core/src/server/__tests__/consent-route.test.ts`.
 */
import {
	clearManifestCache,
	CONSENT_ROUTE_TIMEOUT_HEADER,
} from '@c15t/core/server';
import type { ConsentManifest } from '@c15t/schema/types';
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { createApp, createRouter, toWebHandler } from 'h3';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { readNuxtMode, readNuxtRoutePrefix } from '../runtime/nuxt-mode';
import { createConsentRoute } from '../runtime/server/route-factories';
import { createServerFetch } from '../runtime/server/server-fetch';

const mocks = vi.hoisted(() => ({
	localFetch: vi.fn(),
	serverFetch: vi.fn(),
	useRuntimeConfig: vi.fn(),
}));

const MANIFEST: ConsentManifest = {
	branding: 'c15t',
	policyPacks: [
		createConsentManifestPolicyPack({
			categories: [],
			id: 'eu-opt-in',
			match: { countries: ['DE'], fallback: true },
			model: 'opt-in',
			prompt: 'choice',
			scopeMode: 'strict',
			validity: { choiceDays: 365 },
		}),
	],
	revision: 'rev-1',
	schemaVersion: 2,
	translations: {
		i18n: {
			defaultProfile: 'default',
			messages: {
				default: {
					fallbackLanguage: 'en',
					translations: { en: { common: { acceptAll: 'Accept all' } } },
				},
			},
		},
	},
};

const manifestResponse = function manifestResponse(
	headers: Record<string, string>
) {
	return new Response(JSON.stringify(MANIFEST), {
		headers: { 'content-type': 'application/json', ...headers },
		status: 200,
	});
};

/**
 * Drives the real handler through h3 so we assert on a real Response. The
 * handler is mounted as the module mounts it in Nitro: at the default
 * `/api/c15t/**`.
 *
 * The mounting calls are cast because the workspace currently resolves h3 v1
 * at runtime while type resolution picks up the h3 v2 pulled in transitively
 * by nitro, and their overloads disagree. Runtime behaviour is unaffected —
 * these are the v1 forms the installed h3 actually implements.
 */
type MountRoute = (route: string, handler: unknown) => unknown;

const callRoute = function callRoute(path: string, handler: unknown) {
	return (requestHeaders: Record<string, string> = {}) => {
		const app = createApp();
		const router = createRouter();
		(router.use as unknown as MountRoute)('/api/c15t/**', handler);
		(app.use as unknown as (handler: unknown) => unknown)(router);
		return toWebHandler(app)(
			new Request(`http://localhost${path}`, { headers: requestHeaders })
		);
	};
};

const routeDependencies = {
	fetch: mocks.serverFetch,
	useRuntimeConfig: mocks.useRuntimeConfig,
};
const callManifestRoute = callRoute(
	'/api/c15t/manifest',
	createConsentRoute(routeDependencies)
);
const callInitRoute = callRoute(
	'/api/c15t/init',
	createConsentRoute(routeDependencies)
);

beforeEach(() => {
	clearManifestCache();
	mocks.useRuntimeConfig.mockReturnValue({
		public: { c15t: { backendURL: '/api/self-host' } },
	});
});

afterEach(() => {
	clearManifestCache();
	vi.clearAllMocks();
});

describe('manifest route background revalidation', () => {
	test('serves the build snapshot and resolves init without upstream policy requests', async () => {
		mocks.useRuntimeConfig.mockReturnValue({
			public: {
				c15t: {
					backendURL: 'https://consent.example.com',
					reportSessions: false,
				},
			},
		});
		const dependencies = { ...routeDependencies, manifest: MANIFEST };
		const callSnapshotManifestRoute = callRoute(
			'/api/c15t/manifest',
			createConsentRoute(dependencies)
		);
		const callSnapshotInitRoute = callRoute(
			'/api/c15t/init',
			createConsentRoute(dependencies)
		);
		expect(await (await callSnapshotManifestRoute()).json()).toEqual(MANIFEST);
		expect(
			await (
				await callSnapshotInitRoute({ 'x-vercel-ip-country': 'DE' })
			).json()
		).toMatchObject({
			policyResolution: { policyId: 'eu-opt-in', status: 'matched' },
		});
		expect(mocks.serverFetch).not.toHaveBeenCalled();
	});

	test("hands a stale read's refresh and the event to onBackgroundRevalidate", async () => {
		vi.useFakeTimers();
		try {
			mocks.serverFetch.mockImplementation(() =>
				Promise.resolve(
					manifestResponse({
						'cache-control': 'public, s-maxage=1, stale-while-revalidate=600',
						etag: '"rev-1"',
					})
				)
			);
			const registered: { refresh: Promise<void>; method: string }[] = [];
			const call = callRoute(
				'/api/c15t/manifest',
				createConsentRoute({
					...routeDependencies,
					onBackgroundRevalidate: (refresh, event) => {
						// The event is the one the handler ran for, so a host can bind
						// a platform `waitUntil` from it.
						registered.push({ method: event.method, refresh });
					},
				})
			);

			await call();
			expect(registered).toHaveLength(0);

			vi.advanceTimersByTime(1500);
			await call();
			expect(registered).toHaveLength(1);
			expect(registered[0]?.method).toBe('GET');
			await expect(registered[0]?.refresh).resolves.toBeUndefined();
			expect(mocks.serverFetch).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('manifest route default background registration', () => {
	test('hands the refresh to event.waitUntil when the Nitro preset provides one', async () => {
		vi.useFakeTimers();
		try {
			mocks.serverFetch.mockImplementation(() =>
				Promise.resolve(
					manifestResponse({
						'cache-control': 'public, s-maxage=1, stale-while-revalidate=600',
						etag: '"rev-1"',
					})
				)
			);
			const registered: Promise<unknown>[] = [];
			// The default handlers pass only fetch and runtime config, as the
			// module's registered entrypoints do; Nitro's per-request
			// `event.waitUntil` is what a request-scoped preset exposes.
			const handler = createConsentRoute(routeDependencies);
			const call = () => {
				const app = createApp();
				app.use('/api/c15t/manifest', (event) => {
					(event as { waitUntil?: unknown }).waitUntil = (
						promise: Promise<unknown>
					) => {
						registered.push(promise);
					};
				});
				(app.use as unknown as MountRoute)('/api/c15t/manifest', handler);
				return toWebHandler(app)(
					new Request('http://localhost/api/c15t/manifest')
				);
			};

			await call();
			expect(registered).toHaveLength(0);

			vi.advanceTimersByTime(1500);
			await call();
			expect(registered).toHaveLength(1);
			await expect(registered[0]).resolves.toBeUndefined();
			expect(mocks.serverFetch).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('manifest route caching headers', () => {
	test("forwards the backend's Cache-Control and ETag verbatim", async () => {
		mocks.serverFetch.mockResolvedValue(
			manifestResponse({
				'cache-control': 'public, s-maxage=120, stale-while-revalidate=600',
				etag: '"rev-1"',
			})
		);

		const response = await callManifestRoute();

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=120, stale-while-revalidate=600'
		);
		expect(response.headers.get('etag')).toBe('"rev-1"');
		expect(await response.json()).toMatchObject({ revision: 'rev-1' });
	});

	test('answers a matching If-None-Match with 304 and no body', async () => {
		mocks.serverFetch.mockResolvedValue(
			manifestResponse({
				'cache-control': 'public, s-maxage=120',
				etag: '"rev-1"',
			})
		);

		const response = await callManifestRoute({ 'if-none-match': '"rev-1"' });

		expect(response.status).toBe(304);
		expect(await response.text()).toBe('');
	});
});

describe('init route', () => {
	test('resolves from the manifest read through serverFetch for a relative backendURL', async () => {
		mocks.serverFetch.mockResolvedValue(
			manifestResponse({ 'cache-control': 'public, s-maxage=120' })
		);

		const response = await callInitRoute({ 'x-c15t-country': 'DE' });

		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('x-c15t-policy-contract')).toBe('1');
		expect(await response.json()).toMatchObject({
			location: { countryCode: 'DE' },
			policyResolution: { policyId: 'eu-opt-in' },
		});
		expect(mocks.serverFetch).toHaveBeenCalledWith(
			'/api/self-host/manifest',
			expect.anything()
		);
		// A relative backend is this app's own proxy: no session report.
		expect(mocks.serverFetch).toHaveBeenCalledTimes(1);
	});

	test('falls back to a proxied GET /init through serverFetch', async () => {
		const acmeVendor = {
			category: 'marketing',
			id: 'acme',
			name: 'Acme',
			privacyPolicyUrl: 'https://acme.example/privacy',
		};
		// An older backend with no /manifest must not break consent.
		// The proxy has to go through serverFetch too, or a relative backendURL
		// throws ERR_INVALID_URL in Node.
		// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
		mocks.serverFetch.mockImplementation(async (url: string) => {
			if (url.includes('/manifest')) {
				return new Response('nope', { status: 404 });
			}
			return new Response(
				JSON.stringify({
					location: { countryCode: null, regionCode: null },
					resolvedPrivacySignals: { gpc: true },
					translations: { language: 'en', translations: {} },
					vendorListVersion: '2026-09',
					vendors: [acmeVendor],
				}),
				{
					headers: { 'content-type': 'application/json' },
					status: 200,
				}
			);
		});

		const response = await callInitRoute({ 'x-c15t-country': 'DE' });

		const body = await response.json();
		expect(body).toMatchObject({
			resolvedPrivacySignals: { gpc: true },
			vendorListVersion: '2026-09',
			vendors: [acmeVendor],
		});
		expect(body).not.toHaveProperty('jurisdiction');
		expect(mocks.serverFetch).toHaveBeenLastCalledWith(
			'/api/self-host/init',
			expect.objectContaining({
				headers: expect.objectContaining({ 'x-c15t-country': 'DE' }),
			})
		);
	});

	test('private runtime config wins over the public one', async () => {
		mocks.useRuntimeConfig.mockReturnValue({
			c15t: { backendURL: 'https://private.example' },
			public: { c15t: { backendURL: '/api/self-host' } },
		});
		mocks.serverFetch.mockResolvedValue(manifestResponse({}));

		await callInitRoute();

		expect(mocks.serverFetch.mock.calls[0]?.[0]).toBe(
			'https://private.example/manifest'
		);
	});

	test('an empty private URL leaves the public one', async () => {
		// What Nitro hands over when only NUXT_PUBLIC_C15T_BACKEND_URL is set.
		mocks.useRuntimeConfig.mockReturnValue({
			c15t: { backendURL: '', ssr: true },
			public: { c15t: { backendURL: 'https://public.example' } },
		});
		mocks.serverFetch.mockResolvedValue(manifestResponse({}));

		await callInitRoute();

		expect(mocks.serverFetch.mock.calls[0]?.[0]).toBe(
			'https://public.example/manifest'
		);
	});

	test("reads the manifest from the mode's manifestURL", async () => {
		mocks.useRuntimeConfig.mockReturnValue({
			public: {
				c15t: {
					backendURL: 'https://consent.example.com',
					mode: {
						manifestURL: 'https://cdn.example.com/manifest.json',
						type: 'manifest',
					},
					reportSessions: false,
				},
			},
		});
		mocks.serverFetch.mockResolvedValue(manifestResponse({}));

		await callInitRoute();

		expect(mocks.serverFetch.mock.calls[0]?.[0]).toBe(
			'https://cdn.example.com/manifest.json'
		);
	});

	test('answers no path but init and manifest', async () => {
		const response = await callRoute(
			'/api/c15t/subjects',
			createConsentRoute(routeDependencies)
		)();

		expect(response.status).toBe(404);
		expect(mocks.serverFetch).not.toHaveBeenCalled();
	});

	test('honours the render budget the SSR plugin sends', async () => {
		mocks.serverFetch.mockImplementation(
			(_url: string, init?: RequestInit) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () =>
						reject(init.signal?.reason)
					);
				})
		);
		const startedAt = Date.now();
		const response = await callInitRoute({
			[CONSENT_ROUTE_TIMEOUT_HEADER]: '20',
		});
		expect(response.ok).toBe(false);
		expect(Date.now() - startedAt).toBeLessThan(2000);
	});
});

describe('serverFetch', () => {
	test("delegates to nitro's localFetch so relative backendURLs resolve", async () => {
		// `globalThis.fetch` rejects relative URLs in Node; localFetch dispatches
		// them in-process and hands absolute URLs to real fetch.
		const serverFetch = createServerFetch(
			() =>
				({
					localFetch: mocks.localFetch,
				}) as never
		);
		mocks.localFetch.mockResolvedValue(new Response('ok'));

		await serverFetch('/api/self-host/manifest', { method: 'GET' });

		expect(mocks.localFetch).toHaveBeenCalledWith('/api/self-host/manifest', {
			method: 'GET',
		});
	});
});

describe('saves', () => {
	test('the route answers a save with 404, so the browser never posts one here', async () => {
		mocks.useRuntimeConfig.mockReturnValue({ public: { c15t: {} } });
		const app = createApp();
		const router = createRouter();
		(router.use as unknown as MountRoute)(
			'/api/c15t/**',
			createConsentRoute({ ...routeDependencies, manifest: MANIFEST })
		);
		(app.use as unknown as (handler: unknown) => unknown)(router);
		const response = await toWebHandler(app)(
			new Request('http://localhost/api/c15t/subjects', {
				body: '{}',
				method: 'POST',
			})
		);
		expect(response.status).toBe(404);
		// A snapshot-only config has no backend to save to, and the client
		// refuses to send saves to the route instead.
		const config = {
			mode: { snapshot: MANIFEST, type: 'manifest' as const },
		};
		expect(() =>
			clientMode(readNuxtMode(config), {
				routePrefix: readNuxtRoutePrefix(config),
			})
		).toThrow('manifest() needs a backend URL');
	});
});
