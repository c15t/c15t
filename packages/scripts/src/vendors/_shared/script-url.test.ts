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
	});
});
