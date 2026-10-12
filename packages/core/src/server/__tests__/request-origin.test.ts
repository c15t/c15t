import { describe, expect, test } from 'vitest';

import {
	resolveRequestBackendURL,
	resolveRequestOrigin,
} from '../request-origin';

const FORGED = {
	forwarded: 'host=attacker.example;proto=https',
	'x-forwarded-host': 'attacker.example',
	'x-forwarded-proto': 'https',
};

describe('resolveRequestBackendURL', () => {
	test('returns absolute URLs normalized, whatever the request says', () => {
		expect(
			resolveRequestBackendURL('https://consent.example.com/', {
				headers: new Headers(FORGED),
			})
		).toBe('https://consent.example.com');
	});

	test('resolves a relative URL against the request URL', () => {
		expect(
			resolveRequestBackendURL('/api/c15t/', {
				requestURL: 'http://localhost:5173/some/page?x=1',
			})
		).toBe('http://localhost:5173/api/c15t');
	});

	test('ignores forged forwarding headers by default', () => {
		expect(
			resolveRequestBackendURL('/api/c15t', {
				headers: new Headers(FORGED),
				requestURL: 'https://app.example.com/',
			})
		).toBe('https://app.example.com/api/c15t');
		expect(
			resolveRequestBackendURL('/api/c15t', {
				headers: new Headers({ ...FORGED, host: 'app.example.com' }),
			})
		).toBe('https://app.example.com/api/c15t');
	});

	test('falls back to the host header, over https for domain names', () => {
		expect(
			resolveRequestBackendURL('/api/c15t', {
				headers: { host: 'localhost:3000' },
			})
		).toBe('http://localhost:3000/api/c15t');
		expect(
			resolveRequestBackendURL('/api/c15t', {
				headers: { host: '127.0.0.1:3000' },
			})
		).toBe('http://127.0.0.1:3000/api/c15t');
		expect(
			resolveRequestBackendURL('/api/c15t', {
				headers: { host: 'app:3000' },
			})
		).toBe('http://app:3000/api/c15t');
		expect(
			resolveRequestBackendURL('/api/c15t', {
				headers: { host: 'app.example.com' },
			})
		).toBe('https://app.example.com/api/c15t');
	});

	test('does not fall back to the referer', () => {
		expect(
			resolveRequestBackendURL('/api/c15t', {
				headers: new Headers({ referer: 'https://attacker.example/' }),
			})
		).toBeNull();
	});

	test('honours forwarding headers when the app trusts them', () => {
		expect(
			resolveRequestBackendURL('/api/c15t', {
				headers: new Headers({
					'x-forwarded-host': 'edge.example.com, internal:3000',
					'x-forwarded-proto': 'https',
				}),
				requestURL: 'http://127.0.0.1:3000/',
				trustForwardedHeaders: true,
			})
		).toBe('https://edge.example.com/api/c15t');
		expect(
			resolveRequestBackendURL('/api/c15t', {
				headers: new Headers({
					forwarded: 'for=1.2.3.4;host="edge.example.com";proto=https',
				}),
				requestURL: 'http://127.0.0.1:3000/',
				trustForwardedHeaders: true,
			})
		).toBe('https://edge.example.com/api/c15t');
	});

	test('honours a trusted forwarded scheme without a forwarded host', () => {
		const headers = { host: 'localhost:3000', 'x-forwarded-proto': 'https' };
		expect(resolveRequestBackendURL('/api/c15t', { headers })).toBe(
			'http://localhost:3000/api/c15t'
		);
		expect(
			resolveRequestBackendURL('/api/c15t', {
				headers,
				trustForwardedHeaders: true,
			})
		).toBe('https://localhost:3000/api/c15t');
		expect(
			resolveRequestBackendURL('/api/c15t', {
				headers: new Headers({ 'x-forwarded-ssl': 'on' }),
				requestURL: 'http://app.example.com/page',
				trustForwardedHeaders: true,
			})
		).toBe('https://app.example.com/api/c15t');
	});

	test('rejects a host header that is not a bare authority', () => {
		for (const host of [
			'attacker.example/x',
			'user@attacker.example',
			'a b',
			'x?y',
		]) {
			expect(
				resolveRequestBackendURL('/api/c15t', { headers: { host } })
			).toBeNull();
		}
	});

	test('keeps the result on the request origin', () => {
		const options = { requestURL: 'https://app.example.com/' };
		expect(
			resolveRequestBackendURL('//attacker.example/api', options)
		).toBeNull();
		expect(
			new URL(
				resolveRequestBackendURL('/\\attacker.example/api', options) ?? ''
			).origin
		).toBe('https://app.example.com');
		expect(resolveRequestBackendURL('api/c15t', options)).toBeNull();
		expect(resolveRequestBackendURL('ftp://x.example', options)).toBeNull();
	});
});

describe('resolveRequestOrigin', () => {
	test('returns null when the request carries no origin', () => {
		expect(resolveRequestOrigin({})).toBeNull();
		expect(resolveRequestOrigin({ headers: new Headers(FORGED) })).toBeNull();
	});

	test('reads the first value of a Node header array', () => {
		expect(
			resolveRequestOrigin({
				headers: { host: ['app.example.com', 'other.example'] },
			})
		).toBe('https://app.example.com');
	});
});
