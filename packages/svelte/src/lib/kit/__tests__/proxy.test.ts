/**
 * `hosted({ url: '/api/c15t' })` saves with `POST /api/c15t/subjects`. The
 * route handlers answered `GET` only, so every save got `405` unless the app
 * wrote its own proxy. `proxy: true` forwards those writes to the backend.
 */
import { c15tVersionHeaders } from '@c15t/core';
import { clearManifestCache } from '@c15t/core/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createSvelteKitConsentRouteHandlers } from '../routes';
import { createEvent } from './event';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const ROUTE_ID = '/api/c15t/[...path]';
const BACKEND = 'https://consent.example.com';

interface Call {
	url: string;
	init: RequestInit & { headers: Headers };
}

/** A fetch that records calls and answers each with a fresh response. */
const upstream = function upstream(
	respond: (url: string) => Response = () =>
		Response.json({ ok: true }, { status: 200 })
) {
	const calls: Call[] = [];
	const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		calls.push({ init: init as Call['init'], url });
		return Promise.resolve(respond(url));
	}) as unknown as typeof globalThis.fetch;
	return { calls, fetch };
};

/** A request to `/api/c15t/<path>` as SvelteKit routes it. */
const consentEvent = function consentEvent(
	path: string,
	init: {
		method?: string;
		body?: string;
		search?: string;
		headers?: Record<string, string>;
		clientAddress?: string;
		origin?: string;
	} = {}
) {
	return createEvent({
		body: init.body,
		clientAddress: init.clientAddress,
		headers: init.headers,
		method: init.method,
		route: { id: ROUTE_ID, params: { path } },
		url: `${init.origin ?? 'https://shop.example'}/api/c15t/${path}${init.search ?? ''}`,
	});
};

