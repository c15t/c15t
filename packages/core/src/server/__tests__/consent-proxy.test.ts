import { describe, expect, test, vi } from 'vitest';

import { c15tVersionHeaders } from '../../transports/version-header';
import {
	forwardConsentRequest,
	isConsentProxyPathAllowed,
	resolveConsentProxyOptions,
	rewriteProxySetCookie,
	stripIdentityForCleartext,
} from '../consent-proxy';
import type { ConsentProxyOptions } from '../consent-proxy';

const BACKEND = 'https://consent.example.com';
const FORWARDING = { host: 'shop.example', proto: 'https' };

interface Call {
	url: string;
	init: RequestInit & { headers: Headers };
}

const upstream = function upstream(
	respond: () => Response = () => Response.json({ ok: true })
) {
	const calls: Call[] = [];
	const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
		calls.push({ init: init as Call['init'], url: String(input) });
		return Promise.resolve(respond());
	}) as unknown as typeof globalThis.fetch;
	return { calls, fetch };
};

const forward = function forward(
	path: string,
	init: {
		method?: string;
		body?: string;
		headers?: Record<string, string>;
		proxy?: true | ConsentProxyOptions;
		backendURL?: string;
		forwarding?: { for?: string; host: string; proto: string };
		respond?: () => Response;
	} = {}
) {
	const { calls, fetch } = upstream(init.respond);
	const options = resolveConsentProxyOptions(init.proxy ?? true);
	if (!options) {
		throw new Error('proxy options did not resolve');
	}
	const response = forwardConsentRequest({
		adapter: '@c15t/test-adapter',
		backendURL: init.backendURL ?? BACKEND,
		fetch,
		forwarding: init.forwarding ?? FORWARDING,
		options,
		path,
		request: new Request(`https://shop.example/api/c15t/${path}?q=1`, {
			body: init.body,
			headers: init.headers,
			method: init.method ?? 'GET',
		}),
	});
	return { calls, response };
};

describe('resolveConsentProxyOptions', () => {
	test('is off for false and undefined', () => {
		expect(resolveConsentProxyOptions(false)).toBeUndefined();
		expect(resolveConsentProxyOptions(undefined)).toBeUndefined();
	});

	test('adds extras to the defaults and lowercases header names', () => {
		const options = resolveConsentProxyOptions({
			forwardHeaders: ['X-Tenant'],
			paths: ['export'],
			timeoutMs: 500,
		});
		expect(options?.paths).toEqual(
			expect.arrayContaining(['subjects/*', 'export'])
		);
		expect(options?.forwardHeaders).toContain('x-tenant');
		expect(options?.forwardHeaders).toContain('user-agent');
		expect(options?.timeoutMs).toBe(500);
	});
});

describe('isConsentProxyPathAllowed', () => {
	const allowed = ['subjects', 'subjects/*'];

	test.each([
		['subjects', true],
		['/subjects/sub_1/', true],
		['subjects/sub_1/extra', false],
		['admin', false],
		['', false],
		['subjects/%2e%2e', false],
		['subjects/%252e%252e', false],
		['subjects/a%2Fb', false],
		['subjects/a%5Cb', false],
	])('%s -> %s', (path, expected) => {
		expect(isConsentProxyPathAllowed(path, allowed)).toBe(expected);
	});
});

