import { clearManifestCache } from '@c15t/core/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createSvelteKitConsentRouteHandlers } from '../routes';
import { createEvent } from './event';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const manifestResponse = function manifestResponse(
	headers: Record<string, string> = {}
): Response {
	return new Response(JSON.stringify(MANIFEST_FIXTURE), {
		headers: { 'content-type': 'application/json', ...headers },
		status: 200,
	});
};

describe('createSvelteKitConsentRouteHandlers', () => {
	beforeEach(() => {
		clearManifestCache();
	});

	describe('init route', () => {
		test('resolves the policy locally from the manifest', async () => {
			const fetchImpl = vi.fn(() => Promise.resolve(manifestResponse()));
			const { init } = createSvelteKitConsentRouteHandlers({
				backendURL: 'https://api.example.com',
				fetch: fetchImpl,
			});

			const response = await init(
				createEvent({ headers: { 'x-c15t-country': 'DE' } })
			);
			const payload = await response.json();

			expect(fetchImpl.mock.calls[0]?.[0]).toBe(
				'https://api.example.com/manifest'
			);
			expect(payload.policy.id).toBe('eu-opt-in');
			expect(payload.location).toEqual({ countryCode: 'DE', regionCode: null });
		});

		test('is never shared-cached — it varies per request', async () => {
			const { init } = createSvelteKitConsentRouteHandlers({
				backendURL: 'https://api.example.com',
				fetch: () => Promise.resolve(manifestResponse()),
			});

			const response = await init(createEvent());

			expect(response.headers.get('cache-control')).toBe('private, no-store');
		});

		test('echoes the resolved inputs so SSR does not drop GPC', async () => {
			const { init } = createSvelteKitConsentRouteHandlers({
				backendURL: 'https://api.example.com',
				fetch: () => Promise.resolve(manifestResponse()),
			});

			const response = await init(
				createEvent({
					headers: {
						'accept-language': 'de-DE,de;q=0.9',
						'sec-gpc': '1',
						'x-c15t-country': 'DE',
					},
				})
			);
			const payload = await response.json();

			expect(payload.resolvedOverrides).toEqual({
				country: 'DE',
				gpc: true,
				language: 'de',
			});
		});

		test('falls back to the default pack for an unmatched country', async () => {
			const { init } = createSvelteKitConsentRouteHandlers({
				backendURL: 'https://api.example.com',
				fetch: () => Promise.resolve(manifestResponse()),
			});

			const response = await init(
				createEvent({ headers: { 'x-c15t-country': 'JP' } })
			);
			const payload = await response.json();

			expect(payload.policy.id).toBe('notice-default');
		});

		test('resolves a relative backendURL against the request origin', async () => {
			const fetchImpl = vi.fn(() => Promise.resolve(manifestResponse()));
			const { init } = createSvelteKitConsentRouteHandlers({
				backendURL: '/api/self-host',
				fetch: fetchImpl,
			});

			await init(createEvent({ url: 'http://localhost:5173/api/c15t' }));

			// Keeps the request's own scheme — a plain-http dev server must not
			// have its backend URL upgraded to https.
			expect(fetchImpl.mock.calls[0]?.[0]).toBe(
				'http://localhost:5173/api/self-host/manifest'
			);
		});

		test('throws when no manifest source is configured', async () => {
			const { init } = createSvelteKitConsentRouteHandlers();

			await expect(init(createEvent())).rejects.toThrow(/backendURL/u);
		});
	});

	describe('manifest route', () => {
		test('forwards the backend cache headers verbatim', async () => {
			const { manifest } = createSvelteKitConsentRouteHandlers({
				fetch: () =>
					Promise.resolve(
						manifestResponse({
							'cache-control':
								'public, s-maxage=300, stale-while-revalidate=86400',
							etag: '"rev-1"',
						})
					),
				manifestURL: 'https://api.example.com/manifest',
			});

			const response = await manifest(createEvent());

			expect(response.headers.get('cache-control')).toBe(
				'public, s-maxage=300, stale-while-revalidate=86400'
			);
			expect(response.headers.get('etag')).toBe('"rev-1"');
			expect(await response.json()).toEqual(MANIFEST_FIXTURE);
		});

		test('answers a matching If-None-Match with 304 and no body', async () => {
			const { manifest } = createSvelteKitConsentRouteHandlers({
				fetch: () =>
					Promise.resolve(
						manifestResponse({
							'cache-control': 'public, s-maxage=300',
							etag: '"rev-1"',
						})
					),
				manifestURL: 'https://api.example.com/manifest',
			});

			const response = await manifest(
				createEvent({ headers: { 'if-none-match': '"rev-1"' } })
			);

			expect(response.status).toBe(304);
			expect(response.headers.get('etag')).toBe('"rev-1"');
			expect(await response.text()).toBe('');
		});

		test('forwards the language query to the backend', async () => {
			const fetchImpl = vi.fn(() => Promise.resolve(manifestResponse()));
			const { manifest } = createSvelteKitConsentRouteHandlers({
				fetch: fetchImpl,
				manifestURL: 'https://api.example.com/manifest',
			});

			await manifest(
				createEvent({
					url: 'http://localhost:5173/api/c15t/manifest?language=de',
				})
			);

			expect(fetchImpl.mock.calls[0]?.[0]).toBe(
				'https://api.example.com/manifest?language=de'
			);
		});

		test('serves a second request from the in-process cache', async () => {
			const fetchImpl = vi.fn(() =>
				Promise.resolve(
					manifestResponse({ 'cache-control': 'public, s-maxage=300' })
				)
			);
			const { manifest } = createSvelteKitConsentRouteHandlers({
				fetch: fetchImpl,
				manifestURL: 'https://api.example.com/manifest',
			});

			await manifest(createEvent());
			await manifest(createEvent());

			expect(fetchImpl).toHaveBeenCalledOnce();
		});

		test('surfaces a backend failure', async () => {
			const { manifest } = createSvelteKitConsentRouteHandlers({
				fetch: () => Promise.resolve(new Response('nope', { status: 503 })),
				manifestURL: 'https://api.example.com/manifest',
			});

			await expect(manifest(createEvent())).rejects.toThrow(/503/u);
		});
	});

	describe('GET dispatcher', () => {
		test('routes /manifest to the manifest handler', async () => {
			const { GET } = createSvelteKitConsentRouteHandlers({
				fetch: () => Promise.resolve(manifestResponse({ etag: '"rev-1"' })),
				manifestURL: 'https://api.example.com/manifest',
			});

			const response = await GET(
				createEvent({ url: 'http://localhost:5173/api/c15t/manifest' })
			);

			expect(response.headers.get('etag')).toBe('"rev-1"');
		});

		test('routes everything else to the init handler', async () => {
			const { GET } = createSvelteKitConsentRouteHandlers({
				fetch: () => Promise.resolve(manifestResponse()),
				manifestURL: 'https://api.example.com/manifest',
			});

			const response = await GET(
				createEvent({ url: 'http://localhost:5173/api/c15t' })
			);

			expect(response.headers.get('cache-control')).toBe('private, no-store');
		});
	});
});
