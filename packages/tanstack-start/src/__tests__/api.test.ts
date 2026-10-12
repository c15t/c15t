/**
 * Wiring of `@c15t/tanstack-start/api` onto the core consent route handler.
 * The route behaviour itself is pinned once, in
 * `packages/core/src/server/__tests__/consent-route.test.ts`.
 */
import { createManifestCache } from '@c15t/core/server';
import { describe, expect, test, vi } from 'vitest';

import { createConsentRoute } from '../api';
import { rememberConsentInputs } from '../libs/request-inputs';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const BACKEND = 'https://consent.example.com';

const upstream = () =>
	vi.fn<typeof globalThis.fetch>().mockImplementation((input) =>
		Promise.resolve(
			String(input).endsWith('/manifest')
				? Response.json(MANIFEST_FIXTURE, {
						headers: { 'cache-control': 'public, s-maxage=120' },
					})
				: Response.json({ ok: true }, { status: 201 })
		)
	);

const request = (path: string, init?: RequestInit) =>
	new Request(`https://app.example.com/api/c15t/${path}`, init);

describe('createConsentRoute', () => {
	test('serves the deployment snapshot without fetching an upstream manifest', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const { GET } = createConsentRoute({
			backendURL: BACKEND,
			fetch,
			reportSessions: false,
			snapshot: MANIFEST_FIXTURE,
		});
		expect(
			await (
				await GET({
					params: { _splat: 'manifest' },
					request: request('manifest'),
				})
			).json()
		).toEqual(MANIFEST_FIXTURE);
		expect(
			await (
				await GET({
					params: { _splat: 'init' },
					request: request('init', {
						headers: { 'x-vercel-ip-country': 'DE' },
					}),
				})
			).json()
		).toMatchObject({
			policyResolution: { policyId: 'eu-opt-in', status: 'matched' },
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	test('returns GET, and the write methods with proxy on', () => {
		const plain = createConsentRoute({ backendURL: BACKEND });
		expect(Object.keys(plain)).toEqual(['GET']);
		const proxied = createConsentRoute({
			backendURL: BACKEND,
			proxy: true,
		});
		expect(Object.keys(proxied).sort()).toEqual([
			'DELETE',
			'GET',
			'OPTIONS',
			'PATCH',
			'POST',
			'PUT',
		]);
	});

	test('GET dispatches on the router splat, or the path when there is none', async () => {
		const fetch = upstream();
		const { GET } = createConsentRoute({
			backendURL: BACKEND,
			cache: createManifestCache(),
			fetch,
			reportSessions: false,
		});
		const manifest = await GET({
			params: { _splat: 'manifest' },
			request: request('ignored'),
		});
		const init = await GET({ request: request('init') });
		const unknown = await GET({
			params: { _splat: 'subjects' },
			request: request('subjects'),
		});
		expect(manifest.headers.get('cache-control')).toBe('public, s-maxage=120');
		expect(init.headers.get('cache-control')).toBe('private, no-store');
		expect(unknown.status).toBe(404);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	test('init resolves with the inputs the request middleware remembered', async () => {
		const { GET } = createConsentRoute({
			backendURL: BACKEND,
			cache: createManifestCache(),
			fetch: upstream(),
			reportSessions: false,
		});
		const incoming = request('init', { headers: { 'x-c15t-country': 'US' } });
		rememberConsentInputs(incoming, { country: 'DE', language: 'de' });
		const body = await (await GET({ request: incoming })).json();
		expect(body).toMatchObject({
			location: { countryCode: 'DE' },
			policyResolution: { policyId: 'eu-opt-in' },
			translations: { language: 'de' },
		});
	});

	test('the proxy names the adapter and trusts forwarding only when told to', async () => {
		const fetch = upstream();
		const { POST } = createConsentRoute({
			backendURL: BACKEND,
			fetch,
			proxy: true,
			trustForwardedHeaders: true,
		});
		const response = await POST({
			params: { _splat: 'subjects' },
			request: request('subjects', {
				body: '{}',
				headers: { 'x-forwarded-host': 'public.example' },
				method: 'POST',
			}),
		});
		expect(response.status).toBe(201);
		const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
		expect(fetch.mock.calls[0]?.[0]).toBe(`${BACKEND}/subjects`);
		expect(headers.get('x-c15t-proxy')).toBe('@c15t/tanstack-start');
		expect(headers.get('x-forwarded-host')).toBe('public.example');
	});

	test('hands detached work to onBackgroundRevalidate', async () => {
		const registered: Promise<void>[] = [];
		const fetch = upstream();
		const { GET } = createConsentRoute({
			backendURL: BACKEND,
			cache: createManifestCache(),
			fetch,
			onBackgroundRevalidate: (task) => {
				registered.push(task);
			},
		});
		await GET({ request: request('init') });
		expect(registered).toHaveLength(1);
		await registered[0];
		expect(fetch).toHaveBeenLastCalledWith(
			`${BACKEND}/sessions`,
			expect.objectContaining({ method: 'POST' })
		);
	});
});
