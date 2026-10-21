/**
 * `c15tProxy` gives a new visitor a subject ID: the response sets the
 * `c15t-sid` cookie, and the render in the same request reads it from the
 * rewritten `cookie` request header.
 */
import { NextRequest } from 'next/server.js';
import { describe, expect, test } from 'vitest';

import { c15tProxy } from '../proxy';

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

	test('the storage configuration names the cookie and sets its domain', () => {
		const response = c15tProxy(request(), {
			storage: { crossSubdomain: true, storageKey: 'consent' },
		});
		expect(response.cookies.get('consent-sid')?.domain).toBe('.example.com');
	});
});
