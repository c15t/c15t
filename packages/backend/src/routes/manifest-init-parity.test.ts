import type { InitOutput } from '@c15t/schema/types';
import { resolveInitFromManifest } from '@c15t/schema/types';
import { describe, expect, it, vi } from 'vitest';
import { buildConsentManifestFromOptions } from '~/handlers/init/manifest';
import type { C15TOptions } from '~/types';
import { createInitRoute } from './init';

const mockGVL = {
	gvlSpecificationVersion: 3,
	vendorListVersion: 42,
	tcfPolicyVersion: 5,
	lastUpdated: '2026-01-01T00:00:00Z',
	purposes: {},
	specialPurposes: {},
	features: {},
	specialFeatures: {},
	vendors: {},
	stacks: {},
};

vi.mock('~/cache/gvl-resolver', () => ({
	createGVLResolver: vi.fn(() => ({
		get: vi.fn().mockResolvedValue(mockGVL),
	})),
}));

function createOptions(): C15TOptions {
	return {
		trustedOrigins: [],
		adapter: {} as C15TOptions['adapter'],
		branding: 'c15t',
		iab: {
			enabled: true,
			cmpId: 28,
			endpoint: 'https://gvl.example.com',
			customVendors: [{ id: 'internal-analytics' }],
		},
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
		policyPacks: [
			{
				id: 'eu_opt_in',
				match: { countries: ['DE'] },
				consent: {
					model: 'opt-in',
					expiryDays: 365,
					scopeMode: 'strict',
					categories: ['necessary', 'measurement', 'marketing'],
				},
				ui: { mode: 'banner' },
			},
			{
				id: 'us_ca_opt_out',
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
			{
				id: 'fr_iab',
				match: { countries: ['FR'] },
				i18n: { messageProfile: 'default' },
				consent: {
					model: 'iab',
					expiryDays: 180,
					scopeMode: 'strict',
				},
			},
			{
				id: 'notice_default',
				match: { isDefault: true },
				consent: {
					model: 'none',
					expiryDays: 30,
					scopeMode: 'permissive',
					categories: ['necessary'],
				},
				ui: { mode: 'none' },
			},
		],
	};
}

function shouldIncludeGvl(payload: InitOutput): boolean {
	return payload.policy?.model === 'iab';
}

async function assembleFromManifest(
	options: C15TOptions,
	inputs: {
		country: string;
		region?: string;
		language: string;
		gpc: boolean;
	}
): Promise<InitOutput> {
	const manifest = await buildConsentManifestFromOptions(options);
	const payload = resolveInitFromManifest(manifest, {
		country: inputs.country,
		region: inputs.region ?? null,
		language: inputs.language,
		gpc: inputs.gpc,
	});

	if (shouldIncludeGvl(payload)) {
		payload.gvl = mockGVL;
	}

	return payload;
}

describe('manifest/init parity contract', () => {
	it('matches backend /init byte-for-byte across jurisdiction, language, and GPC matrix', async () => {
		const options = createOptions();
		const app = createInitRoute(options);
		const cells = [
			{ label: 'EU opt-in', country: 'DE' },
			{ label: 'US opt-out', country: 'US', region: 'CA' },
			{ label: 'notice-like', country: 'US', region: 'NY' },
			{ label: 'IAB', country: 'FR' },
		];
		const languages = [
			{ label: 'de', value: 'de-DE,de;q=0.9' },
			{ label: 'en', value: 'en-US,en;q=0.9' },
			{ label: 'fallback', value: 'es-MX,es;q=0.9' },
		];
		const gpcValues = [false, true];

		for (const cell of cells) {
			for (const language of languages) {
				for (const gpc of gpcValues) {
					const response = await app.request('http://localhost/', {
						headers: {
							'x-c15t-country': cell.country,
							...(cell.region && { 'x-c15t-region': cell.region }),
							'accept-language': language.value,
							'sec-gpc': gpc ? '1' : '0',
						},
					});
					const backendBody = await response.text();
					const assembled = await assembleFromManifest(options, {
						country: cell.country,
						region: cell.region,
						language: language.value,
						gpc,
					});
					const assembledBody = JSON.stringify(assembled);

					expect(
						JSON.parse(assembledBody),
						`${cell.label}/${language.label}/gpc:${gpc}`
					).toEqual(JSON.parse(backendBody));
					expect(
						assembledBody,
						`${cell.label}/${language.label}/gpc:${gpc}`
					).toBe(backendBody);
				}
			}
		}
	});
});
