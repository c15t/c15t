import { describe, expect, test } from 'vitest';
import {
	extractDynamicSegment,
	hasDynamicSegment,
	isValidC15tUrl,
	isValidEmail,
	isValidInstanceName,
	isValidUrl,
	normalizeUrl,
	sanitizeIdentifier,
} from '../../utils/validation';

describe('validation utilities', () => {
	describe('isValidUrl', () => {
		test('should accept valid URLs', () => {
			expect(isValidUrl('https://example.com')).toBe(true);
			expect(isValidUrl('http://localhost:3000')).toBe(true);
			expect(isValidUrl('https://sub.domain.com/path')).toBe(true);
		});

		test('should reject invalid URLs', () => {
			expect(isValidUrl('not-a-url')).toBe(false);
			expect(isValidUrl('ftp://example.com')).toBe(false);
			expect(isValidUrl('')).toBe(false);
		});
	});

	describe('isValidC15tUrl', () => {
		test('should accept valid c15t URLs', () => {
			expect(isValidC15tUrl('https://my-app.c15t.dev')).toBe(true);
			expect(isValidC15tUrl('https://test-project.c15t.dev')).toBe(true);
			expect(isValidC15tUrl('https://my-app.inth.app')).toBe(true);
			expect(isValidC15tUrl('https://test-project.inth.app')).toBe(true);
		});

		test('should reject invalid c15t URLs', () => {
			expect(isValidC15tUrl('https://example.com')).toBe(false);
			expect(isValidC15tUrl('http://my-app.c15t.dev')).toBe(false);
			expect(isValidC15tUrl('https://v2.c15t.com')).toBe(false);
			expect(isValidC15tUrl('https://my-app.inth.dev')).toBe(false);
		});
	});

	describe('isValidInstanceName', () => {
		test('should accept valid project slugs', () => {
			expect(isValidInstanceName('my-app')).toBe(true);
			expect(isValidInstanceName('test123')).toBe(true);
			expect(isValidInstanceName('a'.repeat(63))).toBe(true);
		});

		test('should reject invalid project slugs', () => {
			expect(isValidInstanceName('ab')).toBe(false); // Too short
			expect(isValidInstanceName('a'.repeat(64))).toBe(false); // Too long
			expect(isValidInstanceName('My-App')).toBe(false); // Uppercase
			expect(isValidInstanceName('my--app')).toBe(false); // Double hyphen
			expect(isValidInstanceName('1app')).toBe(false); // Starts with number
		});
	});

	describe('isValidEmail', () => {
		test('should accept valid emails', () => {
			expect(isValidEmail('test@example.com')).toBe(true);
			expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
		});

		test('should reject invalid emails', () => {
			expect(isValidEmail('not-an-email')).toBe(false);
			expect(isValidEmail('missing@domain')).toBe(false);
			expect(isValidEmail('@no-local.com')).toBe(false);
		});
	});

	describe('hasDynamicSegment', () => {
		test('should detect dynamic segments', () => {
			expect(hasDynamicSegment('[locale]')).toBe(true);
			expect(hasDynamicSegment('app/[id]/page.tsx')).toBe(true);
			expect(hasDynamicSegment('[slug]')).toBe(true);
		});

		test('should return false for static paths', () => {
			expect(hasDynamicSegment('app/layout.tsx')).toBe(false);
			expect(hasDynamicSegment('static-path')).toBe(false);
		});
	});

	describe('extractDynamicSegment', () => {
		test('should extract dynamic segment', () => {
			expect(extractDynamicSegment('app/[locale]/layout.tsx')).toBe('[locale]');
			expect(extractDynamicSegment('[id]')).toBe('[id]');
		});

		test('should return null for static paths', () => {
			expect(extractDynamicSegment('app/layout.tsx')).toBeNull();
		});
	});

	describe('sanitizeIdentifier', () => {
		test('should convert to lowercase kebab-case', () => {
			expect(sanitizeIdentifier('My App')).toBe('my-app');
			expect(sanitizeIdentifier('Test_Project')).toBe('test-project');
			expect(sanitizeIdentifier('UPPERCASE')).toBe('uppercase');
		});

		test('should remove special characters', () => {
			expect(sanitizeIdentifier('my@app!')).toBe('my-app');
			expect(sanitizeIdentifier('test#$%project')).toBe('test-project');
		});

		test('should handle edge cases', () => {
			expect(sanitizeIdentifier('--leading--')).toBe('leading');
			expect(sanitizeIdentifier('trailing--')).toBe('trailing');
		});
	});

	describe('normalizeUrl', () => {
		test('should add https if missing', () => {
			expect(normalizeUrl('example.com')).toBe('https://example.com');
		});

		test('should upgrade http to https', () => {
			expect(normalizeUrl('http://example.com')).toBe('https://example.com');
		});

		test('should remove trailing slash', () => {
			expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
			expect(normalizeUrl('https://example.com///')).toBe(
				'https://example.com'
			);
		});

		test('should trim whitespace', () => {
			expect(normalizeUrl('  https://example.com  ')).toBe(
				'https://example.com'
			);
		});
	});
});
