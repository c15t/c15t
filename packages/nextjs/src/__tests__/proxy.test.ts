/**
 * `c15tProxy` forwards normalized consent headers and stores nothing about a
 * visitor who has not chosen yet: no `c15t-sid` cookie, and the render reads
 * the request's own cookies.
 */
import { NextRequest } from 'next/server.js';
import { describe, expect, test } from 'vitest';

import { c15tProxy } from '../proxy';

const request = (headers: Record<string, string> = {}) =>
	new NextRequest('https://app.example.com/pricing', { headers });

/** The `cookie` header Next.js hands the render after the proxy. */
const renderedCookie = (response: Response): string | null =>
	response.headers.get('x-middleware-request-cookie');

describe('c15tProxy', () => {
	test('a first visit gets no cookie, and the geo headers still go through', () => {
		const response = c15tProxy(
			request({ 'cf-ipcountry': 'DE', cookie: 'theme=dark', 'sec-gpc': '1' })
		);
		expect(response.headers.get('set-cookie')).toBeNull();
		expect(response.cookies.get('c15t-sid')).toBeUndefined();
		expect(renderedCookie(response)).toBe('theme=dark');
		expect(response.headers.get('x-middleware-request-x-c15t-country')).toBe(
			'DE'
		);
		expect(response.headers.get('x-middleware-request-sec-gpc')).toBe('1');
	});

	test('the deprecated subject options set no cookie', () => {
		const response = c15tProxy(request(), {
			storage: { crossSubdomain: true, storageKey: 'consent' },
			subjectCookie: true,
			trustForwardedHeaders: true,
		});
		expect(response.headers.get('set-cookie')).toBeNull();
	});

	test('cookie: true still sets the geo cookies', () => {
		const response = c15tProxy(request({ 'cf-ipcountry': 'DE' }), {
			cookie: true,
		});
		expect(response.cookies.get('c15t-country')?.value).toBe('DE');
		expect(response.cookies.get('c15t-sid')).toBeUndefined();
	});
});
