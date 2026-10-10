import { clientMode } from '@c15t/core/runtime/client-mode';
import { clearManifestCache } from '@c15t/core/server';
import {
	getResolverInputsFromHeaders,
	resolveManifestInit,
} from '@c15t/core/transports/manifest-cache';
import type { ConsentManifest, InitOutput } from '@c15t/schema/types';
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createVueConsentKernelContext } from '../runtime/kernel';
import { hosted, manifest } from '../runtime/modes';
import {
	readNuxtMode,
	readNuxtRoutePrefix,
	resolvesOnServer,
} from '../runtime/nuxt-mode';

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
	clearManifestCache();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	delete (window as WindowWithC15t).c15t;
});

describe('manifest resolution in core', () => {
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
});

describe('plain Vue modes', () => {
	test('manifest() resolves an inline snapshot without fetching policy', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const context = createVueConsentKernelContext({
			config: {},
			mode: manifest({
				backendURL: 'https://consent.example.com',
				fetch,
				inputs: { country: 'DE' },
				snapshot: createManifestFixture(),
			}),
		});
		try {
			await context.kernel.commands.init();
			expect(context.snapshot.value.resolution).toMatchObject({
				policy: { id: 'eu-opt-in' },
				status: 'matched',
			});
			expect(fetch).not.toHaveBeenCalled();
		} finally {
			context.dispose();
		}
	});

	test("manifest() without a location sends the visitor to the backend's /init", async () => {
		// A region-based policy resolved for an unknown location could apply
		// the wrong region's rules. Core's default, shared with React,
		// Svelte and the browser package, asks the backend instead.
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockRejectedValue(new Error('offline'));
		const mode = manifest({
			backendURL: 'https://consent.example.com',
			fetch,
			snapshot: createManifestFixture(),
		});
		const transport = mode({} as Parameters<typeof mode>[0]);
		await transport
			.init?.({
				journey: undefined,
				overrides: {},
			} as unknown as Parameters<NonNullable<typeof transport.init>>[0])
			.catch(() => null);
		expect(String(fetch.mock.calls[0]?.[0])).toContain(
			'https://consent.example.com/init'
		);
	});

	test('manifest({ initFallback: false }) resolves the unknown-location policy without a request', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const context = createVueConsentKernelContext({
			config: {},
			mode: manifest({
				backendURL: 'https://consent.example.com',
				fetch,
				initFallback: false,
				snapshot: createManifestFixture(),
			}),
		});
		try {
			await context.kernel.commands.init();
			expect(context.snapshot.value.resolution).toMatchObject({
				matchedBy: 'fallback',
				policy: { id: 'eu-opt-in' },
			});
			expect(fetch).not.toHaveBeenCalled();
		} finally {
			context.dispose();
		}
	});

	test('manifest() reads the manifest from the backend without a build snapshot', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
			new Response(JSON.stringify(createManifestFixture()), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);
		const context = createVueConsentKernelContext({
			config: {},
			mode: manifest({
				backendURL: 'https://consent.example.com',
				fetch,
				inputs: { country: 'DE' },
			}),
		});
		try {
			await context.kernel.commands.init();
			expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
				'https://consent.example.com/manifest',
			]);
			expect(context.snapshot.value.policyRule.id).toBe('eu-opt-in');
		} finally {
			context.dispose();
		}
	});

	test('manifest() and hosted() name the plugin when no backend URL is set', () => {
		// No `consentManifest()` plugin in this test, so the build supplied
		// no backend URL.
		expect(() => manifest()).toThrow('consentManifest() from c15t/vue/vite');
		expect(() => hosted()).toThrow('VITE_C15T_BACKEND_URL');
	});

	test('the plugin rejects a config without a mode', () => {
		expect(() => createVueConsentKernelContext({ config: {} })).toThrow(
			'pass `mode`'
		);
	});
});

describe('Nuxt modes', () => {
	test('manifest() with the default consent route is the default', () => {
		expect(readNuxtMode({})).toEqual({ type: 'manifest' });
		expect(readNuxtRoutePrefix({})).toBe('/api/c15t');
		expect(readNuxtRoutePrefix({ routePrefix: '/consent/' })).toBe('/consent');
		expect(readNuxtRoutePrefix({ routePrefix: false })).toBeUndefined();
		// Only manifest mode has a consent route.
		expect(
			readNuxtRoutePrefix({ mode: { type: 'hosted' }, routePrefix: '/c' })
		).toBeUndefined();
	});

	test('the server resolves hosted() and manifest(), the browser the rest', () => {
		expect(resolvesOnServer({ type: 'manifest' })).toBe(true);
		expect(resolvesOnServer({ type: 'hosted' })).toBe(true);
		expect(resolvesOnServer({ resolve: 'browser', type: 'manifest' })).toBe(
			false
		);
		expect(resolvesOnServer({ type: 'offline' })).toBe(false);
	});

	test('a server-resolved manifest re-inits through the consent route and saves to the backend', async () => {
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
			if (url.startsWith('/internal/consent/init?')) {
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
		vi.stubGlobal('fetch', fetchMock);

		const context = createVueConsentKernelContext({
			config: {},
			mode: clientMode(readNuxtMode({}), {
				backendURL: 'https://backend.example',
				routePrefix: '/internal/consent',
			}),
		});

		await context.kernel.commands.init();
		await context.kernel.commands.save('all');

		expect(
			fetchMock.mock.calls.map(([url]) => String(url).split('?')[0])
		).toEqual(['/internal/consent/init', 'https://backend.example/subjects']);
		expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' });
		// The consent route resolves the manifest on the server and issues no
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

	test('browser resolution reads the bundled snapshot and reports manifest mode', async () => {
		const fetchMock = vi.fn<typeof globalThis.fetch>();
		vi.stubGlobal('fetch', fetchMock);
		const context = createVueConsentKernelContext({
			config: {},
			mode: clientMode(
				{
					inputs: { country: 'DE' },
					resolve: 'browser',
					snapshot: createManifestFixture(),
					type: 'manifest',
				},
				{ backendURL: 'https://backend.example' }
			),
		});
		try {
			context.start();
			await vi.waitFor(() => {
				expect(context.snapshot.value.policyRule.id).toBe('eu-opt-in');
			});
			expect(fetchMock).not.toHaveBeenCalled();
			expect((window as WindowWithC15t).c15t).toMatchObject({
				mode: 'manifest',
				pkg: '@c15t/vue',
			});
		} finally {
			context.dispose();
		}
	});
});
