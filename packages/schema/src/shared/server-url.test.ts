import { describe, expect, it } from 'vitest';

import { resolveBackendURL } from './server-url';

describe('resolveBackendURL', () => {
	it('returns absolute http(s) URLs with trailing slash trimmed', () => {
		expect(resolveBackendURL('https://api.example.com/', {})).toBe(
			'https://api.example.com'
		);
		expect(resolveBackendURL('http://localhost:3000/api/', {})).toBe(
			'http://localhost:3000/api'
		);
	});

	it('rejects invalid or unsupported URL shapes', () => {
		expect(resolveBackendURL('api/c15t', {})).toBeNull();
		expect(resolveBackendURL('ftp://api.example.com', {})).toBeNull();
		expect(resolveBackendURL('https://', {})).toBeNull();
	});

	it('resolves relative URLs from proxy headers', () => {
		expect(
			resolveBackendURL('/api/c15t/', {
				'x-forwarded-proto': 'http',
				'x-forwarded-host': 'app.example.com',
			})
		).toBe('http://app.example.com/api/c15t');
	});

	it('uses x-forwarded-ssl when proto is absent', () => {
		expect(
			resolveBackendURL('/api/c15t', {
				'x-forwarded-ssl': 'on',
				host: 'secure.example.com',
			})
		).toBe('https://secure.example.com/api/c15t');
	});

	it('defaults proto to https and falls back to host', () => {
		expect(resolveBackendURL('/api/c15t', { host: 'app.example.com' })).toBe(
			'https://app.example.com/api/c15t'
		);
	});

	it('falls back to the referer host', () => {
		expect(
			resolveBackendURL('/api/c15t', {
				referer: 'https://app.example.com/some/page',
			})
		).toBe('https://app.example.com/api/c15t');
	});

	it('returns null when a relative URL has no host source', () => {
		expect(resolveBackendURL('/api/c15t', {})).toBeNull();
	});
});
