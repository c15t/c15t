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

// oxlint-disable-next-line func-style -- Preserve declaration order, interface shape, and public compatibility.
function createManifestFixture(): ConsentManifest {
	return {
		branding: 'c15t',
		policyPacks: [
			createConsentManifestPolicyPack({
				fingerprint: 'fingerprint-eu',
				policy: {
					consent: {
						categories: ['necessary', 'measurement', 'marketing'],

						expiryDays: 365,
						model: 'opt-in',
						scopeMode: 'strict',
					},
					id: 'eu-opt-in',
					match: { countries: ['DE'], fallback: true },
					ui: { mode: 'banner' },
				},
			}),
			createConsentManifestPolicyPack({
				fingerprint: 'fingerprint-ca',
				policy: {
					consent: {
						categories: ['necessary', 'marketing'],
						expiryDays: 365,
						gpc: true,

						model: 'opt-out',
						scopeMode: 'permissive',
					},
					id: 'ca-opt-out',
					match: { regions: [{ country: 'US', region: 'CA' }] },
					ui: { mode: 'banner' },
				},
			}),
		],
		revision: 'manifest-rev-1',
		schemaVersion: 1,
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
			policy: {
				id: 'eu-opt-in',
				model: 'opt-in',
			},
			policyDecision: {
				country: 'DE',
				fingerprint: 'fingerprint-eu',
				jurisdiction: 'GDPR',
				matchedBy: 'country',
				policyId: 'eu-opt-in',
				region: 'BE',
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

	test('client manifest mode fetches the manifest in the browser and resolves init locally', async () => {
		Object.defineProperty(window.navigator, 'language', {
			configurable: true,
			value: 'de-DE',
		});
		Object.defineProperty(window.navigator, 'globalPrivacyControl', {
			configurable: true,
			value: true,
		});
		const fetchMock = vi.fn((input: RequestInfo | URL) => {
			expect(String(input)).toBe('https://cdn.example/manifest');
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

		await context.kernel.commands.init();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(context.snapshot.value).toMatchObject({
			location: {
				countryCode: null,
				regionCode: null,
			},
			overrides: {
				gpc: true,
				language: 'de',
			},
			policy: {
				id: 'eu-opt-in',
				model: 'opt-in',
			},
			policyDecision: {
				matchedBy: 'fallback',
				policyId: 'eu-opt-in',
			},
		});
		context.dispose();
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
			if (snapshot.policy?.id) {
				seenPolicyIds.push(snapshot.policy.id);
			}
		});

		const dispose = startVueConsentRuntime(context, config);
		await vi.waitFor(() => {
			expect(context.snapshot.value.policy?.id).toBe('ca-opt-out');
		});

		expect((window as WindowWithC15t).c15t).toMatchObject({
			mode: 'manifest',
			pkg: '@c15t/vue',
		});
		expect(seenPolicyIds[0]).toBe('eu-opt-in');
		expect(seenPolicyIds.at(-1)).toBe('ca-opt-out');
		expect(context.snapshot.value.policyDecision).toMatchObject({
			country: 'US',
			matchedBy: 'region',
			policyId: 'ca-opt-out',
			region: 'CA',
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
		dispose();
		expect((window as WindowWithC15t).c15t).toBeUndefined();
	});

	test('prefetched manifest init seeds decision inputs for save', async () => {
		const init = resolveManifestInit({
			headers: {
				'accept-language': 'de',
				'x-c15t-country': 'DE',
				'x-c15t-region': 'BE',
			},
			manifest: createManifestFixture(),
		}) satisfies InitOutput;
		const subjectBodies: Record<string, unknown>[] = [];
		const fetchMock = vi.fn(
			(input: RequestInfo | URL, initLocal?: RequestInit) => {
				const url = String(input);
				if (url.endsWith('/subjects')) {
					const body = JSON.parse(String(initLocal?.body ?? '{}')) as Record<
						string,
						unknown
					>;
					subjectBodies.push(body);
					return new Response(
						JSON.stringify({ ok: true, subjectId: 'sub-1' }),
						{
							headers: { 'content-type': 'application/json' },
							status: 200,
						}
					);
				}
				return new Response('not found', { status: 404 });
			}
		);

		const context = createVueConsentKernelContext({
			config: {
				backendURL: 'https://backend.example',
				customFetch: fetchMock as unknown as typeof fetch,
				domain: 'example.com',
				manifest: true,
			} as ConsentConfig,
			prefetch: init,
		});

		await context.kernel.commands.save('all');

		expect(subjectBodies).toHaveLength(1);
		expect(subjectBodies[0]).toMatchObject({
			country: 'DE',
			domain: 'example.com',
			fingerprint: 'fingerprint-eu',
			language: 'de',
			policyId: 'eu-opt-in',
			region: 'BE',
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		context.dispose();
	});
});
