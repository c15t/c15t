/**
 * The browser manifest resolver: English bundled, other languages loaded on
 * demand, and a location from the page, `geoURL` or the backend's `/init`.
 */
import {
	createConsentManifestPolicyPack,
	policyRulePresets,
} from '@c15t/schema/types';
import type { ConsentManifest } from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';
import { translations as germanCopy } from '@c15t/translations/de';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { ConsentMode } from '../modes';
import { earlyInitModes } from '../transports/early-init-modes';
import {
	createBrowserManifestTransport,
	manifest,
	manifestNeedsLocation,
	withEarlyInit,
} from '../transports/manifest-browser';
import type { InitContext } from '../types';

const everywhereManifest: ConsentManifest = {
	branding: 'c15t',
	policyPacks: [
		createConsentManifestPolicyPack({
			...policyRulePresets.europeOptIn(),
			id: 'everywhere',
			match: { isDefault: true },
		}),
	],
	revision: '1',
	schemaVersion: 2,
};

const geoManifest: ConsentManifest = {
	...everywhereManifest,
	policyPacks: [
		createConsentManifestPolicyPack(policyRulePresets.europeOptIn()),
	],
};

const initContext = (overrides: InitContext['overrides'] = {}): InitContext =>
	({ overrides, user: null }) as unknown as InitContext;

const jsonResponse = (body: unknown): Response =>
	new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/json' },
		status: 200,
	});

describe('manifest() from manifest-browser', () => {
	test('carries its options as data and reports the manifest kind', () => {
		const mode = manifest({
			backendURL: 'https://backend.example',
			snapshot: everywhereManifest,
		});

		expect(mode.kind).toBe('manifest');
		expect(mode.type).toBe('manifest');
		expect(mode.snapshot).toBe(everywhereManifest);
		const asMode: ConsentMode = mode;
		expect(asMode.type).toBe('manifest');
	});

	test('throws without a manifest source', () => {
		expect(() => manifest({})).toThrow('needs `snapshot`');
	});
});

describe('createBrowserManifestTransport()', () => {
	test("loads the visitor's language and resolves with its base copy", async () => {
		const fetchSpy = vi.fn<typeof fetch>();
		const transport = createBrowserManifestTransport({
			backendURL: 'https://backend.example',
			fetch: fetchSpy,
			snapshot: everywhereManifest,
		});

		const english = await transport.init?.(initContext({ language: 'en' }));
		const german = await transport.init?.(initContext({ language: 'de-DE' }));

		expect(english?.translations?.language).toBe('en');
		expect(german?.translations?.language).toBe('de');
		expect(german?.translations?.translations.common?.acceptAll).toBe(
			germanCopy.common.acceptAll
		);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	test('loads the base copy of every bundled language', async () => {
		const transport = createBrowserManifestTransport({
			backendURL: 'https://backend.example',
			snapshot: everywhereManifest,
		});

		for (const [language, copy] of Object.entries(baseTranslations)) {
			// oxlint-disable-next-line no-await-in-loop -- One language at a time.
			const response = await transport.init?.(initContext({ language }));
			expect(response?.translations?.language).toBe(language);
			expect(response?.translations?.translations.common?.acceptAll).toBe(
				copy.common.acceptAll
			);
		}
	});

	test('loads the vendor list for an IAB policy', async () => {
		const vendorList = { vendorListVersion: 42, vendors: {} };
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.resolve(jsonResponse(vendorList))
		);
		const transport = createBrowserManifestTransport({
			backendURL: 'https://backend.example',
			fetch: fetchSpy,
			snapshot: {
				...everywhereManifest,
				iab: {
					enabled: true,
					gvl: { url: 'https://gvl.example/vendor-list', version: 42 },
				},
				policyPacks: [
					createConsentManifestPolicyPack({
						categories: ['*'],
						id: 'everywhere-iab',
						match: { isDefault: true },
						model: 'iab',
						prompt: 'choice',
						scopeMode: 'strict',
					}),
				],
			},
		});

		const response = await transport.init?.(initContext({ language: 'en' }));

		expect(fetchSpy).toHaveBeenCalledWith(
			'https://gvl.example/vendor-list',
			expect.objectContaining({ method: 'GET' })
		);
		expect(response?.gvl).toEqual(vendorList);
	});

	test('asks geoURL for a location the policy needs', async () => {
		const fetchSpy = vi.fn<typeof fetch>((input) =>
			Promise.resolve(
				String(input) === '/geo'
					? jsonResponse({ country: 'de' })
					: jsonResponse({})
			)
		);
		const transport = createBrowserManifestTransport({
			backendURL: 'https://backend.example',
			fetch: fetchSpy,
			geoURL: '/geo',
			snapshot: geoManifest,
		});

		const response = await transport.init?.(initContext({ language: 'en' }));
		await transport.init?.(initContext({ language: 'en' }));

		expect(fetchSpy.mock.calls.map(([url]) => String(url))).toEqual(['/geo']);
		expect(response?.location?.countryCode).toBe('DE');
	});

	test('falls back to GET /init without a location', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.reject(new Error('offline'))
		);
		const transport = createBrowserManifestTransport({
			backendURL: 'https://backend.example',
			fetch: fetchSpy,
			snapshot: geoManifest,
		});

		await transport.init?.(initContext({ language: 'en' })).catch(() => null);

		expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(
			'https://backend.example/init'
		);
	});

	test('needs a region only for a country some pack splits by region', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.reject(new Error('offline'))
		);
		const transport = createBrowserManifestTransport({
			backendURL: 'https://backend.example',
			fetch: fetchSpy,
			snapshot: {
				...geoManifest,
				policyPacks: [
					...(geoManifest.policyPacks ?? []),
					createConsentManifestPolicyPack(
						policyRulePresets.usPrivacyStatesOptOut()
					),
				],
			},
		});

		const german = await transport.init?.(
			initContext({ country: 'DE', language: 'en' })
		);
		await transport
			.init?.(initContext({ country: 'US', language: 'en' }))
			.catch(() => null);

		expect(german?.location?.countryCode).toBe('DE');
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('/init');
	});

	test('with initFallback off, resolves for an unknown location', async () => {
		const fetchSpy = vi.fn<typeof fetch>();
		const transport = createBrowserManifestTransport({
			backendURL: 'https://backend.example',
			fetch: fetchSpy,
			initFallback: false,
			snapshot: geoManifest,
		});

		const response = await transport.init?.(initContext({ language: 'en' }));

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(response?.location?.countryCode).toBeNull();
	});

	test('fetches the manifest with the given headers and credentials', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.resolve(jsonResponse(everywhereManifest))
		);
		const transport = createBrowserManifestTransport({
			credentials: 'include',
			fetch: fetchSpy,
			headers: { 'x-test': '1' },
			manifestURL: 'https://backend.example/manifest',
		});

		await transport.init?.(initContext({ language: 'en' }));
		await transport.init?.(initContext({ language: 'en' }));

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('https://backend.example/manifest');
		expect(init?.credentials).toBe('include');
		expect(init?.headers).toMatchObject({
			accept: 'application/json',
			'x-test': '1',
		});
	});
});

