import type { ConsentManifest } from '@c15t/schema/types';
import {
	createConsentManifestPolicyPack,
	policyRulePresets,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsentClient } from '../client';
import { manifest, manifestNeedsLocation } from '../transports/manifest';
import type { ConsentClient } from '../types';

const clients: ConsentClient[] = [];

const clearCookies = function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

const everywhereManifest: ConsentManifest = {
	branding: 'c15t',
	defaults: { disableGeoLocation: true },
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
	defaults: {},
	policyPacks: [
		createConsentManifestPolicyPack(policyRulePresets.europeOptIn()),
	],
};

const initResponse = function initResponse(): Response {
	return new Response(
		JSON.stringify(
			resolveInitFromManifest(geoManifest, { country: 'DE', language: 'en' })
		),
		{ headers: { 'content-type': 'application/json' }, status: 200 }
	);
};

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	localStorage.clear();
	clearCookies();
	vi.restoreAllMocks();
});

describe('manifestNeedsLocation', () => {
	it('is false when geo is disabled or every pack is a default', () => {
		expect(manifestNeedsLocation(everywhereManifest)).toBe(false);
		expect(manifestNeedsLocation({ ...everywhereManifest, defaults: {} })).toBe(
			false
		);
	});

	it('is true for country packs and for jurisdiction defaults', () => {
		expect(manifestNeedsLocation(geoManifest)).toBe(true);
		expect(
			manifestNeedsLocation({
				...everywhereManifest,
				defaults: {},
				policyPacks: undefined,
			})
		).toBe(true);
	});
});

describe('manifest()', () => {
	it('sends the locally resolved policy assertion when saving', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.resolve(
				new Response(JSON.stringify({ ok: true, subjectId: 'sub_browser1' }))
			)
		);
		const client = createConsentClient({
			mode: manifest({
				backendURL: 'https://example.test',
				fetch: fetchSpy,
				manifest: everywhereManifest,
			}),
		});
		clients.push(client);
		client.start();
		await client.ready();
		await client.acceptAll();
		expect(fetchSpy).toHaveBeenCalledOnce();
		expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
			'https://example.test/subjects'
		);
		const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
		expect(body.policyId).toBe('everywhere');
		expect(body.fingerprint).toEqual(expect.any(String));
		expect(body.choice.categories.measurement.value).toBe(true);
	});

	it('resolves an unknown region through the backend even when the country is known', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(initResponse()));
		const client = createConsentClient({
			mode: manifest({
				backendURL: 'https://example.test',
				fetch: fetchSpy,
				manifest: {
					...geoManifest,
					policyPacks: [
						createConsentManifestPolicyPack(
							policyRulePresets.usPrivacyStatesOptOut()
						),
					],
				},
			}),
			overrides: { country: 'US' },
		});
		clients.push(client);
		client.start();
		await client.ready();
		expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('/init');
	});
	it('throws without a manifest source', () => {
		expect(() => manifest({})).toThrow(/manifest/u);
	});

	it('resolves an inline manifest with no request at all', async () => {
		const fetchSpy = vi.fn<typeof fetch>();
		const client = createConsentClient(
			{
				consentCategories: ['measurement'],
				mode: manifest({
					backendURL: 'https://x.c15t.dev',
					fetch: fetchSpy,
					manifest: everywhereManifest,
				}),
			},
			{ pkg: 'test' }
		);
		clients.push(client);
		client.start();

		const snapshot = await client.ready();

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(snapshot.activeUI).toBe('banner');
		expect(snapshot.policyRule.id).toBe(
			everywhereManifest.policyPacks?.[0]?.rule.id
		);
		expect(snapshot.translations?.language).toBe('en');
	});

	it('falls back to GET /init when the policy needs a country it lacks', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(initResponse()));
		const client = createConsentClient(
			{
				mode: manifest({
					backendURL: 'https://x.c15t.dev',
					fetch: fetchSpy,
					manifest: geoManifest,
				}),
			},
			{ pkg: 'test' }
		);
		clients.push(client);
		client.start();

		const snapshot = await client.ready();

		expect(fetchSpy).toHaveBeenCalledOnce();
		expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('/init');
		expect(snapshot.location?.countryCode).toBe('DE');
	});

	it('resolves locally when the country is already known', async () => {
		const fetchSpy = vi.fn<typeof fetch>();
		const client = createConsentClient(
			{
				mode: manifest({
					backendURL: 'https://x.c15t.dev',
					fetch: fetchSpy,
					manifest: geoManifest,
				}),
				overrides: { country: 'FR' },
			},
			{ pkg: 'test' }
		);
		clients.push(client);
		client.start();

		const snapshot = await client.ready();

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(snapshot.activeUI).toBe('banner');
		expect(snapshot.location?.countryCode).toBe('FR');
	});

	it('keeps a root-relative manifest URL on this origin for /init and saves', async () => {
		const fetchSpy = vi.fn<typeof fetch>((input) =>
			Promise.resolve(
				String(input).includes('/init')
					? initResponse()
					: new Response(JSON.stringify(geoManifest), {
							headers: { 'content-type': 'application/json' },
							status: 200,
						})
			)
		);
		const client = createConsentClient(
			{ mode: manifest({ fetch: fetchSpy, manifestURL: '/manifest' }) },
			{ pkg: 'test' }
		);
		clients.push(client);
		client.start();

		const snapshot = await client.ready();

		// No country and a country-keyed pack: the fallback must reach
		// `/init` on this origin rather than resolve blind.
		expect(fetchSpy.mock.calls.map((call) => String(call[0]))).toEqual([
			'/manifest',
			'/init',
		]);
		expect(snapshot.location?.countryCode).toBe('DE');
	});

	it('refuses to resolve a location-dependent manifest with no backend and no country', async () => {
		const client = createConsentClient(
			{ mode: manifest({ manifest: geoManifest }) },
			{ pkg: 'test' }
		);
		clients.push(client);
		const onError = vi.fn();
		client.on('error', onError);
		client.start();

		await vi.waitFor(() => {
			expect(onError).toHaveBeenCalled();
		});
		expect(String(onError.mock.calls[0]?.[0])).toMatch(/depends on location/u);
		expect(client.getSnapshot().activeUI).toBe('none');
	});

	it('fetches a manifest URL once and derives the backend from it', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.resolve(
				new Response(JSON.stringify(everywhereManifest), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
			)
		);
		const client = createConsentClient(
			{
				mode: manifest({
					fetch: fetchSpy,
					manifestURL: 'https://x.c15t.dev/manifest',
				}),
			},
			{ pkg: 'test' }
		);
		clients.push(client);
		client.start();

		await client.ready();
		client.setLanguage('en');
		await vi.waitFor(() => {
			expect(client.getSnapshot().revision).toBeGreaterThan(1);
		});

		expect(fetchSpy).toHaveBeenCalledOnce();
		expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
			'https://x.c15t.dev/manifest'
		);
	});
});
