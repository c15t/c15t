import { describe, expect, it } from 'vitest';
import { joinUrlPath, resolveScriptUrl, trimToUndefined } from './script-url';

describe('vendor script URL helpers', () => {
	describe('trimToUndefined', () => {
		it('returns undefined for missing and blank values', () => {
			expect(trimToUndefined(undefined)).toBeUndefined();
			expect(trimToUndefined('')).toBeUndefined();
			expect(trimToUndefined('   ')).toBeUndefined();
		});

		it('returns trimmed non-empty values', () => {
			expect(trimToUndefined('  https://cdn.example.com/script.js  ')).toBe(
				'https://cdn.example.com/script.js'
			);
		});
	});

	describe('resolveScriptUrl', () => {
		it('uses the fallback when no override is provided', () => {
			expect(
				resolveScriptUrl(undefined, 'https://cdn.example.com/default.js')
			).toBe('https://cdn.example.com/default.js');
		});

		it('uses the override when provided', () => {
			expect(
				resolveScriptUrl(
					'https://cdn.example.com/custom.js',
					'https://cdn.example.com/default.js'
				)
			).toBe('https://cdn.example.com/custom.js');
		});
	});

	describe('joinUrlPath', () => {
		it('joins base URLs and paths with one slash', () => {
			expect(
				joinUrlPath('https://analytics.example.com///', '/script.js')
			).toBe('https://analytics.example.com/script.js');
		});

		it('handles base URL without trailing slash and path with leading slash', () => {
			expect(joinUrlPath('https://analytics.example.com', '/script.js')).toBe(
				'https://analytics.example.com/script.js'
			);
		});

		it('handles base URL with trailing slash and path without leading slash', () => {
			expect(joinUrlPath('https://analytics.example.com/', 'script.js')).toBe(
				'https://analytics.example.com/script.js'
			);
		});

		it('handles base URL and path both without slashes', () => {
			expect(joinUrlPath('https://analytics.example.com', 'script.js')).toBe(
				'https://analytics.example.com/script.js'
			);
		});

		it('normalizes multiple slashes and trims whitespace', () => {
			expect(
				joinUrlPath('  https://analytics.example.com///  ', '///script.js  ')
			).toBe('https://analytics.example.com/script.js');
		});

		it('preserves query strings and hashes in paths', () => {
			expect(
				joinUrlPath(
					'https://analytics.example.com/',
					'/script.js?site=abc#loader'
				)
			).toBe('https://analytics.example.com/script.js?site=abc#loader');
		});

		it('throws for empty base or path values', () => {
			expect(() => joinUrlPath('', 'script.js')).toThrow(TypeError);
			expect(() => joinUrlPath('https://analytics.example.com', '  ')).toThrow(
				TypeError
			);
		});
	});
});
