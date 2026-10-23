/**
 * `c15tProxy` gives a new visitor a subject ID: the response sets the
 * `c15t-sid` cookie, and the render in the same request reads it from the
 * rewritten `cookie` request header.
 */
import { clearManifestCache } from '@c15t/core/server';
import { NextRequest } from 'next/server.js';
import { describe, expect, test, vi } from 'vitest';

import { createConsentRoute } from '../api';
import { c15tProxy } from '../proxy';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const request = (headers: Record<string, string> = {}) =>
	new NextRequest('https://app.example.com/pricing', { headers });

/** The `cookie` header Next.js hands the render after the proxy. */
const renderedCookie = (response: Response): string | null =>
	response.headers.get('x-middleware-request-cookie');

describe('c15tProxy subject ID', () => {
	test('a first visit gets a c15t-sid cookie, and the render reads the same ID', () => {
		const response = c15tProxy(request({ cookie: 'theme=dark' }));
		const cookie = response.cookies.get('c15t-sid');
		expect(cookie?.value).toMatch(/^sub_/u);
		expect(cookie).toMatchObject({
			httpOnly: false,
			maxAge: 365 * 86_400,
			path: '/',
			sameSite: 'lax',
			secure: true,
		});
		expect(renderedCookie(response)).toBe(
			`theme=dark; c15t-sid=${cookie?.value}`
		);
	});

	test('a returning visitor keeps their ID and gets no new cookie', () => {
		const first = c15tProxy(request()).cookies.get('c15t-sid')?.value;
		const response = c15tProxy(request({ cookie: `c15t-sid=${first}` }));
		expect(response.cookies.get('c15t-sid')).toBeUndefined();
		expect(renderedCookie(response)).toBe(`c15t-sid=${first}`);
	});

	// Next.js strips `next-router-prefetch` before any proxy runs, so only
	// prefetches the browser marks reach here with a mark.
	test.each([{ 'sec-purpose': 'prefetch' }, { purpose: 'prefetch' }])(
		'a prefetch gets no subject: %o',
		(headers) => {
			const response = c15tProxy(request(headers));
			expect(response.cookies.get('c15t-sid')).toBeUndefined();
		}
	);

	test('subjectCookie: false sets no cookie', () => {
		const response = c15tProxy(request(), { subjectCookie: false });
		expect(response.cookies.get('c15t-sid')).toBeUndefined();
		expect(renderedCookie(response)).toBeNull();
	});

	test('the storage configuration names the cookie and sets its domain', () => {
		const response = c15tProxy(request(), {
			storage: { crossSubdomain: true, storageKey: 'consent' },
		});
		expect(response.cookies.get('consent-sid')?.domain).toBe('.example.com');
	});
});

// The consent route never renders a page, and its manifest is public data a
// shared cache keeps: a subject cookie on it would reach every visitor the
// cache serves it to.
describe('c15tProxy on the consent route', () => {
	test('the public manifest gets no subject cookie, and the geo headers still go through', async () => {
		clearManifestCache();
		const url = 'https://app.example.com/api/c15t/manifest';
		const proxied = c15tProxy(
			new NextRequest(url, { headers: { 'cf-ipcountry': 'DE' } })
		);
		expect(proxied.cookies.get('c15t-sid')).toBeUndefined();
		expect(proxied.headers.get('set-cookie')).toBeNull();
		expect(proxied.headers.get('x-middleware-request-x-c15t-country')).toBe(
			'DE'
		);

		const { GET } = createConsentRoute({
			backendURL: 'https://consent.example.com',
			fetch: vi.fn<typeof globalThis.fetch>().mockResolvedValue(
				Response.json(MANIFEST_FIXTURE, {
					headers: { 'cache-control': 'public, s-maxage=120' },
				})
			),
			reportSessions: false,
		});
		const served = await GET(new Request(url), {
			params: Promise.resolve({}),
		});
		expect(served.headers.get('cache-control')).toBe('public, s-maxage=120');
	});

	// The proxy cannot see the response, so the caller marks routes whose
	// response a shared cache keeps, as in the geography-headers docs: each
	// route and the paths below it.
	const SHARED_ROUTES = ['/api/feed', '/blog'];
	const isShared = (pathname: string) =>
		SHARED_ROUTES.some(
			(route) => pathname === route || pathname.startsWith(`${route}/`)
		);

	const proxyFor = (path: string) => {
		const page = new NextRequest(`https://app.example.com${path}`, {
			headers: { 'cf-ipcountry': 'DE', 'sec-gpc': '1' },
		});
		return c15tProxy(page, {
			subjectCookie: !isShared(page.nextUrl.pathname),
		});
	};

	test.each(['/api/feed', '/api/feed/rss', '/blog', '/blog/first-post'])(
		'the documented shared-route call sets no cookie on %s and forwards the geo headers',
		(path) => {
			const response = proxyFor(path);
			expect(response.headers.get('set-cookie')).toBeNull();
			expect(response.headers.get('x-middleware-request-x-c15t-country')).toBe(
				'DE'
			);
			expect(response.headers.get('x-middleware-request-sec-gpc')).toBe('1');
		}
	);

	test.each(['/api/feedback', '/blogger'])(
		'the documented shared-route call still gives %s an ID the render reads',
		(path) => {
			const response = proxyFor(path);
			const id = response.cookies.get('c15t-sid')?.value;
			expect(id).toMatch(/^sub_/u);
			expect(renderedCookie(response)).toBe(`c15t-sid=${id}`);
			expect(response.headers.get('x-middleware-request-x-c15t-country')).toBe(
				'DE'
			);
			expect(response.headers.get('x-middleware-request-sec-gpc')).toBe('1');
		}
	);

	test('a page whose path only starts like the route still gets one', () => {
		const response = c15tProxy(
			new NextRequest('https://app.example.com/api/c15t-docs')
		);
		expect(response.cookies.get('c15t-sid')?.value).toMatch(/^sub_/u);
	});

	// withConsentManifest inlines the routePrefix c15t.config.ts names.
	test('a route mounted at the configured routePrefix gets no subject cookie, and still gets the geo headers', () => {
		vi.stubEnv('C15T_CONSENT_ROUTE_PREFIX', '/api/consent');
		try {
			const routed = c15tProxy(
				new NextRequest('https://app.example.com/api/consent/manifest', {
					headers: { 'cf-ipcountry': 'DE' },
				})
			);
			expect(routed.cookies.get('c15t-sid')).toBeUndefined();
			expect(routed.headers.get('x-middleware-request-x-c15t-country')).toBe(
				'DE'
			);
			for (const path of ['/api/consent-docs', '/api/c15t/page']) {
				const page = c15tProxy(
					new NextRequest(`https://app.example.com${path}`)
				);
				expect(page.cookies.get('c15t-sid')?.value).toMatch(/^sub_/u);
			}
		} finally {
			vi.unstubAllEnvs();
		}
	});
});
