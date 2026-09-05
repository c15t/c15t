/**
 * Tests for the opt-in same-origin proxy behind `createConsentServerRoute`.
 *
 * Every test drives the route with a plain `Request` and a fetch spy that
 * stands in for the c15t backend, so what is asserted is exactly what the
 * upstream would receive and what the browser would get back.
 */
import { createManifestCache } from '@c15t/core/transports/manifest-cache';
import { describe, expect, test, vi } from 'vitest';

import { createConsentServerRoute } from '../api';
import type { ConsentProxyOptions } from '../api';
import { isProxyPathAllowed, rewriteSetCookie } from '../libs/proxy';
import { version } from '../version';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const BACKEND = 'https://consent.example.com';

type FetchSpy = ReturnType<typeof vi.fn> & typeof globalThis.fetch;

const createUpstream = function createUpstream(
	respond: (input: string, init?: RequestInit) => Response = () =>
		Response.json({ ok: true })
) {
	return vi.fn().mockImplementation((input: string, init?: RequestInit) => {
		const url = new URL(input);
		if (url.pathname.endsWith('/manifest')) {
			return Promise.resolve(
				new Response(JSON.stringify(MANIFEST_FIXTURE), {
					headers: { etag: '"manifest-revision"' },
					status: 200,
				})
			);
		}
		return Promise.resolve(respond(input, init));
	}) as FetchSpy;
};

const createRoute = function createRoute(
	fetch: FetchSpy,
	proxy: true | ConsentProxyOptions = true
) {
	return createConsentServerRoute({
		backendURL: BACKEND,
		cache: createManifestCache(),
		fetch,
		proxy,
	});
};

const request = function request(
	path: string,
	init: RequestInit & { headers?: Record<string, string> } = {}
) {
	return new Request(`https://app.example.com/api/c15t/${path}`, init);
};

const upstreamCall = function upstreamCall(fetch: FetchSpy, index = 0) {
	const call = fetch.mock.calls[index] as [string, RequestInit] | undefined;
	if (!call) {
		throw new Error(`fetch was not called ${index + 1} time(s)`);
	}
	return { headers: new Headers(call[1].headers), init: call[1], url: call[0] };
};

