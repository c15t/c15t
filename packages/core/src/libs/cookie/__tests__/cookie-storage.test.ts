import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, STORAGE_KEY_V2 } from '../../../store.initial-state';
import {
	deleteConsentFromStorage,
	deleteCookie,
	getConsentFromStorage,
	getCookie,
	getRootDomain,
	saveConsentToStorage,
	setCookie,
} from '..';

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
				path: '/custom',
				expiryDays: 7,
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

	describe('saveConsentToStorage', () => {
		it('should save consent to both localStorage and cookie using new storage key', () => {
			const consentData = {
				consents: { necessary: true, analytics: false },
				consentInfo: { time: Date.now() },
			};

			saveConsentToStorage(consentData);

			// Check localStorage (should use new key 'c15t')
			const storedInLS = window.localStorage.getItem(STORAGE_KEY_V2);
			expect(storedInLS).toBeTruthy();
			expect(JSON.parse(storedInLS || '{}')).toEqual(consentData);

			// Check cookie (should use new key 'c15t')
			expect(document.cookie).toContain(`${STORAGE_KEY_V2}=`);
		});

		it('should handle localStorage errors gracefully', () => {
			const consoleWarnSpy = vi
				.spyOn(console, 'warn')
				.mockImplementation(() => {});

			// Mock localStorage to throw an error
			const originalSetItem = window.localStorage.setItem;
			window.localStorage.setItem = vi.fn(() => {
				throw new Error('Storage quota exceeded');
			});

			const consentData = {
				consents: { necessary: true },
				consentInfo: { time: Date.now() },
			};

			// Should still succeed with cookie
			saveConsentToStorage(consentData);

			expect(document.cookie).toContain(`${STORAGE_KEY_V2}=`);

			// Restore
			window.localStorage.setItem = originalSetItem;
			consoleWarnSpy.mockRestore();
		});
	});

	describe('getConsentFromStorage', () => {
		it('should retrieve consent from localStorage when available', () => {
			const consentData = {
				consents: { necessary: true, analytics: true },
				consentInfo: { time: Date.now(), type: 'all' },
			};

			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(consentData));

			const retrieved = getConsentFromStorage();
			expect(retrieved).toEqual(consentData);
		});

		it('should fallback to cookie when localStorage is empty', () => {
			const consentData = {
				consents: { necessary: true },
				consentInfo: { time: Date.now(), type: 'necessary' },
			};

			setCookie(STORAGE_KEY_V2, consentData);

			const retrieved = getConsentFromStorage();
			expect(retrieved).toEqual(consentData);
		});

		it('should sync cookie when localStorage has data but cookie does not', () => {
			const consoleLogSpy = vi
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			const consentData = {
				consents: { necessary: true, analytics: false },
				consentInfo: { time: Date.now(), type: 'custom' },
			};

			// Set only in localStorage
			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(consentData));

			const retrieved = getConsentFromStorage();

			expect(retrieved).toEqual(consentData);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				'Synced consent from localStorage to cookie'
			);
			expect(document.cookie).toContain(`${STORAGE_KEY_V2}=`);

			consoleLogSpy.mockRestore();
		});

		it('should return null when no storage contains data', () => {
			const retrieved = getConsentFromStorage();
			expect(retrieved).toBeNull();
		});

		it('should handle localStorage errors and fallback to cookie', () => {
			const consoleWarnSpy = vi
				.spyOn(console, 'warn')
				.mockImplementation(() => {});

			const consentData = { test: 'data' };
			setCookie(STORAGE_KEY_V2, consentData);

			// Mock localStorage to throw an error
			const originalGetItem = window.localStorage.getItem;
			window.localStorage.getItem = vi.fn(() => {
				throw new Error('Storage access denied');
			});

			const retrieved = getConsentFromStorage();
			expect(retrieved).toEqual(consentData);

			// Restore
			window.localStorage.getItem = originalGetItem;
			consoleWarnSpy.mockRestore();
		});

		it('should migrate data from legacy storage key', () => {
			const consoleLogSpy = vi
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			const legacyConsentData = {
				consents: { necessary: true, marketing: false },
				consentInfo: { time: Date.now(), type: 'custom' },
			};

			// Put data in legacy localStorage key
			window.localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify(legacyConsentData)
			);

			// Retrieve should migrate automatically
			const retrieved = getConsentFromStorage();

			// Should return the migrated data
			expect(retrieved).toEqual(legacyConsentData);

			// New key should have the data
			const newKeyData = window.localStorage.getItem(STORAGE_KEY_V2);
			expect(newKeyData).toBeTruthy();
			expect(JSON.parse(newKeyData || '{}')).toEqual(legacyConsentData);

			// Legacy key should be removed
			const legacyKeyData = window.localStorage.getItem(STORAGE_KEY);
			expect(legacyKeyData).toBeNull();

			// Should log migration message
			expect(consoleLogSpy).toHaveBeenCalledWith(
				`[c15t] Migrated consent data from "${STORAGE_KEY}" to "${STORAGE_KEY_V2}"`
			);

			consoleLogSpy.mockRestore();
		});

		it('should not migrate if new key already has data', () => {
			const newConsentData = {
				consents: { necessary: true, analytics: true },
				consentInfo: { time: Date.now(), type: 'all' },
			};

			const legacyConsentData = {
				consents: { necessary: true },
				consentInfo: { time: Date.now(), type: 'necessary' },
			};

			// Set both keys
			window.localStorage.setItem(
				STORAGE_KEY_V2,
				JSON.stringify(newConsentData)
			);
			window.localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify(legacyConsentData)
			);

			// Retrieve should use new key data and cleanup legacy
			const retrieved = getConsentFromStorage();

			// Should return new key data, not legacy
			expect(retrieved).toEqual(newConsentData);

			// Legacy key should be cleaned up
			const legacyKeyData = window.localStorage.getItem(STORAGE_KEY);
			expect(legacyKeyData).toBeNull();
		});
	});

	describe('deleteConsentFromStorage', () => {
		it('should delete consent from both localStorage and cookie', () => {
			const consentData = {
				consents: { necessary: true },
				consentInfo: { time: Date.now() },
			};

			saveConsentToStorage(consentData);

			// Verify it was saved
			expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBeTruthy();
			expect(document.cookie).toContain(`${STORAGE_KEY_V2}=`);

			// Delete
			deleteConsentFromStorage();

			// Verify deletion
			expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
			// Cookie should no longer be retrievable (or empty string in jsdom)
			const cookie = getCookie(STORAGE_KEY_V2);
			expect(cookie === null || cookie === '').toBe(true);
		});

		it('should delete both legacy and new storage keys', () => {
			const consentData = {
				consents: { necessary: true },
				consentInfo: { time: Date.now() },
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
		it('should shorten metadata keys in cookies while preserving consent keys', () => {
			const consentData = {
				consents: { necessary: true, analytics: false, marketing: true },
				consentInfo: { time: 1234567890 },
			};

			saveConsentToStorage(consentData);

			// Extract flat cookie value
			const cookieValue =
				document.cookie.split(`${STORAGE_KEY_V2}=`)[1]?.split(';')[0] || '';

			// Check that cookie contains shortened keys in flat format
			expect(cookieValue).toContain('c.'); // consents -> c
			expect(cookieValue).toContain('i.'); // consentInfo -> i
			expect(cookieValue).toContain('.t:'); // time -> t

			// But consent keys should be preserved for readability
			expect(cookieValue).toContain('necessary');
			expect(cookieValue).toContain('analytics');
			expect(cookieValue).toContain('marketing');

			// Should use flat format (no JSON characters)
			expect(cookieValue).not.toContain('{');
			expect(cookieValue).not.toContain('}');
			expect(cookieValue).not.toContain('"');
		});

		it('should correctly expand shortened keys when reading from cookie', () => {
			const originalData = {
				consents: { necessary: true, analytics: false },
				consentInfo: { time: Date.now() },
			};

			saveConsentToStorage(originalData);

			// Read back and verify it matches original structure
			const retrieved = getConsentFromStorage<typeof originalData>();

			expect(retrieved).toEqual(originalData);
			expect(retrieved?.consents).toBeDefined();
			expect(retrieved?.consentInfo).toBeDefined();
			expect(retrieved?.consentInfo?.time).toBe(originalData.consentInfo.time);
		});

		it('should preserve consent key names in both storage and retrieval', () => {
			const consentData = {
				consents: {
					necessary: true,
					functional: true,
					analytics: false,
					performance: true,
					advertisement: false,
					measurement: true,
				},
				consentInfo: { time: Date.now() },
			};

			saveConsentToStorage(consentData);
			const retrieved = getConsentFromStorage<typeof consentData>();

			// All consent keys should be preserved exactly
			expect(retrieved?.consents).toEqual(consentData.consents);
			Object.keys(consentData.consents).forEach((key) => {
				expect(retrieved?.consents?.[key]).toBe(consentData.consents[key]);
			});
		});

		it('should handle timestamp field shortening', () => {
			const dataWithTimestamp = {
				timestamp: new Date().toISOString(),
				preferences: { necessary: true },
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

		it('should convert booleans to 1/0 for compression', () => {
			const consentData = {
				consents: { necessary: true, analytics: false, marketing: true },
				consentInfo: { time: 1234567890 },
			};

			saveConsentToStorage(consentData);

			// Extract flat cookie value
			const cookieValue =
				document.cookie.split(`${STORAGE_KEY_V2}=`)[1]?.split(';')[0] || '';

			// Booleans should be stored as 1/0 in flat format
			expect(cookieValue).toContain(':1'); // true -> 1
			expect(cookieValue).toContain(':0'); // false -> 0
			expect(cookieValue).not.toContain('true');
			expect(cookieValue).not.toContain('false');

			// But reading back should restore to booleans
			const retrieved = getConsentFromStorage<typeof consentData>();
			expect(retrieved?.consents?.necessary).toBe(true);
			expect(retrieved?.consents?.analytics).toBe(false);
			expect(retrieved?.consents?.marketing).toBe(true);
			expect(typeof retrieved?.consents?.necessary).toBe('boolean');
		});

		it('should reduce cookie size with flat format and key shortening', () => {
			const consentData = {
				consents: { necessary: true, analytics: false },
				consentInfo: { time: Date.now() },
			};

			// Calculate size with JSON + URL encoding (old approach)
			const fullKeysUrlEncoded = encodeURIComponent(
				JSON.stringify(consentData)
			).length;

			// Save with shortened keys + flat format (new approach)
			saveConsentToStorage(consentData);

			// Extract cookie value size
			const cookieValue =
				document.cookie.split(`${STORAGE_KEY_V2}=`)[1]?.split(';')[0] || '';
			const optimizedSize = cookieValue.length;

			// New approach should be significantly smaller (50-70% of original size)
			expect(optimizedSize).toBeLessThan(fullKeysUrlEncoded);
			expect(optimizedSize).toBeLessThan(fullKeysUrlEncoded * 0.7);

			// Verify flat format is used
			expect(cookieValue).toContain(':');
			expect(cookieValue).toContain(',');
			expect(cookieValue).not.toContain('{');
			expect(cookieValue).not.toContain('"');

			// Verify it still works correctly
			const retrieved = getConsentFromStorage<typeof consentData>();
			expect(retrieved).toEqual(consentData);
		});
	});

	describe('Cross-subdomain support', () => {
		it('should provide getRootDomain helper for cross-subdomain cookies', () => {
			// Mock window.location.hostname
			Object.defineProperty(window, 'location', {
				value: { hostname: 'app.example.com' },
				writable: true,
				configurable: true,
			});

			const rootDomain = getRootDomain();
			expect(rootDomain).toBe('.example.com');
		});

		it('should handle localhost correctly', () => {
			Object.defineProperty(window, 'location', {
				value: { hostname: 'localhost' },
				writable: true,
				configurable: true,
			});

			const rootDomain = getRootDomain();
			expect(rootDomain).toBe('localhost');
		});

		it('should handle IP addresses correctly', () => {
			Object.defineProperty(window, 'location', {
				value: { hostname: '192.168.1.1' },
				writable: true,
				configurable: true,
			});

			const rootDomain = getRootDomain();
			expect(rootDomain).toBe('192.168.1.1');
		});

		it('should work with deeply nested subdomains', () => {
			Object.defineProperty(window, 'location', {
				value: { hostname: 'api.v2.app.example.com' },
				writable: true,
				configurable: true,
			});

			const rootDomain = getRootDomain();
			expect(rootDomain).toBe('.example.com');
		});

		it('should save cookies with custom domain for cross-subdomain', () => {
			const consentData = {
				consents: { necessary: true, analytics: false },
				consentInfo: { time: Date.now() },
			};

			// Save with explicit cross-domain
			saveConsentToStorage(consentData, { domain: '.example.com' });

			// Verify cookie was set (checking it exists)
			const cookie = getConsentFromStorage();
			expect(cookie).toEqual(consentData);
		});
	});

	describe('SSR compatibility', () => {
		it('should handle missing window object gracefully', () => {
			// Save current state
			const originalWindow = global.window;
			const originalDocument = global.document;

			// @ts-expect-error - Testing SSR scenario
			delete global.window;

			const retrieved = getConsentFromStorage();
			expect(retrieved).toBeNull();

			// Restore
			global.window = originalWindow;
			global.document = originalDocument;
		});

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

	describe('Storage configuration', () => {
		it('should work with flat format for basic consent data', () => {
			const consentData = {
				consents: { necessary: true, analytics: false },
				consentInfo: { time: 1234567890 },
			};

			saveConsentToStorage(consentData);

			// Verify the cookie exists and uses flat format
			const cookieStr = document.cookie;
			expect(cookieStr).toContain(`${STORAGE_KEY_V2}=`);

			// Retrieve and verify
			const retrieved = getConsentFromStorage();
			expect(retrieved).toEqual(consentData);
		});

		it('should allow custom storage key via config parameter', () => {
			const consentData = {
				consents: { necessary: true },
				consentInfo: { time: Date.now() },
			};

			const customConfig = { storageKey: 'my-custom-consent' };

			saveConsentToStorage(consentData, undefined, customConfig);

			// Verify retrieval works with config (this is the most important part)
			const retrieved = getConsentFromStorage(customConfig);
			expect(retrieved).toEqual(consentData);

			// Check that it's NOT in the default storage key
			const defaultRetrieved = getConsentFromStorage();
			expect(defaultRetrieved).not.toEqual(consentData);
		});

		it('should use crossSubdomain flag as simple alternative to explicit domain', () => {
			Object.defineProperty(window, 'location', {
				value: { hostname: 'app.example.com' },
				writable: true,
				configurable: true,
			});

			const consentData = {
				consents: { necessary: true },
				consentInfo: { time: Date.now() },
			};

			saveConsentToStorage(consentData, { crossSubdomain: true });

			const cookie = document.cookie;
			expect(cookie).toContain(`${STORAGE_KEY_V2}=`);
			// crossSubdomain should internally call getRootDomain()
		});

		it('should delete consent using custom storage key config', () => {
			const consentData = {
				consents: { necessary: true },
				consentInfo: { time: Date.now() },
			};

			const customConfig = { storageKey: 'my-custom-consent' };

			saveConsentToStorage(consentData, undefined, customConfig);
			expect(getConsentFromStorage(customConfig)).toEqual(consentData);

			deleteConsentFromStorage(undefined, customConfig);

			// Verify retrieval returns null or empty after deletion
			const retrieved = getConsentFromStorage(customConfig);
			expect(retrieved === null || retrieved === '').toBe(true);
		});
	});
});
