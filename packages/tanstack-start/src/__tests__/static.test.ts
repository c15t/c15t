import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import {
	createStaticConsentResolver,
	createStaticManifestModule,
	resolveStrictestDefaultInit,
	resolveUnknownLocationInit,
} from '../static';
import { MANIFEST_FIXTURE } from './manifest-fixture';

describe('@c15t/tanstack-start/static', () => {
	test('unknown geography uses the configured fallback, not a stricter pack', () => {
		// The fixture's `notice-default` fallback is opt-out; `eu-opt-in` is
		// stricter but only matches DE and must not apply to everyone.
		const resolution = createStaticConsentResolver({
			language: 'en',
			manifest: MANIFEST_FIXTURE,
		});

		expect(resolution.initial.policyResolution).toMatchObject({
			policyId: 'notice-default',
			status: 'matched',
		});
		expect(resolution.initial.policyResolution.policy?.model).toBe('opt-out');
		expect(resolution.initial.location).toEqual({
			countryCode: null,
			regionCode: null,
		});
	});

	test('uses the browser language when no language is configured', () => {
		const languagesSpy = vi
			.spyOn(navigator, 'languages', 'get')
			.mockReturnValue(['de-DE']);

		try {
			const resolution = createStaticConsentResolver({
				gpc: false,
				manifest: MANIFEST_FIXTURE,
			});

			expect(resolution.initial.translations.language).toBe('de');
		} finally {
			languagesSpy.mockRestore();
		}
	});

	test('geo microfetch resolves the geo-specific policy after the unknown-location default', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ country: 'US', region: 'CA' }), {
				status: 200,
			})
		);

		const resolution = createStaticConsentResolver({
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			geoURL: 'https://geo.example.com/context',
			language: 'en',
			manifest: MANIFEST_FIXTURE,
		});

		expect(resolution.initial.policyResolution?.policy?.id).toBe(
			'notice-default'
		);
		const resolved = await resolution.resolved;
		expect(resolved.policyResolution?.policy?.id).toBe('us-ca-opt-out');
		expect(resolved.location).toEqual({ countryCode: 'US', regionCode: 'CA' });
	});

	test('build-time module helper fetches and emits a typed manifest module', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(MANIFEST_FIXTURE), { status: 200 })
			);

		const source = await createStaticManifestModule({
			exportName: 'testManifest',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifestURL: 'https://consent.example.com/manifest',
		});

		expect(source).toContain(
			"import type { ConsentManifest } from '@c15t/tanstack-start/static';"
		);
		expect(source).toContain('export const testManifest = {');
		expect(source).toContain('satisfies ConsentManifest');
	});
});

describe('createStaticManifestModule: exportName', () => {
	test('rejects an exportName that is not an identifier', async () => {
		await expect(
			createStaticManifestModule({
				exportName: 'consent-manifest',
				fetch: vi.fn() as unknown as typeof globalThis.fetch,
				manifestURL: 'https://consent.example.com/manifest',
			})
		).rejects.toThrow(/valid identifier/u);
	});
});

describe('createStaticManifestModule: reserved export names', () => {
	test('rejects reserved words that would not bind', async () => {
		await expect(
			createStaticManifestModule({
				exportName: 'default',
				fetch: vi.fn() as unknown as typeof globalThis.fetch,
				manifestURL: 'https://consent.example.com/manifest',
			})
		).rejects.toThrow(/valid identifier/u);
	});
});

describe('createStaticManifestModule: strict-mode names', () => {
	test.each(['eval', 'arguments'])('rejects %s', async (exportName) => {
		await expect(
			createStaticManifestModule({
				exportName,
				fetch: vi.fn() as unknown as typeof globalThis.fetch,
				manifestURL: 'https://consent.example.com/manifest',
			})
		).rejects.toThrow(/valid identifier/u);
	});
});

describe('createStaticManifestModule: importSource', () => {
	const fetchManifest = () =>
		vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(MANIFEST_FIXTURE), { status: 200 })
			) as unknown as typeof globalThis.fetch;

	test('imports the type from the entry the app declares', async () => {
		const source = await createStaticManifestModule({
			fetch: fetchManifest(),
			importSource: 'c15t/tanstack-start/static',
			manifestURL: 'https://consent.example.com/manifest',
		});
		expect(source).toContain(
			"import type { ConsentManifest } from 'c15t/tanstack-start/static';"
		);
	});

	test('rejects an importSource that is not a module specifier', async () => {
		await expect(
			createStaticManifestModule({
				fetch: fetchManifest(),
				importSource: "x'; import evil from 'y",
				manifestURL: 'https://consent.example.com/manifest',
			})
		).rejects.toThrow(/importSource/u);
	});
});

describe('resolveUnknownLocationInit', () => {
	const optIn = createConsentManifestPolicyPack({
		categories: ['marketing', 'measurement'],
		id: 'de-opt-in',
		match: { countries: ['DE'] },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'strict',
	});
	const fallback = createConsentManifestPolicyPack({
		categories: ['marketing'],
		id: 'unknown-opt-out',
		match: { fallback: true },
		model: 'opt-out',
		prompt: 'notice',
		scopeMode: 'permissive',
	});

	test('uses the fallback pack even when another pack is stricter', () => {
		for (const policyPacks of [
			[optIn, fallback],
			[fallback, optIn],
		]) {
			const payload = resolveUnknownLocationInit(
				{ ...MANIFEST_FIXTURE, policyPacks },
				{ language: 'en' }
			);
			expect(payload.policyResolution).toMatchObject({
				matchedBy: 'fallback',
				policyId: 'unknown-opt-out',
				status: 'matched',
			});
		}
	});

	test('keeps the deprecated resolveStrictestDefaultInit name working', () => {
		expect(resolveStrictestDefaultInit).toBe(resolveUnknownLocationInit);
	});
});
