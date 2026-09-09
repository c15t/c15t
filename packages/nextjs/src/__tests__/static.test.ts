import { describe, expect, test, vi } from 'vitest';

import {
	createStaticConsentResolver,
	createStaticManifestModule,
	resolveStrictestDefaultInit,
} from '../static';
import { MANIFEST_FIXTURE } from './manifest-fixture';

describe('@c15t/nextjs/static', () => {
	test('unknown geography uses the configured fallback without rewriting matchers', () => {
		const payload = resolveStrictestDefaultInit(MANIFEST_FIXTURE, {
			language: 'en',
		});

		expect(payload.policyResolution).toMatchObject({
			policyId: 'notice-default',
			status: 'matched',
		});
		expect(payload.policyResolution?.policy?.model).toBe('opt-out');
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

		expect(resolution.initial.policyResolution).toMatchObject({
			policyId: 'notice-default',
			status: 'matched',
		});
		const resolved = await resolution.resolved;
		expect(resolved.policyResolution.policy?.id).toBe('us-ca-opt-out');
		expect(resolved.location).toEqual({ countryCode: 'US', regionCode: 'CA' });
	});

	test('unresolved geo cannot select a regional rule after geo fetch failure', async () => {
		const manifest = {
			...MANIFEST_FIXTURE,
			policyPacks: MANIFEST_FIXTURE.policyPacks.filter(
				(pack) => pack.rule.id !== 'notice-default'
			),
		};
		const resolver = createStaticConsentResolver({
			fetch: vi.fn().mockRejectedValue(new Error('offline')),
			geoURL: 'https://example.com/geo',
			manifest,
		});
		expect(resolver.initial.policyResolution).toMatchObject({
			policy: null,
			reason: 'insufficient-inputs',
			status: 'failed',
		});
		expect((await resolver.resolved).policyResolution).toMatchObject({
			policy: null,
			reason: 'insufficient-inputs',
			status: 'failed',
		});
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
			"import type { ConsentManifest } from '@c15t/schema/types';"
		);
		expect(source).toContain('export const testManifest = {');
		expect(source).toContain('satisfies ConsentManifest');
	});
});
