/**
 * Wiring of `@c15t/nextjs/api` onto the core consent route handler. The
 * route behaviour itself is pinned once, in
 * `packages/core/src/server/__tests__/consent-route.test.ts`.
 */
import { clearManifestCache } from '@c15t/core/transports/manifest-cache';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
	createManifestFetchInit,
	createNextConsentRouteHandlers,
} from '../api';
import { defineConsentConfig } from '../config';
import { MANIFEST_FIXTURE } from './manifest-fixture';

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
	test('GET answers init and manifestGET the manifest, with the Data Cache hint', async () => {
		const fetch = manifestFetch();
		const { GET, manifestGET } = createNextConsentRouteHandlers({
			backendURL: 'https://consent.example.com',
			fetch,
			manifestRevalidateSeconds: 120,
			reportSessions: false,
		});

		const init = await GET(
			new Request('https://app.example.com/api/c15t/init', {
				headers: { 'x-vercel-ip-country': 'DE' },
			})
		);
		const manifest = await manifestGET(
			new Request('https://app.example.com/api/c15t/manifest', {
				headers: { 'if-none-match': '"manifest-revision"' },
			})
		);

		expect(init.headers.get('cache-control')).toBe('private, no-store');
		expect(await init.json()).toMatchObject({
			policyResolution: { policyId: 'eu-opt-in' },
		});
		expect(manifest.status).toBe(304);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(
			'https://consent.example.com/manifest',
			expect.objectContaining({ next: { revalidate: 120 } })
		);
	});

	test('hands detached work to onBackgroundRevalidate', async () => {
		const fetch = manifestFetch();
		const registered: Promise<void>[] = [];
		const { GET } = createNextConsentRouteHandlers({
			backendURL: 'https://consent.example.com',
			fetch,
			onBackgroundRevalidate: (task) => {
				registered.push(task);
			},
		});
		await GET(new Request('https://app.example.com/api/c15t/init'));
		expect(registered).toHaveLength(1);
		await registered[0];
		expect(fetch).toHaveBeenLastCalledWith(
			'https://consent.example.com/sessions',
			expect.objectContaining({ method: 'POST' })
		);
	});

	test('a defineConsentConfig result supplies backendURL and ignores its same-origin routes', async () => {
		const fetch = manifestFetch();
		const config = defineConsentConfig({
			backendURL: 'https://consent.example.com/api/c15t',
			initURL: '/api/consent/init',
			manifestURL: '/api/consent/manifest',
		});
		const { manifestGET } = createNextConsentRouteHandlers({
			...config,
			fetch,
		});
		await manifestGET(
			new Request('https://app.example.com/api/consent/manifest')
		);
		expect(fetch.mock.calls[0]?.[0]).toBe(
			'https://consent.example.com/api/c15t/manifest'
		);
	});

	test('names the package when no backend is configured', async () => {
		const { GET } = createNextConsentRouteHandlers({});
		await expect(
			GET(new Request('https://app.example.com/api/c15t/init'))
		).rejects.toThrow('@c15t/nextjs: pass backendURL or manifestURL.');
	});

	test('createManifestFetchInit defaults the Data Cache lifetime to 300 seconds', () => {
		expect(createManifestFetchInit().next).toEqual({ revalidate: 300 });
		expect(
			createManifestFetchInit({ manifestRevalidateSeconds: false }).next
		).toEqual({ revalidate: false });
	});
});