/**
 * Keyed by location, but every location gets the same opt-in banner: only
 * the policy ids differ.
 */
const sameBannerEverywhere: ConsentManifest = {
	...everywhereManifest,
	policyPacks: [
		createConsentManifestPolicyPack(policyRulePresets.europeOptIn()),
		createConsentManifestPolicyPack(policyRulePresets.quebecOptIn()),
		createConsentManifestPolicyPack({
			...policyRulePresets.europeOptIn(),
			id: 'world_opt_in',
			match: { isDefault: true },
		}),
	],
};

/** A banner in Europe and Quebec, none in California or anywhere else. */
const bannerSomewhere: ConsentManifest = {
	...everywhereManifest,
	policyPacks: [
		createConsentManifestPolicyPack(policyRulePresets.europeOptIn()),
		createConsentManifestPolicyPack(policyRulePresets.quebecOptIn()),
		createConsentManifestPolicyPack(policyRulePresets.californiaOptOut()),
		createConsentManifestPolicyPack(policyRulePresets.worldNone()),
	],
};

describe('manifestNeedsLocation()', () => {
	test('is false when every location gets the same banner', () => {
		expect(manifestNeedsLocation(sameBannerEverywhere)).toBe(false);
	});

	test('is true when some location gets a different banner or none', () => {
		expect(manifestNeedsLocation(bannerSomewhere)).toBe(true);
		expect(manifestNeedsLocation(geoManifest)).toBe(true);
	});

	test('is true when a country with region packs and no region fails to match', () => {
		// Default but no fallback: a Canadian visitor without a province is
		// insufficient input, which shows no banner.
		expect(
			manifestNeedsLocation({
				...everywhereManifest,
				policyPacks: [
					createConsentManifestPolicyPack(policyRulePresets.quebecOptIn()),
					createConsentManifestPolicyPack({
						...policyRulePresets.quebecOptIn(),
						id: 'world_opt_in',
						match: { isDefault: true },
					}),
				],
			})
		).toBe(true);
	});
});

