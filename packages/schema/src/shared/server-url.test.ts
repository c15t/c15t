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

	it('ignores forged forwarding headers and referer by default', () => {
		expect(
			resolveBackendURL('/api/c15t/', {
				host: 'app.example.com',
				referer: 'https://attacker.example/',
				'x-forwarded-host': 'attacker.example',
				'x-forwarded-proto': 'http',
			})
		).toBe('https://app.example.com/api/c15t');
		expect(
			resolveBackendURL('/api/c15t', {
				referer: 'https://attacker.example/',
				'x-forwarded-host': 'attacker.example',
			})
		).toBeNull();
	});

	it('picks the scheme from the host', () => {
		expect(resolveBackendURL('/api/c15t', { host: 'localhost:3000' })).toBe(
			'http://localhost:3000/api/c15t'
		);
		expect(resolveBackendURL('/api/c15t', { host: 'app.example.com' })).toBe(
			'https://app.example.com/api/c15t'
		);
	});

	it('rejects a host that is not a bare authority', () => {
		expect(
			resolveBackendURL('/api/c15t', { host: 'user@attacker.example' })
		).toBeNull();
		expect(
			resolveBackendURL('//attacker.example/x', { host: 'app.example.com' })
		).toBeNull();
	});

	it('resolves from proxy headers when trusted', () => {
		const trusted = { trustForwardedHeaders: true };
		expect(
			resolveBackendURL(
				'/api/c15t/',
				{
					'x-forwarded-host': 'app.example.com',
					'x-forwarded-proto': 'http',
				},
				trusted
			)
		).toBe('http://app.example.com/api/c15t');
		expect(
			resolveBackendURL(
				'/api/c15t',
				{ host: 'secure.example.com', 'x-forwarded-ssl': 'on' },
				trusted
			)
		).toBe('https://secure.example.com/api/c15t');
		expect(
			resolveBackendURL(
				'/api/c15t',
				{ referer: 'https://app.example.com/some/page' },
				trusted
			)
		).toBe('https://app.example.com/api/c15t');
	});

	it('validates trusted proxy headers as it validates host', () => {
		const trusted = { trustForwardedHeaders: true };
		expect(
			resolveBackendURL(
				'/api/c15t',
				{
					'x-forwarded-host': 'edge.example.com, internal:3000',
					'x-forwarded-proto': 'http, https',
				},
				trusted
			)
		).toBe('http://edge.example.com/api/c15t');
		expect(
			resolveBackendURL(
				'/api/c15t',
				{
					'x-forwarded-host': 'app.example.com',
					'x-forwarded-proto': 'javascript',
				},
				trusted
			)
		).toBe('https://app.example.com/api/c15t');
		for (const host of ['attacker.example/x', 'user@attacker.example', 'a b']) {
			expect(
				resolveBackendURL('/api/c15t', { 'x-forwarded-host': host }, trusted)
			).toBeNull();
		}
	});

	it('returns null when a relative URL has no host source', () => {
		expect(resolveBackendURL('/api/c15t', {})).toBeNull();
	});
});
