import { describe, expect, test, vi } from 'vitest';

import {
	createStaticConsentResolver,
	createStaticManifestModule,
	resolveStrictestDefaultInit,
} from '../static';
import { MANIFEST_FIXTURE } from './manifest-fixture';

describe('@c15t/nextjs/v3/static', () => {
	test('strictest default uses opt-in while geo is unresolved', () => {
		const payload = resolveStrictestDefaultInit(MANIFEST_FIXTURE, {
			language: 'en',
		});

		expect(payload.policy?.id).toBe('eu-opt-in');
		expect(payload.policy?.model).toBe('opt-in');
		expect(payload.location).toEqual({ countryCode: null, regionCode: null });
	});

	test('geo microfetch resolves the geo-specific policy after initial strict default', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ country: 'US', region: 'CA' }), {
				status: 200,
			})
		);

		const resolution = createStaticConsentResolver({
			manifest: MANIFEST_FIXTURE,
			geoURL: 'https://geo.example.com/context',
			language: 'en',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		expect(resolution.initial.policy?.id).toBe('eu-opt-in');
		const resolved = await resolution.resolved;
		expect(resolved.policy?.id).toBe('us-ca-opt-out');
		expect(resolved.location).toEqual({ countryCode: 'US', regionCode: 'CA' });
	});

	test('build-time module helper fetches and emits a typed manifest module', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(MANIFEST_FIXTURE), { status: 200 })
			);

		const source = await createStaticManifestModule({
			manifestURL: 'https://consent.example.com/manifest',
			exportName: 'testManifest',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		expect(source).toContain(
			"import type { ConsentManifest } from '@c15t/schema/types';"
		);
		expect(source).toContain('export const testManifest = {');
		expect(source).toContain('satisfies ConsentManifest');
	});
});