describe('proxy off (default)', () => {
	test('returns exactly the in-process handler set', () => {
		const handlers = createConsentServerRoute({
			backendURL: BACKEND,
			cache: createManifestCache(),
		});
		expect(Object.keys(handlers).sort()).toEqual([
			'GET',
			'initGET',
			'manifestGET',
		]);
	});

	test('GET on a subjects path stays 404 and never reaches upstream', async () => {
		const fetch = createUpstream();
		const { GET } = createConsentServerRoute({
			backendURL: BACKEND,
			cache: createManifestCache(),
			fetch,
			proxy: false,
		});
		const response = await GET({
			params: { _splat: 'subjects' },
			request: request('subjects'),
		});
		expect(response.status).toBe(404);
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe('proxy on: handler set and local paths', () => {
	test('adds the write methods and the bare proxy handler', () => {
		const handlers = createRoute(createUpstream());
		expect(Object.keys(handlers).sort()).toEqual([
			'DELETE',
			'GET',
			'OPTIONS',
			'PATCH',
			'POST',
			'PUT',
			'initGET',
			'manifestGET',
			'proxyHandler',
		]);
		expect(handlers.POST).toBe(handlers.proxyHandler);
	});

	test('manifest and init still resolve in-process', async () => {
		const fetch = createUpstream(
			() => new Response('upstream', { status: 500 })
		);
		const { GET } = createRoute(fetch);

		const manifest = await GET({
			params: { _splat: 'manifest' },
			request: request('manifest'),
		});
		expect(manifest.status).toBe(200);
		expect(await manifest.json()).toEqual(MANIFEST_FIXTURE);

		const init = await GET({
			params: { _splat: 'init' },
			request: request('init', { headers: { 'x-vercel-ip-country': 'DE' } }),
		});
		expect(init.status).toBe(200);
		expect((await init.json()).location.countryCode).toBe('DE');

		// One manifest fetch, cached for init; nothing else went upstream.
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(upstreamCall(fetch).url).toBe(`${BACKEND}/manifest`);
	});
});

describe('proxy on: path allowlist', () => {
	test.each([
		['subjects', true],
		['subjects/sub_123', true],
		['health', true],
		['status', true],
		['init', true],
		['manifest', true],
		['subjects/sub_1/history', false],
		['admin', false],
		['../manifest', false],
		['', false],
	])('%s → %s', (path, allowed) => {
		expect(
			isProxyPathAllowed(path, [
				'subjects',
				'subjects/*',
				'init',
				'manifest',
				'health',
				'status',
			])
		).toBe(allowed);
	});

	test('denies unknown paths with 404 without calling upstream', async () => {
		const fetch = createUpstream();
		const { GET, POST } = createRoute(fetch);

		const get = await GET({
			params: { _splat: 'anything-else' },
			request: request('anything-else'),
		});
		const post = await POST({
			params: { _splat: 'subjects/sub_1/extra' },
			request: request('subjects/sub_1/extra', { method: 'POST' }),
		});

		expect(get.status).toBe(404);
		expect(post.status).toBe(404);
		expect(fetch).not.toHaveBeenCalled();
	});

	test('extra paths accept exact segments and a trailing wildcard', async () => {
		const fetch = createUpstream();
		const { GET } = createRoute(fetch, { paths: ['export', 'reports/*'] });

		expect(
			(
				await GET({
					params: { _splat: 'export' },
					request: request('export'),
				})
			).status
		).toBe(200);
		expect(
			(
				await GET({
					params: { _splat: 'reports/2026' },
					request: request('reports/2026'),
				})
			).status
		).toBe(200);
		expect(
			(
				await GET({
					params: { _splat: 'reports/2026/q1' },
					request: request('reports/2026/q1'),
				})
			).status
		).toBe(404);
		expect(fetch).toHaveBeenCalledTimes(2);
	});
});

describe('proxy on: request forwarding', () => {
	test('forwards the method, path, query, and body', async () => {
		const fetch = createUpstream();
		const { POST, PATCH, OPTIONS } = createRoute(fetch);
		const body = JSON.stringify({ decision: 'accept' });

		await POST({
			params: { _splat: 'subjects' },
			request: request('subjects?language=de', {
				body,
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
		});
		const post = upstreamCall(fetch);
		expect(post.url).toBe(`${BACKEND}/subjects?language=de`);
		expect(post.init.method).toBe('POST');
		expect(post.init.redirect).toBe('manual');
		expect((post.init as { duplex?: string }).duplex).toBe('half');
		expect(post.headers.get('content-type')).toBe('application/json');
		const forwardedBody = post.init.body as ReadableStream<Uint8Array>;
		expect(await new Response(forwardedBody).text()).toBe(body);

		await PATCH({
			params: { _splat: 'subjects/sub_1' },
			request: request('subjects/sub_1', { body: '{}', method: 'PATCH' }),
		});
		expect(upstreamCall(fetch, 1).url).toBe(`${BACKEND}/subjects/sub_1`);
		expect(upstreamCall(fetch, 1).init.method).toBe('PATCH');

		await OPTIONS({
			params: { _splat: 'subjects' },
			request: request('subjects', { method: 'OPTIONS' }),
		});
		expect(upstreamCall(fetch, 2).init.method).toBe('OPTIONS');
		expect(upstreamCall(fetch, 2).init.body).toBeUndefined();
	});

	test('forwards only the header allowlist plus the proxy additions', async () => {
		const fetch = createUpstream();
		const { POST } = createRoute(fetch, { forwardHeaders: ['X-Tenant'] });

		await POST({
			params: { _splat: 'subjects' },
			request: request('subjects', {
				body: '{}',
				headers: {
					'accept-language': 'de-DE',
					authorization: 'Bearer secret',
					'cf-ipcountry': 'DE',
					cookie: 'c15t=abc',
					host: 'app.example.com',
					origin: 'https://app.example.com',
					referer: 'https://app.example.com/pricing',
					'sec-gpc': '1',
					'user-agent': 'Mozilla/5.0 (Test)',
					'x-forwarded-for': '203.0.113.7, 10.0.0.1',
					'x-forwarded-proto': 'https',
					'x-tenant': 'acme',
					'x-vercel-ip-country': 'DE',
				},
				method: 'POST',
			}),
		});

		const { headers } = upstreamCall(fetch);
		expect(headers.get('accept-language')).toBe('de-DE');
		expect(headers.get('cookie')).toBe('c15t=abc');
		expect(headers.get('origin')).toBe('https://app.example.com');
		expect(headers.get('referer')).toBe('https://app.example.com/pricing');
		expect(headers.get('sec-gpc')).toBe('1');
		expect(headers.get('user-agent')).toBe('Mozilla/5.0 (Test)');
		expect(headers.get('cf-ipcountry')).toBe('DE');
		expect(headers.get('x-vercel-ip-country')).toBe('DE');
		expect(headers.get('x-tenant')).toBe('acme');

		expect(headers.get('authorization')).toBeNull();
		expect(headers.get('host')).toBeNull();

		expect(headers.get('x-forwarded-for')).toBe('203.0.113.7, 10.0.0.1');
		expect(headers.get('x-forwarded-host')).toBe('app.example.com');
		expect(headers.get('x-forwarded-proto')).toBe('https');
		expect(headers.get('x-c15t-version')).toBe(version);
		expect(headers.get('x-c15t-proxy')).toBe('@c15t/tanstack-start');
	});

	test('appends the resolved client IP to x-forwarded-for', async () => {
		const fetch = createUpstream();
		const { POST } = createRoute(fetch);

		await POST({
			params: { _splat: 'subjects' },
			request: request('subjects', {
				body: '{}',
				headers: {
					'x-client-ip': '198.51.100.9',
					'x-forwarded-for': '10.0.0.1',
				},
				method: 'POST',
			}),
		});
		expect(upstreamCall(fetch).headers.get('x-forwarded-for')).toBe(
			'10.0.0.1, 198.51.100.9'
		);

		await POST({
			params: { _splat: 'subjects' },
			request: request('subjects', {
				body: '{}',
				headers: { 'x-real-ip': '198.51.100.10' },
				method: 'POST',
			}),
		});
		expect(upstreamCall(fetch, 1).headers.get('x-forwarded-for')).toBe(
			'198.51.100.10'
		);

		await POST({
			params: { _splat: 'subjects' },
			request: request('subjects', { body: '{}', method: 'POST' }),
		});
		expect(upstreamCall(fetch, 2).headers.get('x-forwarded-for')).toBeNull();
		expect(upstreamCall(fetch, 2).headers.get('x-forwarded-host')).toBe(
			'app.example.com'
		);
		expect(upstreamCall(fetch, 2).headers.get('x-forwarded-proto')).toBe(
			'https'
		);
	});

	test('the bare proxyHandler applies the same rules', async () => {
		const fetch = createUpstream();
		const { proxyHandler } = createRoute(fetch);

		const denied = await proxyHandler({
			params: { _splat: 'nope' },
			request: request('nope'),
		});
		expect(denied.status).toBe(404);

		const allowed = await proxyHandler({
			params: { _splat: 'health' },
			request: request('health'),
		});
		expect(allowed.status).toBe(200);
		expect(upstreamCall(fetch).url).toBe(`${BACKEND}/health`);
		expect(upstreamCall(fetch).headers.get('x-c15t-proxy')).toBe(
			'@c15t/tanstack-start'
		);
	});
});

describe('proxy on: response shaping', () => {
	test('passes status and body through as a stream', async () => {
		const fetch = createUpstream(
			() =>
				new Response('{"code":"DOMAIN_ID_REQUIRED"}', {
					headers: { 'content-type': 'application/json' },
					status: 400,
					statusText: 'Bad Request',
				})
		);
		const { POST } = createRoute(fetch);

		const response = await POST({
			params: { _splat: 'subjects' },
			request: request('subjects', { body: '{}', method: 'POST' }),
		});

		expect(response.status).toBe(400);
		expect(response.statusText).toBe('Bad Request');
		expect(response.body).toBeInstanceOf(ReadableStream);
		expect(await response.json()).toEqual({ code: 'DOMAIN_ID_REQUIRED' });
	});

	test('strips hop-by-hop, encoding, and CORS headers, keeps caching ones', async () => {
		const fetch = createUpstream(
			() =>
				new Response('{}', {
					headers: {
						'access-control-allow-credentials': 'true',
						'access-control-allow-origin': 'https://app.example.com',
						'cache-control': 'private, no-store',
						connection: 'keep-alive',
						'content-encoding': 'br',
						'content-length': '2',
						'content-type': 'application/json',
						etag: '"abc"',
						'keep-alive': 'timeout=5',
						'proxy-authenticate': 'Basic',
						'transfer-encoding': 'chunked',
						upgrade: 'h2c',
						vary: 'accept-language',
						'x-c15t-policy': 'eu-opt-in',
					},
				})
		);
		const { GET } = createRoute(fetch);

		const response = await GET({
			params: { _splat: 'subjects/sub_1' },
			request: request('subjects/sub_1'),
		});
		const names = [...response.headers.keys()].sort();

		expect(names).toEqual([
			'cache-control',
			'content-type',
			'etag',
			'vary',
			'x-c15t-policy',
		]);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('x-c15t-policy')).toBe('eu-opt-in');
	});

	test('forwards every set-cookie without its Domain attribute', async () => {
		const fetch = createUpstream(() => {
			const headers = new Headers({ 'content-type': 'application/json' });
			headers.append(
				'set-cookie',
				'c15t=abc; Domain=consent.example.com; Path=/; Secure; SameSite=Lax'
			);
			headers.append(
				'set-cookie',
				'c15t_session=xyz; domain=.example.com; HttpOnly; Path=/'
			);
			headers.append('set-cookie', 'plain=1; Path=/');
			return new Response('{}', { headers });
		});
		const { POST } = createRoute(fetch);

		const response = await POST({
			params: { _splat: 'subjects' },
			request: request('subjects', { body: '{}', method: 'POST' }),
		});

		expect(response.headers.getSetCookie()).toEqual([
			'c15t=abc; Path=/; Secure; SameSite=Lax',
			'c15t_session=xyz; HttpOnly; Path=/',
			'plain=1; Path=/',
		]);
	});

	test('rewriteSetCookie only touches the Domain attribute', () => {
		expect(rewriteSetCookie('a=1; Domain=x.example; Path=/')).toBe(
			'a=1; Path=/'
		);
		expect(rewriteSetCookie('a=1; Path=/;  DOMAIN = x.example')).toBe(
			'a=1; Path=/'
		);
		expect(rewriteSetCookie('a=1; Path=/')).toBe('a=1; Path=/');
	});
});
