import { describe, expect, it } from 'vitest';
import type { C15TOptions } from '~/types';
import { createManifestRoute } from './manifest';

function createOptions(overrides: Partial<C15TOptions> = {}): C15TOptions {
	return {
		trustedOrigins: [],
		adapter: {} as C15TOptions['adapter'],
		...overrides,
	};
}

describe('createManifestRoute', () => {
	it('serves a CDN-cacheable geo-independent manifest with an ETag', async () => {
		const app = createManifestRoute(
			createOptions({
				tenantId: 'tenant_a',
				branding: 'none',
				manifestCache: {
					sMaxAge: 120,
					staleWhileRevalidate: 600,
				},
				iab: {
					enabled: true,
					cmpId: 42,
					endpoint: 'https://gvl.example.com',
					bundled: {
						en: {
							gvlSpecificationVersion: 3,
							vendorListVersion: 1,
							tcfPolicyVersion: 5,
							lastUpdated: '2026-01-01T00:00:00Z',
							purposes: {},
							specialPurposes: {},
							features: {},
							specialFeatures: {},
							vendors: {},
							stacks: {},
						},
					},
				},
				policyPacks: [
					{
						id: 'eu_iab',
						match: { countries: ['FR'] },
						consent: { model: 'iab' },
					},
				],
			})
		);

		const response = await app.request('http://localhost/');
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe(
			'public, s-maxage=120, stale-while-revalidate=600'
		);
		expect(response.headers.get('etag')).toMatch(/^"[a-f0-9]{64}"$/);
		expect(body.tenantId).toBe('tenant_a');
		expect(body.branding).toBe('none');
		expect(body.policyPacks[0].fingerprint).toMatch(/^[a-f0-9]{64}$/);
		expect(body.iab.gvl).toEqual({ url: 'https://gvl.example.com' });
		expect(body.gvl).toBeUndefined();

		const notModified = await app.request('http://localhost/', {
			headers: {
				'if-none-match': response.headers.get('etag') ?? '',
			},
		});
		expect(notModified.status).toBe(304);
		expect(notModified.headers.get('cache-control')).toBe(
			'public, s-maxage=120, stale-while-revalidate=600'
		);
	});

	it('serves a single-language translation input slice', async () => {
		const app = createManifestRoute(
			createOptions({
				customTranslations: {
					en: {
						common: { acceptAll: 'Accept' },
					},
					de: {
						common: { acceptAll: 'Akzeptieren' },
					},
				},
				i18n: {
					defaultProfile: 'default',
					messages: {
						default: {
							fallbackLanguage: 'en',
							translations: {
								en: {
									common: { rejectAll: 'Reject' },
								},
								de: {
									common: { rejectAll: 'Ablehnen' },
								},
							},
						},
					},
				},
			})
		);

		const response = await app.request('http://localhost/?language=de-DE');
		const body = await response.json();

		expect(Object.keys(body.translations.customTranslations)).toEqual(['de']);
		expect(
			Object.keys(body.translations.i18n.messages.default.translations)
		).toEqual(['de']);
		expect(
			body.translations.i18n.messages.default.translations.de.common.rejectAll
		).toBe('Ablehnen');
	});
});