describe('forwardConsentRequest', () => {
	test('forwards method, path, query and body, and names the adapter', async () => {
		const { calls, response } = forward('subjects', {
			body: '{"a":1}',
			headers: { 'content-type': 'application/json' },
			method: 'POST',
			respond: () => Response.json({ id: 'sub_1' }, { status: 201 }),
		});

		const answer = await response;
		expect(answer.status).toBe(201);
		expect(await answer.json()).toEqual({ id: 'sub_1' });
		expect(calls[0]?.url).toBe(`${BACKEND}/subjects?q=1`);
		expect(calls[0]?.init.method).toBe('POST');
		expect(calls[0]?.init.redirect).toBe('manual');
		expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
		expect(await new Response(calls[0]?.init.body as BodyInit).text()).toBe(
			'{"a":1}'
		);
		expect(calls[0]?.init.headers.get('x-c15t-proxy')).toBe(
			'@c15t/test-adapter'
		);
		for (const [name, value] of Object.entries(c15tVersionHeaders)) {
			expect(calls[0]?.init.headers.get(name)).toBe(value);
		}
	});

	test('answers 404 for a disallowed path without calling upstream', async () => {
		const { calls, response } = forward('subjects/%2e%2e', { method: 'POST' });

		expect((await response).status).toBe(404);
		expect(calls).toHaveLength(0);
	});

	test('takes the hop chain from the adapter, never from the browser', async () => {
		const { calls, response } = forward('subjects', {
			forwarding: { for: '203.0.113.7', host: 'shop.example', proto: 'https' },
			headers: {
				forwarded: 'for=198.51.100.1',
				'x-forwarded-for': '198.51.100.1',
				'x-forwarded-host': 'evil.example',
			},
			proxy: { forwardHeaders: ['x-forwarded-host', 'forwarded'] },
		});
		await response;

		const headers = calls[0]?.init.headers;
		expect(headers?.get('x-forwarded-for')).toBe('203.0.113.7');
		expect(headers?.get('x-forwarded-host')).toBe('shop.example');
		expect(headers?.get('x-forwarded-proto')).toBe('https');
		expect(headers?.get('forwarded')).toBeNull();
	});

	test('forwards the allowlist and drops everything else', async () => {
		const { calls, response } = forward('subjects', {
			headers: {
				authorization: 'Bearer secret',
				cookie: 'session=abc',
				'user-agent': 'Mozilla/5.0',
				'x-unknown': '1',
			},
		});
		const answer = await response;

		const headers = calls[0]?.init.headers;
		expect(headers?.get('user-agent')).toBe('Mozilla/5.0');
		expect(headers?.get('authorization')).toBeNull();
		expect(headers?.get('cookie')).toBeNull();
		expect(headers?.get('x-unknown')).toBeNull();
		expect(headers?.get('x-forwarded-for')).toBeNull();
		// Nothing identity-bearing went up, so the upstream cache policy stands.
		expect(answer.headers.get('cache-control')).toBeNull();
	});

	test('scopes cookies to cookieNames and marks the response no-store', async () => {
		const { calls, response } = forward('subjects', {
			headers: { cookie: 'session=abc; tenant=acme' },
			proxy: { cookieNames: ['tenant'] },
			respond: () =>
				new Response('{}', {
					headers: { 'cache-control': 'public, max-age=60', etag: '"a"' },
				}),
		});
		const answer = await response;

		expect(calls[0]?.init.headers.get('cookie')).toBe('tenant=acme');
		expect(answer.headers.get('cache-control')).toBe('private, no-store');
		expect(answer.headers.get('etag')).toBeNull();
	});

	test('sends only public headers to a remote http backend', async () => {
		const { calls, response } = forward('subjects', {
			backendURL: 'http://consent.example.com',
			headers: {
				cookie: 'tenant=acme',
				'user-agent': 'Mozilla/5.0',
				'x-api-key': 'secret',
			},
			proxy: { cookieNames: ['tenant'], forwardHeaders: ['x-api-key'] },
		});
		await response;

		const headers = calls[0]?.init.headers;
		expect(headers?.get('user-agent')).toBe('Mozilla/5.0');
		expect(headers?.get('cookie')).toBeNull();
		expect(headers?.get('x-api-key')).toBeNull();
	});

	test('does not send the client IP to a remote http backend', async () => {
		const forwarding = {
			for: '203.0.113.9',
			host: 'shop.example',
			proto: 'https',
		};
		const remote = forward('subjects', {
			backendURL: 'http://consent.example.com',
			forwarding,
		});
		const loopback = forward('subjects', {
			backendURL: 'http://localhost:8787',
			forwarding,
		});
		await Promise.all([remote.response, loopback.response]);

		expect(remote.calls[0]?.init.headers.get('x-forwarded-for')).toBeNull();
		expect(remote.calls[0]?.init.headers.get('x-forwarded-host')).toBe(
			'shop.example'
		);
		expect(loopback.calls[0]?.init.headers.get('x-forwarded-for')).toBe(
			'203.0.113.9'
		);
	});

	test('still sends named cookies to a loopback http backend', async () => {
		const { calls, response } = forward('subjects', {
			backendURL: 'http://localhost:8787',
			headers: { cookie: 'tenant=acme' },
			proxy: { cookieNames: ['tenant'] },
		});
		await response;

		expect(calls[0]?.init.headers.get('cookie')).toBe('tenant=acme');
	});

	test('shapes the response headers for the browser', async () => {
		const { response } = forward('subjects', {
			respond: () => {
				const headers = new Headers({
					'access-control-allow-origin': '*',
					connection: 'keep-alive',
					'content-type': 'application/json',
					'proxy-authenticate': 'Basic',
				});
				headers.append('set-cookie', 'a=1; Domain=consent.example.com; Path=/');
				headers.append('set-cookie', 'b=2; Path=/');
				return new Response('{}', { headers });
			},
		});
		const answer = await response;

		expect(answer.headers.get('content-type')).toBe('application/json');
		expect(answer.headers.get('access-control-allow-origin')).toBeNull();
		expect(answer.headers.get('connection')).toBeNull();
		expect(answer.headers.get('proxy-authenticate')).toBeNull();
		expect(answer.headers.getSetCookie()).toEqual([
			'a=1; Path=/',
			'b=2; Path=/',
		]);
	});
});

describe('rewriteProxySetCookie', () => {
	test('drops only the Domain attribute', () => {
		expect(
			rewriteProxySetCookie('id=1; Domain=.example.com; Path=/; Secure')
		).toBe('id=1; Path=/; Secure');
	});
});

describe('stripIdentityForCleartext', () => {
	test('keeps only public headers for a remote http target', () => {
		expect(
			stripIdentityForCleartext(
				{ cookie: 'a=1', 'user-agent': 'UA', 'x-api-key': 'k' },
				'http://consent.example.com/manifest'
			)
		).toEqual({ 'user-agent': 'UA' });
	});

	test('leaves https and loopback targets alone', () => {
		const headers = { cookie: 'a=1' };
		expect(stripIdentityForCleartext(headers, `${BACKEND}/manifest`)).toBe(
			headers
		);
		expect(
			stripIdentityForCleartext(headers, 'http://127.0.0.1:8787/manifest')
		).toBe(headers);
	});
});
