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
import { describe, expect, test, vi } from 'vitest';

import type { ConsentMode } from '../modes';
import {
	createBrowserManifestTransport,
	manifest,
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
