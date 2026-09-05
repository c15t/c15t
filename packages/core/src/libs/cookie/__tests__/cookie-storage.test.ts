import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	deleteConsentFromStorage,
	deleteCookie,
	getCookie,
	getRootDomain,
	setCookie,
} from '..';
import { STORAGE_KEY, STORAGE_KEY_V2 } from '../../../libs/storage-keys';

describe('Cookie Storage', () => {
	beforeEach(() => {
		// Clear all cookies and localStorage before each test
		document.cookie = '';
		window.localStorage.clear();
	});

	afterEach(() => {
		// Clean up after each test
		document.cookie = '';
		window.localStorage.clear();
	});

	describe('setCookie', () => {
		it('should set a cookie with a string value', () => {
			setCookie('test-cookie', 'test-value');
			expect(document.cookie).toContain('test-cookie=');
		});

		it('should set a cookie with an object value', () => {
			const testData = { key: 'value', number: 42 };
			setCookie('test-cookie', testData);
			expect(document.cookie).toContain('test-cookie=');
		});

		it('should set cookie with custom options', () => {
			setCookie('test-cookie', 'value', {
				expiryDays: 7,
				path: '/custom',
			});
			expect(document.cookie).toContain('test-cookie=');
		});

		it('should handle errors gracefully', () => {
			const consoleWarnSpy = vi
				.spyOn(console, 'warn')
				.mockImplementation(() => {});

			// Mock document to simulate error
			const originalDocument = global.document;
			// @ts-expect-error - Testing error case
			delete global.document;

			setCookie('test-cookie', 'value');

			// Restore document
			global.document = originalDocument;
			consoleWarnSpy.mockRestore();
		});
	});

	describe('getCookie', () => {
		it('should retrieve a string cookie value', () => {
			document.cookie = 'test-cookie=test-value';
			const value = getCookie<string>('test-cookie');
			expect(value).toBe('test-value');
		});

		it('should retrieve and parse a JSON cookie value', () => {
			const testData = { key: 'value', number: 42 };
			setCookie('test-cookie', testData);
			const value = getCookie<typeof testData>('test-cookie');
			expect(value).toEqual(testData);
		});

		it('should return null for non-existent cookie', () => {
			const value = getCookie('non-existent');
			expect(value).toBeNull();
		});

		it('should handle cookies with spaces in the cookie string', () => {
			document.cookie = ' test-cookie=test-value';
			const value = getCookie<string>('test-cookie');
			expect(value).toBe('test-value');
		});
	});

	describe('deleteCookie', () => {
		it('should delete an existing cookie', () => {
			setCookie('test-cookie', 'test-value');
			const initialValue = getCookie('test-cookie');
			expect(initialValue).toBeTruthy();

			deleteCookie('test-cookie');
			// After deletion, the cookie should no longer be retrievable (or empty string in jsdom)
			const value = getCookie('test-cookie');
			expect(value === null || value === '').toBe(true);
		});

		it('should handle deleting non-existent cookie', () => {
			deleteCookie('non-existent');
			// Should not throw error
			expect(true).toBe(true);
		});
	});
	describe('deleteConsentFromStorage', () => {
		it('should delete both legacy and new storage keys', () => {
			const consentData = {
				consentInfo: { time: Date.now() },
				consents: { necessary: true },
			};

			// Set both legacy and new keys
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));
			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(consentData));
			setCookie(STORAGE_KEY, consentData);
			setCookie(STORAGE_KEY_V2, consentData);

			// Delete
			deleteConsentFromStorage();

			// Verify both are deleted
			expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
			expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
			const newCookie = getCookie(STORAGE_KEY_V2);
			const legacyCookie = getCookie(STORAGE_KEY);
			expect(newCookie === null || newCookie === '').toBe(true);
			expect(legacyCookie === null || legacyCookie === '').toBe(true);
		});

		it('should handle errors gracefully', () => {
			const consoleWarnSpy = vi
				.spyOn(console, 'warn')
				.mockImplementation(() => {});

			// Mock localStorage to throw an error
			const originalRemoveItem = window.localStorage.removeItem;
			window.localStorage.removeItem = vi.fn(() => {
				throw new Error('Storage access denied');
			});

			// Should not throw
			deleteConsentFromStorage();

			// Restore
			window.localStorage.removeItem = originalRemoveItem;
			consoleWarnSpy.mockRestore();
		});
	});

	describe('Key shortening optimization', () => {
		it('should handle timestamp field shortening', () => {
			const dataWithTimestamp = {
				preferences: { necessary: true },
				timestamp: new Date().toISOString(),
			};

			setCookie('test-timestamp', dataWithTimestamp);

			// Extract flat cookie value
			const cookieValue =
				document.cookie.split('test-timestamp=')[1]?.split(';')[0] || '';

			// Verify cookie uses 'ts' for timestamp in flat format
			expect(cookieValue).toContain('ts:');

			// Should use flat format
			expect(cookieValue).toContain(':');
			expect(cookieValue).toContain(',');
			expect(cookieValue).not.toContain('{');

			// Verify retrieval expands it back
			const retrieved = getCookie<typeof dataWithTimestamp>('test-timestamp');
			expect(retrieved?.timestamp).toBe(dataWithTimestamp.timestamp);
			expect(retrieved?.preferences).toEqual(dataWithTimestamp.preferences);
		});
	});
	describe('Cross-subdomain support', () => {
		it('should provide getRootDomain helper for cross-subdomain cookies', () => {
			// Mock window.location.hostname
			Object.defineProperty(window, 'location', {
				configurable: true,
				value: { hostname: 'app.example.com' },
				writable: true,
			});

			const rootDomain = getRootDomain();
			expect(rootDomain).toBe('.example.com');
		});

		it('should handle localhost correctly', () => {
			Object.defineProperty(window, 'location', {
				configurable: true,
				value: { hostname: 'localhost' },
				writable: true,
			});

			const rootDomain = getRootDomain();
			expect(rootDomain).toBe('localhost');
		});

		it('should handle IP addresses correctly', () => {
			Object.defineProperty(window, 'location', {
				configurable: true,
				value: { hostname: '192.168.1.1' },
				writable: true,
			});

			const rootDomain = getRootDomain();
			expect(rootDomain).toBe('192.168.1.1');
		});

		it('should work with deeply nested subdomains', () => {
			Object.defineProperty(window, 'location', {
				configurable: true,
				value: { hostname: 'api.v2.app.example.com' },
				writable: true,
			});

			const rootDomain = getRootDomain();
			expect(rootDomain).toBe('.example.com');
		});
	});

	describe('SSR compatibility', () => {
		it('should handle missing document object gracefully', () => {
			// Save current state
			const originalDocument = global.document;
			const originalWindow = global.window;

			// @ts-expect-error - Testing SSR scenario
			delete global.document;

			const value = getCookie('test');
			expect(value).toBeNull();

			// Restore
			global.document = originalDocument;
			global.window = originalWindow;
		});
	});
});

