/**
 * With `withConsentManifest` aliasing `@c15t/nextjs/generated-manifest` to
 * the snapshot, the route and `resolveConsent` read it without the app
 * passing `manifest`.
 */
import { clearManifestCache } from '@c15t/core/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createConsentRoute } from '../api';
import { defineConsentConfig } from '../config';
import { resolveConsent } from '../server';
import { MANIFEST_FIXTURE } from './manifest-fixture';

// oxlint-disable-next-line anti-slop/no-module-mocking -- In an app build, the bundler alias `withConsentManifest` sets swaps this module for the generated snapshot. The mock is that alias; the helpers under test are real.
vi.mock('@c15t/nextjs/generated-manifest', async () => ({
	backendURL: 'https://consent.example.com',
	snapshot: (await import('./manifest-fixture')).MANIFEST_FIXTURE,
}));

const config = defineConsentConfig({
	backendURL: 'https://consent.example.com',
	routePrefix: '/api/c15t',
});

const fetch = vi.fn<typeof globalThis.fetch>(() =>
	Promise.resolve(new Response(null, { status: 202 }))
);

beforeEach(() => {
	clearManifestCache();
	fetch.mockClear();
	vi.stubGlobal('fetch', fetch);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('generated manifest default', () => {
	test('the route serves the snapshot without fetching it', async () => {
		const { GET } = createConsentRoute(config);

		const response = await GET(
			new Request('https://app.example.com/api/c15t/manifest'),
			{ params: Promise.resolve({ c15t: ['manifest'] }) }
		);

		expect(await response.json()).toEqual(MANIFEST_FIXTURE);
		expect(fetch).not.toHaveBeenCalled();
	});

	test('resolveConsent reads the snapshot for a same-origin manifest route', async () => {
		const state = await resolveConsent({
			config,
			reportSessions: false,
			request: {
				cookies: () => ({ toString: () => '' }),
				headers: () =>
					new Headers({
						host: 'app.example.com',
						'x-vercel-ip-country': 'DE',
					}),
			},
		});

		expect(JSON.stringify(state)).toContain('eu-opt-in');
		expect(fetch).not.toHaveBeenCalled();
	});

	test('an upstream manifestURL wins over the snapshot', async () => {
		fetch.mockImplementation(() =>
			Promise.resolve(Response.json({ ...MANIFEST_FIXTURE, revision: 'up' }))
		);
		const { GET } = createConsentRoute({
			manifestURL: 'https://cdn.example.com/manifest.json',
		});

		const response = await GET(
			new Request('https://app.example.com/api/c15t/manifest'),
			{ params: Promise.resolve({ c15t: ['manifest'] }) }
		);

		expect(await response.json()).toMatchObject({ revision: 'up' });
	});
});
