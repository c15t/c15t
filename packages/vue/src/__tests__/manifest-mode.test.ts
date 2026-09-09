import type { ConsentManifest, InitOutput } from '@c15t/schema/types';
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { ConsentConfig } from '../runtime/config';
import {
	createVueConsentKernelContext,
	getNuxtInitFetchTarget,
	startVueConsentRuntime,
} from '../runtime/kernel';
import {
	clearManifestRouteCache,
	fetchCachedManifest,
	getManifestSMaxAge,
	getResolverInputsFromHeaders,
	resolveManifestInit,
} from '../runtime/server/manifest-mode';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

type WindowWithC15t = Window & {
	c15t?: {
		version: string;
		pkg: string;
		mode: string;
	};
};

// oxlint-disable-next-line func-style -- Preserve declaration order, interface shape, and public compatibility.
function createManifestFixture(): ConsentManifest {
	return {
		branding: 'c15t',
		policyPacks: [
			createConsentManifestPolicyPack({
				categories: ['measurement', 'marketing'],
				id: 'eu-opt-in',
				match: { countries: ['DE'], fallback: true },
				model: 'opt-in',
				prompt: 'choice',
				scopeMode: 'strict',
				validity: { choiceDays: 365 },
			}),
			createConsentManifestPolicyPack({
				categories: ['marketing'],
				id: 'ca-opt-out',
				match: { regions: [{ country: 'US', region: 'CA' }] },
				model: 'opt-out',
				privacySignals: { gpc: { denyCategories: ['marketing'] } },
				prompt: 'choice',
				scopeMode: 'permissive',
				validity: { choiceDays: 365 },
			}),
		],
		revision: 'manifest-rev-1',
		schemaVersion: 2,
		translations: {
			i18n: {
				defaultProfile: 'default',
				messages: {
					default: {
						fallbackLanguage: 'en',
						translations: {
							de: {
								common: {
									acceptAll: 'Alle akzeptieren',
									rejectAll: 'Alle ablehnen',
								},
							},
							en: {
								common: {
									acceptAll: 'Accept all',
									rejectAll: 'Reject all',
								},
							},
						},
					},
				},
			},
		},
	};
}

afterEach(() => {
	clearManifestRouteCache();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	delete (window as WindowWithC15t).c15t;
});