describe('unflattenObject prototype safety', () => {
	it('drops __proto__ segments instead of walking the prototype chain', async () => {
		const { unflattenObject } = await import('../serialization');

		const result = unflattenObject({
			'__proto__.polluted': '1',
			'c.__proto__': '1',
			'c.necessary': '1',
		});

		expect(result).toEqual({ c: { necessary: true } });
		expect(
			(Object.prototype as unknown as Record<string, unknown>).polluted
		).toBeUndefined();
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	});

	it('does not descend into an inherited property when building nested keys', async () => {
		const { unflattenObject } = await import('../serialization');

		const result = unflattenObject({
			'constructor.name': 'x',
			'toString.tag': '1',
		});

		expect(result).toEqual({
			constructor: { name: 'x' },
			toString: { tag: true },
		});
		expect(Object.prototype.toString).toBeTypeOf('function');
	});
});

describe('writeCookie reporting', () => {
	afterEach(() => {
		document.cookie = '';
	});

	it('reports a verified write and keeps setCookie silent on success', async () => {
		const { writeCookie } = await import('../operations');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		expect(writeCookie('c15t', { consents: { necessary: true } })).toEqual({
			attempted: true,
			verified: true,
		});
		setCookie('c15t', { consents: { necessary: true } });

		expect(warn).not.toHaveBeenCalled();
	});

	it('reports a thrown assignment and setCookie warns instead of throwing', async () => {
		const { writeCookie } = await import('../operations');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const descriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => '',
			set: () => {
				throw new Error('rejected');
			},
		});
		try {
			const report = writeCookie('c15t', 'value');
			expect(report.attempted).toBe(false);
			expect(report.verified).toBe(false);
			expect(report.error).toBeInstanceOf(Error);

			expect(() => setCookie('c15t', 'value')).not.toThrow();
			expect(warn).toHaveBeenCalledTimes(1);
		} finally {
			if (descriptor) {
				Object.defineProperty(document, 'cookie', descriptor);
			}
		}
	});
});
