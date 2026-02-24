import { describe, expect, test } from 'vitest';
import {
	CLI_INFO,
	LAYOUT_PATTERNS,
	PACKAGES,
	PATHS,
	REGEX,
	STORAGE_MODES,
	URLS,
} from '../constants';

describe('constants', () => {
	describe('URLS', () => {
		test('should have valid URL formats', () => {
			expect(URLS.CONSENT_IO).toMatch(/^https:\/\//);
			expect(URLS.DOCS).toMatch(/^https:\/\//);
			expect(URLS.GITHUB).toMatch(/^https:\/\/github\.com/);
		});
	});

	describe('PATHS', () => {
		test('should have expected config paths', () => {
			expect(PATHS.CONFIG_DIR).toBe('.c15t');
			expect(PATHS.CONFIG_FILE).toBe('config.json');
			expect(PATHS.PROJECT_CONFIG).toBe('c15t.config.ts');
		});
	});

	describe('REGEX', () => {
		test('URL regex should match valid URLs', () => {
			expect(REGEX.URL.test('https://example.com')).toBe(true);
			expect(REGEX.URL.test('http://localhost:3000')).toBe(true);
			expect(REGEX.URL.test('not-a-url')).toBe(false);
		});

		test('DYNAMIC_SEGMENT regex should match route segments', () => {
			expect(REGEX.DYNAMIC_SEGMENT.test('[locale]')).toBe(true);
			expect(REGEX.DYNAMIC_SEGMENT.test('[id]')).toBe(true);
			expect(REGEX.DYNAMIC_SEGMENT.test('locale')).toBe(false);
		});
	});

	describe('CLI_INFO', () => {
		test('should have CLI metadata', () => {
			expect(CLI_INFO.NAME).toBe('c15t');
			expect(CLI_INFO.VERSION).toMatch(/^\d+\.\d+\.\d+/);
		});
	});

	describe('STORAGE_MODES', () => {
		test('should have all storage modes', () => {
			expect(STORAGE_MODES.HOSTED).toBe('hosted');
			expect(STORAGE_MODES.C15T).toBe('c15t');
			expect(STORAGE_MODES.OFFLINE).toBe('offline');
			expect(STORAGE_MODES.SELF_HOSTED).toBe('self-hosted');
			expect(STORAGE_MODES.CUSTOM).toBe('custom');
		});
	});

	describe('PACKAGES', () => {
		test('should have all package names', () => {
			expect(PACKAGES.CORE).toBe('c15t');
			expect(PACKAGES.REACT).toBe('@c15t/react');
			expect(PACKAGES.NEXTJS).toBe('@c15t/nextjs');
		});
	});

	describe('LAYOUT_PATTERNS', () => {
		test('should include standard layout patterns', () => {
			expect(LAYOUT_PATTERNS).toContain('app/layout.tsx');
			expect(LAYOUT_PATTERNS).toContain('src/app/layout.tsx');
		});

		test('should include locale-based patterns', () => {
			const hasLocalePattern = LAYOUT_PATTERNS.some((p) =>
				p.includes('*/layout')
			);
			expect(hasLocalePattern).toBe(true);
		});
	});
});