describe('@c15t/vue Nuxt manifest mode', () => {
	test('resolves init locally from a cached manifest and geo headers', () => {
		const init = resolveManifestInit({
			headers: {
				'accept-language': 'de-DE,de;q=0.8,en;q=0.7',
				'x-c15t-country': 'DE',
				'x-c15t-region': 'BE',
			},
			manifest: createManifestFixture(),
		});

		expect(init).toMatchObject({
			branding: 'c15t',
			jurisdiction: 'GDPR',
			location: {
				countryCode: 'DE',
				regionCode: 'BE',
			},
			policyResolution: {
				policy: { id: 'eu-opt-in', model: 'opt-in' },
				status: 'matched',
			},
		});
		expect(init.translations.language).toBe('de');
	});

	test('derives manifest cache TTL from backend s-maxage', async () => {
		const manifest = createManifestFixture();
		const fetchMock = vi.fn(
			(_input: RequestInfo | URL, _init?: RequestInit) =>
				new Response(JSON.stringify(manifest), {
					headers: {
						'cache-control': 'public, s-maxage=60, stale-while-revalidate=120',
						'content-type': 'application/json',
						etag: '"manifest-rev-1"',
					},
					status: 200,
				})
		);
		const config = {
			manifestURL: 'https://backend.example/manifest',
		} satisfies Partial<ConsentConfig>;

		const first = await fetchCachedManifest({
			config,
			fetch: fetchMock as unknown as typeof fetch,
			now: 1000,
		});
		const second = await fetchCachedManifest({
			config,
			fetch: fetchMock as unknown as typeof fetch,
			now: 59_000,
		});
		const third = await fetchCachedManifest({
			config,
			fetch: fetchMock as unknown as typeof fetch,
			now: 62_000,
		});

		expect(getManifestSMaxAge(first.headers['cache-control'])).toBe(60);
		expect(first.sMaxAge).toBe(60);
		expect(second.manifest).toBe(first.manifest);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
			headers: {
				'if-none-match': '"manifest-rev-1"',
				'x-c15t-policy-contract': '1',
			},
		});
		expect(third.manifest.revision).toBe('manifest-rev-1');
	});

	test('maps Sec-GPC through to resolver inputs', () => {
		expect(
			getResolverInputsFromHeaders({
				'accept-language': 'en-US,en;q=0.9',
				'sec-gpc': '1',
				'x-vercel-ip-country': 'US',
				'x-vercel-ip-country-region': 'CA',
			})
		).toEqual({
			country: 'US',
			gpc: true,
			language: 'en',
			region: 'CA',
		});
	});

	test('manifest mode flips Nuxt init prefetch to same-origin route', () => {
		expect(
			getNuxtInitFetchTarget({ backendURL: 'https://backend.example' })
		).toEqual({
			baseURL: 'https://backend.example',
			url: '/init',
		});
		expect(
			getNuxtInitFetchTarget({
				backendURL: 'https://backend.example',
				manifest: true,
			})
		).toEqual({
			url: '/api/c15t/init',
		});
		expect(
			getNuxtInitFetchTarget({
				backendURL: 'https://backend.example',
				initRoute: '/internal/consent/init',
				manifestURL: 'https://backend.example/manifest',
			})
		).toEqual({
			url: '/internal/consent/init',
		});
		expect(
			getNuxtInitFetchTarget({
				backendURL: 'https://backend.example',
				manifest: 'client',
				manifestURL: 'https://cdn.example/manifest',
			})
		).toBeUndefined();
	});

	test('client manifest mode stays idle when the context is created during SSR', () => {
		vi.stubGlobal('window', undefined);
		const fetchMock = vi.fn();
		const context = createVueConsentKernelContext({
			config: {
				customFetch: fetchMock as unknown as typeof fetch,
				manifest: 'client',
				manifestURL: 'https://cdn.example/manifest',
			} as ConsentConfig,
		});

		expect(fetchMock).not.toHaveBeenCalled();
		context.dispose();
	});

	test('client manifest mode starts its resolver and manifest fetch before init', async () => {
		Object.defineProperty(window.navigator, 'language', {
			configurable: true,
			value: 'de-DE',
		});
		Object.defineProperty(window.navigator, 'globalPrivacyControl', {
			configurable: true,
			value: true,
		});
		const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			expect(String(input)).toBe('https://cdn.example/manifest');
			expect(new Headers(init?.headers).get('x-c15t-policy-contract')).toBe(
				'1'
			);
			return new Response(JSON.stringify(createManifestFixture()), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			});
		});

		const context = createVueConsentKernelContext({
			config: {
				backendURL: 'https://backend.example',
				customFetch: fetchMock as unknown as typeof fetch,
				manifest: 'client',
				manifestURL: 'https://cdn.example/manifest',
			} as ConsentConfig,
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		await context.kernel.commands.init();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(context.snapshot.value).toMatchObject({
			location: {
				countryCode: null,
				regionCode: null,
			},
			overrides: {
				language: 'de',
			},
			policyRule: {
				id: 'eu-opt-in',
				model: 'opt-in',
			},
		});
		context.dispose();
	});

	test('client manifest mode retries the manifest fetch after a failed load', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		let manifestStatus = 503;
		const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			expect(String(input)).toBe('https://cdn.example/manifest');
			expect(new Headers(init?.headers).get('x-c15t-policy-contract')).toBe(
				'1'
			);
			return new Response(
				manifestStatus === 200
					? JSON.stringify(createManifestFixture())
					: 'unavailable',
				{ status: manifestStatus }
			);
		});
		const context = createVueConsentKernelContext({
			config: {
				backendURL: 'https://backend.example',
				customFetch: fetchMock as unknown as typeof fetch,
				manifest: 'client',
				manifestURL: 'https://cdn.example/manifest',
			} as ConsentConfig,
		});

		const first = await context.kernel.commands.init();
		expect(first.ok).toBe(false);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(context.snapshot.value.resolution.status).toBe('failed');

		manifestStatus = 200;
		const second = await context.kernel.commands.init();
		expect(second.ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(context.snapshot.value.resolution.policy?.id).toBe('eu-opt-in');
		context.dispose();
	});

	test('runtime teardown stops the geo refresh from re-arming the kernel', async () => {
		let resolveGeo: (response: Response) => void = () => {};
		const fetchMock = vi.fn((input: RequestInfo | URL) => {
			const url = String(input);
			if (url === 'https://cdn.example/manifest') {
				return new Response(JSON.stringify(createManifestFixture()), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				});
			}
			if (url === '/api/geo') {
				return createDeferredPromise<Response>((resolve) => {
					resolveGeo = resolve;
				});
			}
			return new Response('not found', { status: 404 });
		});
		const config = {
			backendURL: 'https://backend.example',
			customFetch: fetchMock as unknown as typeof fetch,
			geoURL: '/api/geo',
			manifest: 'client',
			manifestURL: 'https://cdn.example/manifest',
		} as ConsentConfig;
		const context = createVueConsentKernelContext({ config });
		const initSpy = vi.spyOn(context.kernel.commands, 'init');

		const dispose = startVueConsentRuntime(context, config);
		await vi.waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith('/api/geo', expect.anything());
		});
		expect(initSpy).toHaveBeenCalledTimes(1);

		dispose();
		resolveGeo(
			new Response(JSON.stringify({ country: 'US', region: 'CA' }), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);
		await flushPromises();
		await createDeferredPromise((resolve) => setTimeout(resolve, 0));

		expect(initSpy).toHaveBeenCalledTimes(1);
		expect(context.snapshot.value.resolution.policy?.id).toBe('eu-opt-in');
	});

	test('client manifest mode applies strict unknown-geo policy before geo microfetch re-resolves', async () => {
		const seenPolicyIds: string[] = [];
		const fetchMock = vi.fn((input: RequestInfo | URL) => {
			const url = String(input);
			if (url === 'https://cdn.example/manifest') {
				return new Response(JSON.stringify(createManifestFixture()), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				});
			}
			if (url === '/api/geo') {
				return new Response(JSON.stringify({ country: 'US', region: 'CA' }), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				});
			}
			return new Response('not found', { status: 404 });
		});
		const config = {
			backendURL: 'https://backend.example',
			customFetch: fetchMock as unknown as typeof fetch,
			geoURL: '/api/geo',
			manifest: 'client',
			manifestURL: 'https://cdn.example/manifest',
		} as ConsentConfig;
		const context = createVueConsentKernelContext({
			config,
		});
		context.kernel.subscribe((snapshot) => {
			if (snapshot.resolution.policy?.id) {
				seenPolicyIds.push(snapshot.resolution.policy.id);
			}
		});

		const dispose = startVueConsentRuntime(context, config);
		await vi.waitFor(() => {
			expect(context.snapshot.value.resolution.policy?.id).toBe('ca-opt-out');
		});

		expect((window as WindowWithC15t).c15t).toMatchObject({
			mode: 'manifest',
			pkg: '@c15t/vue',
		});
		expect(seenPolicyIds.indexOf('eu-opt-in')).toBeLessThan(
			seenPolicyIds.indexOf('ca-opt-out')
		);
		expect(seenPolicyIds).toContain('eu-opt-in');
		expect(seenPolicyIds.at(-1)).toBe('ca-opt-out');
		expect(context.snapshot.value.resolution).toMatchObject({
			matchedBy: 'region',
			policyId: 'ca-opt-out',
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
		dispose();
		expect((window as WindowWithC15t).c15t).toBeUndefined();
	});

	test('server manifest mode initializes through Nuxt and saves to the backend', async () => {
		const init = resolveManifestInit({
			headers: {
				'accept-language': 'de',
				'x-c15t-country': 'DE',
				'x-c15t-region': 'BE',
			},
			manifest: createManifestFixture(),
		}) satisfies InitOutput;
		const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
			const url = String(input);
			if (url === '/internal/consent/init') {
				return new Response(JSON.stringify(init), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				});
			}
			if (url.endsWith('/subjects')) {
				return new Response(JSON.stringify({ ok: true, subjectId: 'sub-1' }), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				});
			}
			return new Response('not found', { status: 404 });
		});

		const context = createVueConsentKernelContext({
			config: {
				backendURL: 'https://backend.example',
				customFetch: fetchMock as unknown as typeof fetch,
				domain: 'example.com',
				initRoute: '/internal/consent/init',
				manifest: true,
			} as ConsentConfig,
		});

		await context.kernel.commands.init();
		await context.kernel.commands.save('all');

		expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
			'/internal/consent/init',
			'https://backend.example/subjects',
		]);
		expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' });
		// The Nuxt init route resolves the manifest on the server and issues no
		// snapshot token, so the save must still assert the decision it was
		// made against.
		const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
		expect(body).toMatchObject({
			country: 'DE',
			fingerprint:
				createManifestFixture().policyPacks?.[0]?.fingerprints.policy,
			language: 'de',
			policyId: 'eu-opt-in',
			region: 'BE',
		});
		expect(typeof body.givenAt).toBe('number');
		context.dispose();
	});
});
