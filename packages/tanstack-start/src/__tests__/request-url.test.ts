import { describe, expect, test } from 'vitest';

import { isSelfRoute, resolveRequestURL } from '../libs/request-url';

describe('resolveRequestURL', () => {
	test('resolves a relative backend URL with the request protocol', () => {
		// A plain-HTTP dev server has no `x-forwarded-proto`. Defaulting to
		// https here made every same-origin manifest fetch fail with a TLS
		// handshake error under `vite dev`.
		expect(
			resolveRequestURL('/api/self-host', new Request('http://localhost:3010/'))
		).toBe('http://localhost:3010/api/self-host');
	});

	test('lets a forwarded protocol win over the request URL', () => {
		expect(
			resolveRequestURL(
				'/api/self-host',
				new Request('http://app.internal/', {
					headers: { 'x-forwarded-proto': 'https' },
				})
			)
		).toBe('https://app.internal/api/self-host');
	});

	test('lets a forwarded host win over the request URL', () => {
		expect(
			resolveRequestURL(
				'/api/self-host',
				new Request('http://127.0.0.1:3010/', {
					headers: {
						'x-forwarded-host': 'app.example.com',
						'x-forwarded-proto': 'https',
					},
				})
			)
		).toBe('https://app.example.com/api/self-host');
	});

	test('returns absolute URLs untouched', () => {
		expect(
			resolveRequestURL(
				'https://consent.example.com/',
				new Request('http://localhost:3010/')
			)
		).toBe('https://consent.example.com');
	});
});

describe('isSelfRoute', () => {
	test('detects the app’s own consent route', () => {
		const request = new Request('http://localhost:3010/');
		expect(
			isSelfRoute(
				'http://localhost:3010/api/c15t/manifest',
				request,
				'/api/c15t'
			)
		).toBe(true);
		expect(
			isSelfRoute(
				'http://localhost:3010/api/self-host/manifest',
				request,
				'/api/c15t'
			)
		).toBe(false);
	});
});