describe('createBrowserManifestTransport() for an unknown location', () => {
	test('answers in the browser when every location gets the same banner', async () => {
		const fetchSpy = vi.fn<typeof fetch>();
		const transport = createBrowserManifestTransport({
			backendURL: 'https://backend.example',
			fetch: fetchSpy,
			snapshot: sameBannerEverywhere,
		});

		const response = await transport.init?.(initContext({ language: 'en' }));

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(response?.location).toEqual({ countryCode: null, regionCode: null });
		expect(response?.policyResolution).toMatchObject({ status: 'matched' });
	});

	test('skips geoURL when every location gets the same banner', async () => {
		const fetchSpy = vi.fn<typeof fetch>();
		const transport = createBrowserManifestTransport({
			backendURL: 'https://backend.example',
			fetch: fetchSpy,
			geoURL: '/geo',
			snapshot: sameBannerEverywhere,
		});

		await transport.init?.(initContext({ language: 'en' }));

		expect(fetchSpy).not.toHaveBeenCalled();
	});

	test('asks /init when the runtime mounts GPP', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.reject(new Error('offline'))
		);
		const transport = createBrowserManifestTransport(
			{
				backendURL: 'https://backend.example',
				fetch: fetchSpy,
				snapshot: sameBannerEverywhere,
			},
			{ gppEnabled: true }
		);

		await transport.init?.(initContext({ language: 'en' })).catch(() => null);

		expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('/init');
	});

	test('starts the /init request within the init() call', () => {
		const fetchSpy = vi.fn<typeof fetch>(
			() =>
				new Promise<Response>(() => {
					/* never settles */
				})
		);
		const transport = createBrowserManifestTransport({
			backendURL: 'https://backend.example',
			fetch: fetchSpy,
			snapshot: bannerSomewhere,
		});

		void transport.init?.(initContext({ language: 'en' }));

		expect(fetchSpy).toHaveBeenCalledOnce();
		expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('/init');
	});
});

describe('withEarlyInit()', () => {
	const options = (snapshot: ConsentManifest, fetchSpy: typeof fetch) => ({
		backendURL: 'https://backend.example',
		fetch: fetchSpy,
		snapshot,
	});

	afterEach(() => {
		delete (window as Window & { __gpp?: unknown }).__gpp;
	});

	test('says the first init asks the backend only when the snapshot cannot answer', () => {
		const fetchSpy = vi.fn<typeof fetch>();
		const somewhere = earlyInitModes.get(
			withEarlyInit(manifest(options(bannerSomewhere, fetchSpy)))
		);
		const same = earlyInitModes.get(
			withEarlyInit(manifest(options(sameBannerEverywhere, fetchSpy)))
		);
		const fetched = earlyInitModes.get(
			withEarlyInit(
				manifest({ fetch: fetchSpy, manifestURL: 'https://x.test/manifest' })
			)
		);

		expect(somewhere?.requestsInit({ language: 'en' })).toBe(true);
		expect(
			somewhere?.requestsInit({ country: 'US', language: 'en', region: 'NY' })
		).toBe(false);
		expect(same?.requestsInit({ language: 'en' })).toBe(false);
		// A fetched manifest cannot tell before its request.
		expect(fetched?.requestsInit({ language: 'en' })).toBe(false);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	test('asks /init when __gpp is installed', () => {
		const early = earlyInitModes.get(
			withEarlyInit(manifest(options(sameBannerEverywhere, vi.fn())))
		);
		expect(early?.requestsInit({ language: 'en' })).toBe(false);

		(window as Window & { __gpp?: unknown }).__gpp = () => undefined;

		expect(early?.requestsInit({ language: 'en' })).toBe(true);
	});

	test('builds a transport of its own for every call', () => {
		const mode = manifest(options(bannerSomewhere, vi.fn()));
		expect(mode({} as never)).not.toBe(mode({} as never));
	});

	test('recognizes a mode built again with an equal snapshot', () => {
		const fetchSpy = vi.fn<typeof fetch>();
		const register = (snapshot: ConsentManifest) =>
			earlyInitModes.get(withEarlyInit(manifest(options(snapshot, fetchSpy))));
		const first = register(structuredClone(bannerSomewhere));
		const again = register(structuredClone(bannerSomewhere));
		const edited = register({
			...structuredClone(bannerSomewhere),
			appName: 'other',
		});
		const other = register(sameBannerEverywhere);

		expect(first && again && first.sameAs(again)).toBe(true);
		expect(first && edited && first.sameAs(edited)).toBe(false);
		expect(first && other && first.sameAs(other)).toBe(false);
	});
});
