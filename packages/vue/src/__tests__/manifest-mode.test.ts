import type { ConsentManifest, InitOutput } from '@c15t/schema/types';
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
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

type WindowWithC15t = Window & {
	c15t?: {
		version: string;
		pkg: string;
		mode: string;
	};
};

function createManifestFixture(): ConsentManifest {
	return {
		schemaVersion: 1,
		revision: 'manifest-rev-1',
		branding: 'c15t',
		translations: {
			i18n: {
				defaultProfile: 'default',
				messages: {
					default: {
						fallbackLanguage: 'en',
						translations: {
							en: {
								common: {
									acceptAll: 'Accept all',
									rejectAll: 'Reject all',
								},
							},
							de: {
								common: {
									acceptAll: 'Alle akzeptieren',
									rejectAll: 'Alle ablehnen',
								},
							},
						},
					},
				},
			},
		},
		policyPacks: [
			createConsentManifestPolicyPack({
				fingerprint: 'fingerprint-eu',
				policy: {
					id: 'eu-opt-in',
					match: { countries: ['DE'], fallback: true },
					consent: {
						model: 'opt-in',
						expiryDays: 365,
						scopeMode: 'strict',
						categories: ['necessary', 'measurement', 'marketing'],
					},
					ui: { mode: 'banner' },
				},
			}),
			createConsentManifestPolicyPack({
				fingerprint: 'fingerprint-ca',
				policy: {
					id: 'ca-opt-out',
					match: { regions: [{ country: 'US', region: 'CA' }] },
					consent: {
						model: 'opt-out',
						expiryDays: 365,
						scopeMode: 'permissive',
						categories: ['necessary', 'marketing'],
						gpc: true,
					},
					ui: { mode: 'banner' },
				},
			}),
		],
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
			manifest: createManifestFixture(),
			headers: {
				'x-c15t-country': 'DE',
				'x-c15t-region': 'BE',
				'accept-language': 'de-DE,de;q=0.8,en;q=0.7',
			},
		});

		expect(init).toMatchObject({
			jurisdiction: 'GDPR',
			location: {
				countryCode: 'DE',
				regionCode: 'BE',
			},
			branding: 'c15t',
			policy: {
				id: 'eu-opt-in',
				model: 'opt-in',
			},
			policyDecision: {
				policyId: 'eu-opt-in',
				fingerprint: 'fingerprint-eu',
				matchedBy: 'country',
				country: 'DE',
				region: 'BE',
				jurisdiction: 'GDPR',
			},
		});
		expect(init.translations.language).toBe('de');
	});

	test('derives manifest cache TTL from backend s-maxage', async () => {
		const manifest = createManifestFixture();
		const fetchMock = vi.fn(
			async (_input: RequestInfo | URL, _init?: RequestInit) =>
				new Response(JSON.stringify(manifest), {
					status: 200,
					headers: {
						'content-type': 'application/json',
						'cache-control': 'public, s-maxage=60, stale-while-revalidate=120',
						etag: '"manifest-rev-1"',
					},
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
			},
		});
		expect(third.manifest.revision).toBe('manifest-rev-1');
	});

	test('maps Sec-GPC through to resolver inputs', () => {
		expect(
			getResolverInputsFromHeaders({
				'x-vercel-ip-country': 'US',
				'x-vercel-ip-country-region': 'CA',
				'accept-language': 'en-US,en;q=0.9',
				'sec-gpc': '1',
			})
		).toEqual({
			country: 'US',
			region: 'CA',
			language: 'en',
			gpc: true,
		});
	});

	test('manifest mode flips Nuxt init prefetch to same-origin route', () => {
		expect(
			getNuxtInitFetchTarget({ backendURL: 'https://backend.example' })
		).toEqual({
			url: '/init',
			baseURL: 'https://backend.example',
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
				manifestURL: 'https://backend.example/manifest',
				initRoute: '/internal/consent/init',
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

	test('client manifest mode fetches the manifest in the browser and resolves init locally', async () => {
		Object.defineProperty(window.navigator, 'language', {
			value: 'de-DE',
			configurable: true,
		});
		Object.defineProperty(window.navigator, 'globalPrivacyControl', {
			value: true,
			configurable: true,
		});
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			expect(String(input)).toBe('https://cdn.example/manifest');
			return new Response(JSON.stringify(createManifestFixture()), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		});

		const context = createVueConsentKernelContext({
			config: {
				backendURL: 'https://backend.example',
				manifest: 'client',
				manifestURL: 'https://cdn.example/manifest',
				customFetch: fetchMock as unknown as typeof fetch,
			} as ConsentConfig,
		});

		await context.kernel.commands.init();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(context.snapshot.value).toMatchObject({
			location: {
				countryCode: null,
				regionCode: null,
			},
			policy: {
				id: 'eu-opt-in',
				model: 'opt-in',
			},
			policyDecision: {
				policyId: 'eu-opt-in',
				matchedBy: 'fallback',
			},
			overrides: {
				language: 'de',
				gpc: true,
			},
		});
		context.dispose();
	});

	test('client manifest mode applies strict unknown-geo policy before geo microfetch re-resolves', async () => {
		const seenPolicyIds: string[] = [];
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url === 'https://cdn.example/manifest') {
				return new Response(JSON.stringify(createManifestFixture()), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				});
			}
			if (url === '/api/geo') {
				return new Response(JSON.stringify({ country: 'US', region: 'CA' }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				});
			}
			return new Response('not found', { status: 404 });
		});
		const config = {
			backendURL: 'https://backend.example',
			manifest: 'client',
			manifestURL: 'https://cdn.example/manifest',
			geoURL: '/api/geo',
			customFetch: fetchMock as unknown as typeof fetch,
		} as ConsentConfig;
		const context = createVueConsentKernelContext({
			config,
		});
		context.kernel.subscribe((snapshot) => {
			if (snapshot.policy?.id) {
				seenPolicyIds.push(snapshot.policy.id);
			}
		});

		const dispose = startVueConsentRuntime(context, config);
		await vi.waitFor(() => {
			expect(context.snapshot.value.policy?.id).toBe('ca-opt-out');
		});

		expect((window as WindowWithC15t).c15t).toMatchObject({
			pkg: '@c15t/vue',
			mode: 'manifest',
		});
		expect(seenPolicyIds[0]).toBe('eu-opt-in');
		expect(seenPolicyIds.at(-1)).toBe('ca-opt-out');
		expect(context.snapshot.value.policyDecision).toMatchObject({
			policyId: 'ca-opt-out',
			matchedBy: 'region',
			country: 'US',
			region: 'CA',
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
		dispose();
		expect((window as WindowWithC15t).c15t).toBeUndefined();
	});

	test('prefetched manifest init seeds decision inputs for save', async () => {
		const init = resolveManifestInit({
			manifest: createManifestFixture(),
			headers: {
				'x-c15t-country': 'DE',
				'x-c15t-region': 'BE',
				'accept-language': 'de',
			},
		}) satisfies InitOutput;
		const subjectBodies: Record<string, unknown>[] = [];
		const fetchMock = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = String(input);
				if (url.endsWith('/subjects')) {
					const body = JSON.parse(String(init?.body ?? '{}')) as Record<
						string,
						unknown
					>;
					subjectBodies.push(body);
					return new Response(
						JSON.stringify({ ok: true, subjectId: 'sub-1' }),
						{
							status: 200,
							headers: { 'content-type': 'application/json' },
						}
					);
				}
				return new Response('not found', { status: 404 });
			}
		);

		const context = createVueConsentKernelContext({
			config: {
				backendURL: 'https://backend.example',
				manifest: true,
				domain: 'example.com',
				customFetch: fetchMock as unknown as typeof fetch,
			} as ConsentConfig,
			prefetch: init,
		});

		await context.kernel.commands.save('all');

		expect(subjectBodies).toHaveLength(1);
		expect(subjectBodies[0]).toMatchObject({
			domain: 'example.com',
			policyId: 'eu-opt-in',
			fingerprint: 'fingerprint-eu',
			country: 'DE',
			region: 'BE',
			language: 'de',
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		context.dispose();
	});
});
