import { describe, expect, it } from 'vitest';
import { resolveUrl } from '../fetcher';

describe('resolveUrl', () => {
	describe('absolute URLs', () => {
		it('should resolve absolute URL with simple path', () => {
			const result = resolveUrl('https://api.example.com', 'users');
			expect(result).toBe('https://api.example.com/users');
		});

		it('should remove trailing slashes from absolute URL base', () => {
			const result = resolveUrl('https://api.example.com/', 'users');
			expect(result).toBe('https://api.example.com/users');
		});

		it('should handle multiple trailing slashes in absolute URL base', () => {
			const result = resolveUrl('https://api.example.com///', 'users');
			expect(result).toBe('https://api.example.com/users');
		});

		it('should handle many trailing slashes in absolute URL base', () => {
			const manySlashes = '/'.repeat(100);
			const result = resolveUrl(
				`https://api.example.com${manySlashes}`,
				'users'
			);
			expect(result).toBe('https://api.example.com/users');
		});

		it('should remove leading slashes from path', () => {
			const result = resolveUrl('https://api.example.com', '/users');
			expect(result).toBe('https://api.example.com/users');
		});

		it('should handle multiple leading slashes in path', () => {
			const result = resolveUrl('https://api.example.com', '///users');
			expect(result).toBe('https://api.example.com/users');
		});

		it('should handle trailing slashes in base and leading slashes in path', () => {
			const result = resolveUrl('https://api.example.com/', '/users');
			expect(result).toBe('https://api.example.com/users');
		});

		it('should preserve existing pathname in absolute URL', () => {
			const result = resolveUrl('https://api.example.com/v1', 'users');
			expect(result).toBe('https://api.example.com/v1/users');
		});

		it('should handle existing pathname with trailing slash', () => {
			const result = resolveUrl('https://api.example.com/v1/', 'users');
			expect(result).toBe('https://api.example.com/v1/users');
		});

		it('should handle complex path combinations', () => {
			const result = resolveUrl(
				'https://api.example.com/v1/',
				'/users/profile'
			);
			expect(result).toBe('https://api.example.com/v1/users/profile');
		});

		it('should handle many trailing slashes in base with complex pathname', () => {
			const manySlashes = '/'.repeat(50);
			const result = resolveUrl(
				`https://api.example.com/v1${manySlashes}`,
				'users'
			);
			expect(result).toBe('https://api.example.com/v1/users');
		});

		it('should preserve query parameters and hash from base URL', () => {
			const result = resolveUrl(
				'https://api.example.com/v1?key=value#hash',
				'users'
			);
			expect(result).toBe('https://api.example.com/v1/users?key=value#hash');
		});

		it('should handle http protocol', () => {
			const result = resolveUrl('http://localhost:3000', 'api');
			expect(result).toBe('http://localhost:3000/api');
		});

		it('should handle http protocol with trailing slashes', () => {
			const result = resolveUrl('http://localhost:3000///', 'api');
			expect(result).toBe('http://localhost:3000/api');
		});
	});

	describe('relative URLs', () => {
		it('should resolve relative URL with simple path', () => {
			const result = resolveUrl('/api/c15t', 'users');
			expect(result).toBe('/api/c15t/users');
		});

		it('should remove trailing slashes from relative URL base', () => {
			const result = resolveUrl('/api/c15t/', 'users');
			expect(result).toBe('/api/c15t/users');
		});

		it('should handle multiple trailing slashes in relative URL base', () => {
			const result = resolveUrl('/api/c15t///', 'users');
			expect(result).toBe('/api/c15t/users');
		});

		it('should handle many trailing slashes in relative URL base', () => {
			const manySlashes = '/'.repeat(100);
			const result = resolveUrl(`/api/c15t${manySlashes}`, 'users');
			expect(result).toBe('/api/c15t/users');
		});

		it('should remove leading slashes from path', () => {
			const result = resolveUrl('/api/c15t', '/users');
			expect(result).toBe('/api/c15t/users');
		});

		it('should handle multiple leading slashes in path', () => {
			const result = resolveUrl('/api/c15t', '///users');
			expect(result).toBe('/api/c15t/users');
		});

		it('should handle trailing slashes in base and leading slashes in path', () => {
			const result = resolveUrl('/api/c15t/', '/users');
			expect(result).toBe('/api/c15t/users');
		});

		it('should handle complex relative paths', () => {
			const result = resolveUrl('/api/v1/c15t/', '/users/profile');
			expect(result).toBe('/api/v1/c15t/users/profile');
		});

		it('should handle many trailing slashes with complex relative path', () => {
			const manySlashes = '/'.repeat(75);
			const result = resolveUrl(`/api/v1/c15t${manySlashes}`, 'endpoint');
			expect(result).toBe('/api/v1/c15t/endpoint');
		});
	});

	describe('edge cases', () => {
		it('should handle empty path', () => {
			const result = resolveUrl('https://api.example.com', '');
			expect(result).toBe('https://api.example.com/');
		});

		it('should handle empty path with trailing slash in base', () => {
			const result = resolveUrl('https://api.example.com/', '');
			expect(result).toBe('https://api.example.com/');
		});

		it('should handle path with only slashes', () => {
			const manySlashes = '/'.repeat(100);
			const result = resolveUrl('https://api.example.com', manySlashes);
			expect(result).toBe('https://api.example.com/');
		});

		it('should handle both base and path with many slashes', () => {
			const baseSlashes = '/'.repeat(50);
			const pathSlashes = '/'.repeat(50);
			const result = resolveUrl(
				`https://api.example.com${baseSlashes}`,
				pathSlashes + 'users'
			);
			expect(result).toBe('https://api.example.com/users');
		});
	});
});
