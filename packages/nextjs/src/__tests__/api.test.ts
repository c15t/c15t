import { manifest } from '@c15t/core/modes';
/**
 * Wiring of `@c15t/nextjs/api` onto the core consent route handler. The
 * route behaviour itself is pinned once, in
 * `packages/core/src/server/__tests__/consent-route.test.ts`.
 */
import { clearManifestCache } from '@c15t/core/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createConsentRoute, createManifestFetchInit } from '../api';
import type { NextRouteHandler } from '../api';
import { defineConsentConfig } from '../config';
import { MANIFEST_FIXTURE } from './manifest-fixture';

/** Calls a fixed-mount route handler, which reads the last URL segment. */
const call = (handler: NextRouteHandler, url: string, init?: RequestInit) =>
	handler(new Request(url, init), { params: Promise.resolve({}) });

const manifestFetch = () =>
	vi.fn<typeof globalThis.fetch>().mockImplementation(() =>
		Promise.resolve(
			Response.json(MANIFEST_FIXTURE, {
				headers: {
					'cache-control': 'public, s-maxage=120',
					etag: '"manifest-revision"',
				},
			})
		)
	);

beforeEach(() => {
	clearManifestCache();
});

describe('@c15t/nextjs/api', () => {
	test('serves a deployment manifest and resolves each visitor without fetching policy', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const { GET } = createConsentRoute({
			backendURL: 'https://consent.example.com',
			fetch,
			reportSessions: false,
			snapshot: MANIFEST_FIXTURE,
		});
		const served = await call(GET, 'https://app.example.com/api/c15t/manifest');
		expect(await served.json()).toEqual(MANIFEST_FIXTURE);
		await Promise.all(
			[
				{ country: 'DE', policyId: 'eu-opt-in', region: '' },
				{ country: 'US', policyId: 'us-ca-opt-out', region: 'CA' },
			].map(async ({ country, policyId, region }) => {
				const response = await call(
					GET,
					'https://app.example.com/api/c15t/init',
					{
						headers: {
							'x-vercel-ip-country': country,
							'x-vercel-ip-country-region': region,
						},
					}
				);
				expect(await response.json()).toMatchObject({
					policyResolution: { policyId, status: 'matched' },
				});
			})
		);
		expect(fetch).not.toHaveBeenCalled();
	});

	test('GET answers init and the manifest, with the Data Cache hint', async () => {
		const fetch = manifestFetch();
		const { GET } = createConsentRoute({
			backendURL: 'https://consent.example.com',
			fetch,
			manifestRevalidateSeconds: 120,
			reportSessions: false,
		});

		const init = await call(GET, 'https://app.example.com/api/c15t/init', {
			headers: { 'x-vercel-ip-country': 'DE' },
		});
		const served = await call(
			GET,
			'https://app.example.com/api/c15t/manifest',
			{ headers: { 'if-none-match': '"manifest-revision"' } }
		);

		expect(init.headers.get('cache-control')).toBe('private, no-store');
		expect(await init.json()).toMatchObject({
			policyResolution: { policyId: 'eu-opt-in' },
		});
		expect(served.status).toBe(304);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(
			'https://consent.example.com/manifest',
			expect.objectContaining({ next: { revalidate: 120 } })
		);
	});

	test('hands detached work to onBackgroundRevalidate', async () => {
		const fetch = manifestFetch();
		const registered: Promise<void>[] = [];
		const { GET } = createConsentRoute({
			backendURL: 'https://consent.example.com',
			fetch,
			onBackgroundRevalidate: (task) => {
				registered.push(task);
			},
		});
		await call(GET, 'https://app.example.com/api/c15t/init');
		expect(registered).toHaveLength(1);
		await registered[0];
		expect(fetch).toHaveBeenLastCalledWith(
			'https://consent.example.com/sessions',
			expect.objectContaining({ method: 'POST' })
		);
	});

	test('a config supplies backendURL and never fetches its own route', async () => {
		const fetch = manifestFetch();
		const config = defineConsentConfig({
			backendURL: 'https://consent.example.com/api/c15t',
			mode: manifest({ resolve: 'browser', source: 'runtime' }),
			routePrefix: '/api/consent',
		});
		const { GET } = createConsentRoute({ config, fetch });
		await call(GET, 'https://app.example.com/api/consent/manifest');
		expect(fetch.mock.calls[0]?.[0]).toBe(
			'https://consent.example.com/api/c15t/manifest'
		);
	});

	test("a mode's absolute manifestURL is fetched instead of the backend's", async () => {
		const fetch = manifestFetch();
		const config = defineConsentConfig({
			backendURL: 'https://consent.example.com',
			mode: manifest({ manifestURL: 'https://cdn.example.com/policy.json' }),
		});
		const { GET } = createConsentRoute({ config, fetch });
		await call(GET, 'https://app.example.com/api/c15t/manifest');
		expect(fetch.mock.calls[0]?.[0]).toBe(
			'https://cdn.example.com/policy.json'
		);
	});

	test('names the package when no backend is configured', async () => {
		const { GET } = createConsentRoute({});
		await expect(
			call(GET, 'https://app.example.com/api/c15t/init')
		).rejects.toThrow('@c15t/nextjs: pass backendURL or manifestURL.');
	});

	test('createManifestFetchInit defaults the Data Cache lifetime to 300 seconds', () => {
		expect(createManifestFetchInit().next).toEqual({ revalidate: 300 });
	});

	test('false disables the Data Cache rather than caching indefinitely', () => {
		expect(
			createManifestFetchInit({ manifestRevalidateSeconds: false }).next
		).toEqual({ revalidate: 0 });
	});
});
