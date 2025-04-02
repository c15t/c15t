import { describe, it, expect } from 'vitest';
import { isOriginTrusted } from './cors';

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

		it('should handle ports in origins', () => {
			const trustedDomains = ['example.com'];
			expect(isOriginTrusted('https://example.com:3000', trustedDomains)).toBe(
				true
			);
			expect(isOriginTrusted('http://example.com:8080', trustedDomains)).toBe(
				true
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
	});
});
