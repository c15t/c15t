import {
	createConsentManifestPolicyPack,
	POLICY_OPTIONAL_CATEGORIES,
} from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import {
	createStaticConsentResolver,
	createStaticManifestModule,
	resolveStrictestDefaultInit,
} from '../static';
import { MANIFEST_FIXTURE } from './manifest-fixture';

describe('@c15t/tanstack-start/static', () => {
	test('strictest default uses opt-in while geo is unresolved', () => {
		const payload = resolveStrictestDefaultInit(MANIFEST_FIXTURE, {
			language: 'en',
		});

		expect(payload.policyResolution?.policy?.id).toBe('eu-opt-in');
		expect(payload.policyResolution?.policy?.model).toBe('opt-in');
		expect(payload.location).toEqual({ countryCode: null, regionCode: null });
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

	test('geo microfetch resolves the geo-specific policy after initial strict default', async () => {
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

		expect(resolution.initial.policyResolution?.policy?.id).toBe('eu-opt-in');
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

describe('resolveStrictestDefaultInit: ties within a model', () => {
	const loosened = function loosened(
		pack: (typeof MANIFEST_FIXTURE.policyPacks)[number],
		id: string
	) {
		const copy = structuredClone(pack);
		copy.rule.id = id;
		copy.rule.scopeMode = 'permissive';
		return copy;
	};

	test('prefers the strict-scope pack regardless of manifest order', () => {
		const [strict] = MANIFEST_FIXTURE.policyPacks;
		if (!strict) {
			throw new Error('fixture has no packs');
		}
		const loose = loosened(strict, 'eu-opt-in-loose');
		for (const policyPacks of [
			[strict, loose],
			[loose, strict],
		]) {
			const payload = resolveStrictestDefaultInit(
				{ ...MANIFEST_FIXTURE, policyPacks },
				{ language: 'en' }
			);
			expect(payload.policyResolution?.policy?.id).toBe('eu-opt-in');
			expect(payload.policyResolution?.policy?.scopeMode).toBe('strict');
		}
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

describe('resolveStrictestDefaultInit: effective permissions', () => {
	const pack = (
		id: string,
		categories: string[],
		scopeMode: 'strict' | 'permissive' = 'strict',
		gpc: string[] = []
	) =>
		createConsentManifestPolicyPack({
			categories,
			id,
			match: { fallback: true },
			model: 'opt-out',
			privacySignals: { gpc: { denyCategories: gpc } },
			prompt: 'notice',
			scopeMode,
		});
	const pick = (
		policyPacks: typeof MANIFEST_FIXTURE.policyPacks,
		gpc = false
	) =>
		resolveStrictestDefaultInit({ ...MANIFEST_FIXTURE, policyPacks }, { gpc })
			.policyResolution;
	test('prefers fewer permitted categories regardless of pack order', () => {
		const narrow = pack('narrow', ['marketing']);
		const wide = pack('wide', ['marketing', 'measurement']);
		for (const packs of [
			[narrow, wide],
			[wide, narrow],
		]) {
			expect(pick(packs)).toMatchObject({ policyId: 'narrow' });
		}
	});
	test('necessary-only authoring expands to the default optional scope', () => {
		expect(
			pick([
				pack('default-scope', ['necessary']),
				pack('marketing', ['marketing']),
			])
		).toMatchObject({ policyId: 'marketing' });
	});
	test('permissive scope allows categories outside its scope', () => {
		expect(
			pick([
				pack('permissive', [], 'permissive'),
				pack('strict', ['marketing']),
			])
		).toMatchObject({ policyId: 'strict' });
	});
	test('GPC only restricts its configured categories', () => {
		const limited = pack('limited', ['marketing']);
		const mapped = pack('gpc', [...POLICY_OPTIONAL_CATEGORIES], 'strict', [
			...POLICY_OPTIONAL_CATEGORIES,
		]);
		expect(pick([limited, mapped], false)).toMatchObject({
			policyId: 'limited',
		});
		expect(pick([limited, mapped], true)).toMatchObject({ policyId: 'gpc' });
	});
	test('preselection does not grant permission before a choice', () => {
		const preselected = createConsentManifestPolicyPack({
			categories: ['marketing'],
			id: 'preselected',
			match: { fallback: true },
			model: 'opt-in',
			preselectedCategories: ['marketing'],
			prompt: 'choice',
		});
		expect(pick([preselected, pack('opt-out', ['marketing'])])).toMatchObject({
			policyId: 'preselected',
		});
	});
});