describe('createSvelteKitConsentRouteHandlers proxy', () => {
	beforeEach(() => {
		clearManifestCache();
	});

	test('answers GET only when proxy is off', () => {
		const handlers = createSvelteKitConsentRouteHandlers({
			backendURL: BACKEND,
		});

		expect(Object.keys(handlers).sort()).toEqual(['GET', 'init', 'manifest']);
	});

	test('forwards a consent save to the backend and returns its answer', async () => {
		const { calls, fetch } = upstream(() =>
			Response.json({ id: 'sub_1' }, { status: 201 })
		);
		const { POST } = createSvelteKitConsentRouteHandlers({
			backendURL: BACKEND,
			fetch,
			proxy: true,
		});

		const response = await POST(
			consentEvent('subjects', {
				body: '{"type":"cookie_banner"}',
				headers: { 'content-type': 'application/json' },
				method: 'POST',
				search: '?debug=1',
			})
		);

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ id: 'sub_1' });
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe(`${BACKEND}/subjects?debug=1`);
		expect(calls[0]?.init.method).toBe('POST');
		expect(await new Response(calls[0]?.init.body as BodyInit).text()).toBe(
			'{"type":"cookie_banner"}'
		);
	});

	test('adds every write method and the bare proxy handler', () => {
		const handlers = createSvelteKitConsentRouteHandlers({
			backendURL: BACKEND,
			proxy: true,
		});

		expect(Object.keys(handlers).sort()).toEqual([
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

	test('forwards PATCH on a subject id', async () => {
		const { calls, fetch } = upstream();
		const { PATCH } = createSvelteKitConsentRouteHandlers({
			backendURL: `${BACKEND}/api/c15t/`,
			fetch,
			proxy: true,
		});

		await PATCH(
			consentEvent('subjects/sub_1', { body: '{}', method: 'PATCH' })
		);

		expect(calls[0]?.url).toBe(`${BACKEND}/api/c15t/subjects/sub_1`);
		expect(calls[0]?.init.method).toBe('PATCH');
	});

	test('keeps init and manifest in-process and forwards other GET paths', async () => {
		const { calls, fetch } = upstream((url) =>
			url.endsWith('/manifest')
				? Response.json(MANIFEST_FIXTURE)
				: Response.json({ status: 'ok' })
		);
		const { GET } = createSvelteKitConsentRouteHandlers({
			backendURL: BACKEND,
			fetch,
			proxy: true,
			reportSessions: false,
		});

		const init = await GET(consentEvent('init'));
		expect((await init.json()).policyResolution).toBeDefined();
		await GET(consentEvent('manifest'));
		expect(calls.map((call) => call.url)).toEqual([`${BACKEND}/manifest`]);

		const status = await GET(consentEvent('status'));
		expect(await status.json()).toEqual({ status: 'ok' });
		expect(calls.at(-1)?.url).toBe(`${BACKEND}/status`);
	});

	test('forwards a custom GET path that ends in manifest', async () => {
		const { calls, fetch } = upstream(() => Response.json({ rows: [] }));
		const { GET } = createSvelteKitConsentRouteHandlers({
			backendURL: BACKEND,
			fetch,
			proxy: { paths: ['reports/manifest'] },
		});

		const response = await GET(consentEvent('reports/manifest'));

		expect(await response.json()).toEqual({ rows: [] });
		expect(calls.map((call) => call.url)).toEqual([
			`${BACKEND}/reports/manifest`,
		]);
	});

	test.each([
		['an unlisted path', 'admin/users'],
		['an encoded dot segment', 'subjects/%2e%2e'],
		['a doubly encoded dot segment', 'subjects/%252e%252e'],
		['an encoded separator', 'subjects/a%2Fb'],
		['an empty path', ''],
	])('answers 404 for %s without calling the backend', async (_, path) => {
		const { calls, fetch } = upstream();
		const { POST } = createSvelteKitConsentRouteHandlers({
			backendURL: BACKEND,
			fetch,
			proxy: true,
		});

		const response = await POST(
			consentEvent(path, { body: '{}', method: 'POST' })
		);

		expect(response.status).toBe(404);
		expect(calls).toHaveLength(0);
	});

	test('allows extra paths from the options', async () => {
		const { calls, fetch } = upstream();
		const { POST } = createSvelteKitConsentRouteHandlers({
			backendURL: BACKEND,
			fetch,
			proxy: { paths: ['export/*'] },
		});

		await POST(consentEvent('export/sub_1', { body: '{}', method: 'POST' }));

		expect(calls[0]?.url).toBe(`${BACKEND}/export/sub_1`);
	});

	test('forwards the header allowlist and sets the forwarding headers itself', async () => {
		const { calls, fetch } = upstream();
		const { POST } = createSvelteKitConsentRouteHandlers({
			backendURL: BACKEND,
			fetch,
			proxy: true,
		});

		await POST(
			consentEvent('subjects', {
				body: '{}',
				clientAddress: '203.0.113.7',
				headers: {
					'accept-language': 'de-DE',
					authorization: 'Bearer secret',
					'content-type': 'application/json',
					cookie: 'session=abc; c15t=1',
					'sec-gpc': '1',
					'user-agent': 'Mozilla/5.0',
					'x-forwarded-for': '198.51.100.1',
					'x-forwarded-host': 'evil.example',
					'x-unknown': 'drop me',
				},
				method: 'POST',
			})
		);

		const headers = calls[0]?.init.headers;
		expect(headers?.get('user-agent')).toBe('Mozilla/5.0');
		expect(headers?.get('accept-language')).toBe('de-DE');
		expect(headers?.get('sec-gpc')).toBe('1');
		expect(headers?.get('content-type')).toBe('application/json');
		expect(headers?.get('authorization')).toBeNull();
		expect(headers?.get('cookie')).toBeNull();
		expect(headers?.get('x-unknown')).toBeNull();
		expect(headers?.get('x-forwarded-for')).toBe('203.0.113.7');
		expect(headers?.get('x-forwarded-host')).toBe('shop.example');
		expect(headers?.get('x-forwarded-proto')).toBe('https');
		expect(headers?.get('x-c15t-proxy')).toBe('@c15t/svelte');
		for (const [name, value] of Object.entries(c15tVersionHeaders)) {
			expect(headers?.get(name)).toBe(value);
		}
	});

	test('forwards only the named cookies, and never to a remote http backend', async () => {
		const secure = upstream();
		const { POST } = createSvelteKitConsentRouteHandlers({
			backendURL: BACKEND,
			fetch: secure.fetch,
			proxy: { cookieNames: ['tenant'] },
		});
		const withCookies = () =>
			consentEvent('subjects', {
				body: '{}',
				headers: { cookie: 'session=abc; tenant=acme' },
				method: 'POST',
			});

		const response = await POST(withCookies());
		expect(secure.calls[0]?.init.headers.get('cookie')).toBe('tenant=acme');
		// The response varied by a cookie, so no shared cache may keep it.
		expect(response.headers.get('cache-control')).toBe('private, no-store');

		const cleartext = upstream();
		const { POST: cleartextPOST } = createSvelteKitConsentRouteHandlers({
			backendURL: 'http://consent.example.com',
			fetch: cleartext.fetch,
			proxy: { cookieNames: ['tenant'] },
		});
		await cleartextPOST(withCookies());
		expect(cleartext.calls[0]?.init.headers.get('cookie')).toBeNull();
	});

	test('shapes the response headers for the browser', async () => {
		const { fetch } = upstream(() => {
			const headers = new Headers({
				'access-control-allow-origin': '*',
				'cache-control': 'no-store',
				connection: 'keep-alive',
				'content-type': 'application/json',
			});
			headers.append('set-cookie', 'a=1; Domain=consent.example.com; Path=/');
			return new Response('{}', { headers, status: 200 });
		});
		const { POST } = createSvelteKitConsentRouteHandlers({
			backendURL: BACKEND,
			fetch,
			proxy: true,
		});

		const response = await POST(
			consentEvent('subjects', { body: '{}', method: 'POST' })
		);

		expect(response.headers.get('content-type')).toBe('application/json');
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(response.headers.get('access-control-allow-origin')).toBeNull();
		expect(response.headers.get('connection')).toBeNull();
		expect(response.headers.get('set-cookie')).toBe('a=1; Path=/');
	});

	test('sends a relative backendURL through event.fetch whatever the Host', async () => {
		const configured = upstream();
		const inProcess = upstream();
		const { POST } = createSvelteKitConsentRouteHandlers({
			backendURL: '/api/self-host',
			fetch: configured.fetch,
			proxy: true,
		});

		// On adapter-node without ORIGIN, event.url carries the client's Host.
		const response = await POST(
			createEvent({
				body: '{}',
				fetch: inProcess.fetch,
				headers: { host: 'attacker.example' },
				method: 'POST',
				route: { id: ROUTE_ID, params: { path: 'subjects' } },
				url: 'http://attacker.example/api/c15t/subjects?x=1',
			})
		);

		expect(response.status).toBe(200);
		expect(configured.calls).toHaveLength(0);
		expect(inProcess.calls.map((call) => call.url)).toEqual([
			'/api/self-host/subjects?x=1',
		]);
	});

	test('reads the manifest of a relative backendURL through event.fetch', async () => {
		const configured = upstream();
		const inProcess = upstream(() => Response.json(MANIFEST_FIXTURE));
		const { GET } = createSvelteKitConsentRouteHandlers({
			backendURL: '/api/self-host',
			fetch: configured.fetch,
			proxy: true,
		});

		const response = await GET(
			createEvent({
				fetch: inProcess.fetch,
				headers: { host: 'attacker.example' },
				route: { id: ROUTE_ID, params: { path: 'manifest' } },
				url: 'http://attacker.example/api/c15t/manifest',
			})
		);

		expect(response.status).toBe(200);
		expect(configured.calls).toHaveLength(0);
		expect(inProcess.calls.map((call) => call.url)).toEqual([
			'/api/self-host/manifest',
		]);
	});

	test('refuses to proxy without a backend URL', async () => {
		const { POST } = createSvelteKitConsentRouteHandlers({
			manifestURL: 'https://cdn.example.com/manifest.json',
			proxy: true,
		});

		await expect(
			POST(consentEvent('subjects', { body: '{}', method: 'POST' }))
		).rejects.toThrow(/backendURL/u);
	});
});
