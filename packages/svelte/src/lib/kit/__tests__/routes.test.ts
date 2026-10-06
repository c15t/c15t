/**
 * Wiring of `@c15t/svelte/kit` onto the core consent route handler. The
 * route behaviour itself is pinned once, in
 * `packages/core/src/server/__tests__/consent-route.test.ts`.
 */
import { clearManifestCache } from '@c15t/core/server';
import type { RequestEvent } from '@sveltejs/kit';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createSvelteKitConsentRouteHandlers } from '../routes';
import { createEvent } from './event';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const BACKEND = 'https://consent.example.com';
const ROUTE_ID = '/api/c15t/[...path]';

const upstream = () =>
	vi.fn<typeof globalThis.fetch>().mockImplementation((input) =>
		Promise.resolve(
			String(input).endsWith('/manifest')
				? Response.json(MANIFEST_FIXTURE, {
						headers: {
							'cache-control': 'public, s-maxage=1, stale-while-revalidate=600',
						},
					})
				: Response.json({ ok: true }, { status: 201 })
		)
	);

const restEvent = (
	path: string,
	init: Parameters<typeof createEvent>[0] = {}
): RequestEvent =>
	createEvent({
		...init,
		route: { id: ROUTE_ID, params: { path } },
		url: `https://shop.example/api/c15t/${path}`,
	});

beforeEach(() => {
	clearManifestCache();
});

describe('createSvelteKitConsentRouteHandlers', () => {
	test('returns GET, init and manifest, and the write methods with proxy on', () => {
		expect(
			Object.keys(
				createSvelteKitConsentRouteHandlers({ backendURL: BACKEND })
			).sort()
		).toEqual(['GET', 'init', 'manifest']);
		expect(
			Object.keys(
				createSvelteKitConsentRouteHandlers({
					backendURL: BACKEND,
					proxy: true,
				})
			).sort()
		).toEqual([
			'DELETE',
			'GET',
			'OPTIONS',
			'PATCH',
			'POST',
			'PUT',
			'init',
			'manifest',
			'proxy',
		]);
	});

	test('GET dispatches on the rest parameter, or the path of a fixed route', async () => {
		const fetch = upstream();
		const { GET } = createSvelteKitConsentRouteHandlers({
			backendURL: BACKEND,
			fetch,
			reportSessions: false,
		});
		const manifest = await GET(restEvent('manifest'));
		const root = await GET(restEvent(''));
		const fixed = await GET(
			createEvent({ url: 'https://shop.example/api/c15t/manifest' })
		);
		expect(manifest.headers.get('cache-control')).toContain('s-maxage=1');
		expect(root.headers.get('cache-control')).toBe('private, no-store');
		expect(fixed.headers.get('cache-control')).toContain('s-maxage=1');
	});

	test('fetches a relative backend in-process through event.fetch', async () => {
		const eventFetch = upstream();
		const { init } = createSvelteKitConsentRouteHandlers({
			backendURL: '/api/self-host',
			reportSessions: false,
		});
		await init(
			createEvent({
				fetch: eventFetch,
				headers: { host: 'evil.example' },
				url: 'https://shop.example/api/c15t/init',
			})
		);
		expect(eventFetch).toHaveBeenCalledWith(
			'/api/self-host/manifest',
			expect.anything()
		);
	});

	test('hands detached work to platform.context.waitUntil by default', async () => {
		vi.useFakeTimers();
		try {
			const fetch = upstream();
			const waitUntil = vi.fn();
			const { manifest } = createSvelteKitConsentRouteHandlers({
				backendURL: BACKEND,
				fetch,
			});
			const event = () =>
				Object.assign(restEvent('manifest'), {
					platform: { context: { waitUntil } },
				});
			await manifest(event());
			vi.advanceTimersByTime(1500);
			await manifest(event());
			expect(waitUntil).toHaveBeenCalledTimes(1);
			expect(waitUntil.mock.contexts[0]).toEqual({ waitUntil });
		} finally {
			vi.useRealTimers();
		}
	});

	test('the proxy vouches for the hop chain with event.getClientAddress()', async () => {
		const fetch = upstream();
		const { POST } = createSvelteKitConsentRouteHandlers({
			backendURL: BACKEND,
			fetch,
			proxy: true,
		});
		const response = await POST(
			restEvent('subjects', {
				body: '{}',
				clientAddress: '203.0.113.7',
				headers: { 'x-forwarded-for': '198.51.100.1' },
				method: 'POST',
			})
		);
		expect(response.status).toBe(201);
		const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
		expect(fetch.mock.calls[0]?.[0]).toBe(`${BACKEND}/subjects`);
		expect(headers.get('x-forwarded-for')).toBe('203.0.113.7');
		expect(headers.get('x-forwarded-host')).toBe('shop.example');
		expect(headers.get('x-c15t-proxy')).toBe('@c15t/svelte');
	});
});
