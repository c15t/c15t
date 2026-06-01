import { describe, expect, it } from 'vitest';
import { isOriginTrusted } from './is-origin-trusted';

/**
 * Test suite for CORS utility functions
 */
describe('CORS utilities', () => {
	describe('isOriginTrusted', () => {
		it('should match exact origins', () => {
			const trustedDomains = ['example.com'];
			expect(isOriginTrusted('https://example.com', trustedDomains)).toBe(true);
			expect(isOriginTrusted('https://other.com', trustedDomains)).toBe(false);
		});

		it('should handle origins with trailing slashes', () => {
			const trustedDomains = ['example.com'];
			expect(isOriginTrusted('https://example.com/', trustedDomains)).toBe(
				true
			);
			expect(isOriginTrusted('https://example.com//', trustedDomains)).toBe(
				true
			);
		});

		it('should handle origins with paths', () => {
			const trustedDomains = ['example.com'];
			expect(isOriginTrusted('https://example.com/path', trustedDomains)).toBe(
				true
			);
			expect(
				isOriginTrusted('https://example.com/path/subpath', trustedDomains)
			).toBe(true);
		});

		it('should handle multiple trusted domains', () => {
			const trustedDomains = ['example.com', 'test.com'];
			expect(isOriginTrusted('https://example.com', trustedDomains)).toBe(true);
			expect(isOriginTrusted('https://test.com', trustedDomains)).toBe(true);
			expect(isOriginTrusted('https://other.com', trustedDomains)).toBe(false);
		});

		it('should handle wildcard subdomains', () => {
			const trustedDomains = ['*.example.com'];
			expect(isOriginTrusted('https://sub.example.com', trustedDomains)).toBe(
				true
			);
			expect(
				isOriginTrusted('https://other.sub.example.com', trustedDomains)
			).toBe(true);
			expect(isOriginTrusted('https://example.com', trustedDomains)).toBe(
				false
			);
			expect(isOriginTrusted('https://other.com', trustedDomains)).toBe(false);
		});

		it('should handle different protocols', () => {
			const trustedDomains = ['example.com'];
			expect(isOriginTrusted('http://example.com', trustedDomains)).toBe(true);
			expect(isOriginTrusted('wss://example.com', trustedDomains)).toBe(true);
		});

		it('should handle ports in origins when the trusted domain is host-only', () => {
			const trustedDomains = ['example.com'];
			expect(isOriginTrusted('https://example.com:3000', trustedDomains)).toBe(
				true
			);
			expect(isOriginTrusted('http://example.com:8080', trustedDomains)).toBe(
				true
			);
		});

		it('should scope origins to explicit trusted ports', () => {
			expect(isOriginTrusted('http://localhost:3000', ['localhost:3000'])).toBe(
				true
			);
			expect(isOriginTrusted('http://localhost:5173', ['localhost:3000'])).toBe(
				false
			);
			expect(
				isOriginTrusted('https://api.example.com:8443', ['*.example.com:8443'])
			).toBe(true);
			expect(
				isOriginTrusted('https://api.example.com:9443', ['*.example.com:8443'])
			).toBe(false);
		});

		it('should honor explicitly configured default ports', () => {
			// :443 is the https default, but writing it should still scope the port
			expect(isOriginTrusted('https://example.com', ['example.com:443'])).toBe(
				true
			);
			expect(
				isOriginTrusted('https://example.com:8443', ['example.com:443'])
			).toBe(false);
			// :80 written without a protocol must still match an http origin
			expect(isOriginTrusted('http://example.com', ['example.com:80'])).toBe(
				true
			);
			expect(isOriginTrusted('https://example.com', ['example.com:80'])).toBe(
				false
			);
		});

		it('should handle empty trusted domains array', () => {
			const trustedDomains: string[] = [];
			expect(isOriginTrusted('https://example.com', trustedDomains)).toBe(
				false
			);
		});

		it('should handle invalid origin formats', () => {
			const trustedDomains = ['example.com'];
			expect(isOriginTrusted('invalid-url', trustedDomains)).toBe(false);
			expect(isOriginTrusted('', trustedDomains)).toBe(false);
		});

		it('should handle case sensitivity', () => {
			const trustedDomains = ['EXAMPLE.com'];
			expect(isOriginTrusted('https://example.com', trustedDomains)).toBe(true);
			expect(isOriginTrusted('https://EXAMPLE.COM', trustedDomains)).toBe(true);
		});

		it('should allow www and non-www exact domain variants', () => {
			expect(isOriginTrusted('https://www.example.com', ['example.com'])).toBe(
				true
			);
			expect(isOriginTrusted('https://example.com', ['www.example.com'])).toBe(
				true
			);
		});

		it('should handle subdomain levels with wildcards', () => {
			const trustedDomains = ['*.example.com'];
			expect(isOriginTrusted('https://a.b.example.com', trustedDomains)).toBe(
				true
			);
			expect(isOriginTrusted('https://a.example.com', trustedDomains)).toBe(
				true
			);
			expect(isOriginTrusted('https://example.com', trustedDomains)).toBe(
				false
			);
		});

		describe('multiple subdomain levels', () => {
			it('should match base domain when explicitly listed', () => {
				const trustedDomains = ['my-site.com'];
				expect(isOriginTrusted('https://my-site.com', trustedDomains)).toBe(
					true
				);
			});

			it('should match single-level subdomain with wildcard pattern', () => {
				const trustedDomains = ['*.my-site.com'];
				expect(
					isOriginTrusted('https://foobar.my-site.com', trustedDomains)
				).toBe(true);
			});

			it('should match multi-level subdomain with wildcard pattern', () => {
				const trustedDomains = ['*.my-site.com'];
				expect(
					isOriginTrusted('https://foo.bar.my-site.com', trustedDomains)
				).toBe(true);
			});

			it('should match three-level subdomain with wildcard pattern', () => {
				const trustedDomains = ['*.my-site.com'];
				expect(
					isOriginTrusted('https://a.b.c.my-site.com', trustedDomains)
				).toBe(true);
			});

			it('should not match base domain with wildcard pattern', () => {
				const trustedDomains = ['*.my-site.com'];
				expect(isOriginTrusted('https://my-site.com', trustedDomains)).toBe(
					false
				);
			});

			it('should not match similar domain that is not a subdomain', () => {
				const trustedDomains = ['*.my-site.com'];
				expect(isOriginTrusted('https://notmy-site.com', trustedDomains)).toBe(
					false
				);
				expect(
					isOriginTrusted('https://foobar-my-site.com', trustedDomains)
				).toBe(false);
			});

			it('should match both base domain and subdomains when both are configured', () => {
				const trustedDomains = ['my-site.com', '*.my-site.com'];
				expect(isOriginTrusted('https://my-site.com', trustedDomains)).toBe(
					true
				);
				expect(
					isOriginTrusted('https://foobar.my-site.com', trustedDomains)
				).toBe(true);
				expect(
					isOriginTrusted('https://foo.bar.my-site.com', trustedDomains)
				).toBe(true);
			});
		});
	});
});
