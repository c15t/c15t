import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, STORAGE_KEY_V2 } from '../../../store/initial-state';
import type { ConsentState } from '../../../types';
import type { ConsentInfo } from '../../../types/gdpr';
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

	// Helper to compare consent data, accounting for normalization
	function expectConsentsToMatch(
		actual: Partial<ConsentState> | undefined,
		expected: Partial<ConsentState>
	) {
		if (!actual) {
			throw new Error('Actual consents is undefined');
		}

		// Check that all expected consents match
		for (const [key, value] of Object.entries(expected)) {
			expect(actual[key as keyof ConsentState]).toBe(value);
		}
	}

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
				consents: { necessary: true, measurement: false },
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
				consents: { necessary: true, measurement: true },
				consentInfo: { time: Date.now(), type: 'all' as const },
			};

			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(consentData));

			const retrieved = getConsentFromStorage();
			// Retrieved data will have all standard consents normalized
			expectConsentsToMatch(retrieved?.consents, consentData.consents);
			expect(retrieved?.consentInfo).toEqual(consentData.consentInfo);
		});

		it('should fallback to cookie when localStorage is empty', () => {
			const consentData = {
				consents: { necessary: true },
				consentInfo: { time: Date.now(), type: 'necessary' as const },
			};

			setCookie(STORAGE_KEY_V2, consentData);

			const retrieved = getConsentFromStorage();
			expectConsentsToMatch(retrieved?.consents, consentData.consents);
			expect(retrieved?.consentInfo).toEqual(consentData.consentInfo);
		});

		it('should sync cookie when localStorage has data but cookie does not', () => {
			const consoleLogSpy = vi
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			const consentData = {
				consents: { necessary: true, measurement: false },
				consentInfo: { time: Date.now(), type: 'custom' as const },
			};

			// Set only in localStorage
			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(consentData));

			const retrieved = getConsentFromStorage();

			expectConsentsToMatch(retrieved?.consents, consentData.consents);
			expect(retrieved?.consentInfo).toEqual(consentData.consentInfo);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				'[c15t] Synced consent from localStorage to cookie'
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

			const consentData = {
				consents: { necessary: true, marketing: false },
				consentInfo: { time: Date.now(), type: 'custom' as const },
			};
			setCookie(STORAGE_KEY_V2, consentData);

			// Mock localStorage to throw an error
			const originalGetItem = window.localStorage.getItem;
			window.localStorage.getItem = vi.fn(() => {
				throw new Error('Storage access denied');
			});

			try {
				const retrieved = getConsentFromStorage();
				// Should fallback to cookie data (normalized)
				expectConsentsToMatch(retrieved?.consents, consentData.consents);
				expect(retrieved?.consentInfo).toEqual(consentData.consentInfo);
			} finally {
				// Restore - ensure this runs even if assertions fail
				window.localStorage.getItem = originalGetItem;
				consoleWarnSpy.mockRestore();
			}
		});

		it('should migrate data from legacy storage key', () => {
			const consoleLogSpy = vi
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			const legacyConsentData = {
				consents: { necessary: true, marketing: false },
				consentInfo: { time: Date.now(), type: 'custom' as const },
			};

			// Put data in legacy localStorage key
			window.localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify(legacyConsentData)
			);

			// Retrieve should migrate automatically
			const retrieved = getConsentFromStorage();

			// Should return the migrated data (normalized)
			expectConsentsToMatch(retrieved?.consents, legacyConsentData.consents);
			expect(retrieved?.consentInfo).toEqual(legacyConsentData.consentInfo);

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
				consents: { necessary: true, measurement: true },
				consentInfo: { time: Date.now(), type: 'all' as const },
			};

			const legacyConsentData = {
				consents: { necessary: true },
				consentInfo: { time: Date.now(), type: 'necessary' as const },
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

			// Should return new key data, not legacy (normalized)
			expectConsentsToMatch(retrieved?.consents, newConsentData.consents);
			expect(retrieved?.consentInfo).toEqual(newConsentData.consentInfo);

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
				consents: { necessary: true, measurement: false, marketing: true },
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

			// Consent keys that are true should be preserved
			expect(cookieValue).toContain('necessary');
			expect(cookieValue).toContain('marketing');

			// Optimization: False values should be omitted
			expect(cookieValue).not.toContain('measurement');

			// Should use flat format (no JSON characters)
			expect(cookieValue).not.toContain('{');
			expect(cookieValue).not.toContain('}');
			expect(cookieValue).not.toContain('"');
		});

		it('should correctly expand shortened keys when reading from cookie', () => {
			const originalData = {
				consents: { necessary: true, measurement: false },
				consentInfo: { time: Date.now() },
			};

			saveConsentToStorage(originalData);

			// Clear localStorage to test cookie-only behavior
			window.localStorage.clear();

			// Read back from cookie - false values are omitted in storage but normalized on retrieval
			const retrieved = getConsentFromStorage<typeof originalData>();

			// True values and metadata should be preserved
			expect(retrieved?.consents?.necessary).toBe(true);
			expect(retrieved?.consentInfo).toBeDefined();
			expect(retrieved?.consentInfo?.time).toBe(originalData.consentInfo.time);

			// False values are omitted from cookie but explicitly returned as false (not undefined)
			expect(retrieved?.consents?.measurement).toBe(false);
			expect(typeof retrieved?.consents?.measurement).toBe('boolean');
		});

		it('should preserve consent key names in both storage and retrieval', () => {
			const consentData = {
				consents: {
					necessary: true,
					functionality: true,
					measurement: false,
					experience: true,
					marketing: false,
				},
				consentInfo: { time: Date.now() },
			};

			saveConsentToStorage(consentData);

			// Clear localStorage to test cookie-only behavior
			window.localStorage.clear();

			const retrieved = getConsentFromStorage<typeof consentData>();

			// True consent values should be preserved exactly
			expect(retrieved?.consents?.necessary).toBe(true);
			expect(retrieved?.consents?.functionality).toBe(true);
			expect(retrieved?.consents?.experience).toBe(true);

			// False values are omitted from cookie but explicitly returned as false (not undefined)
			expect(retrieved?.consents?.measurement).toBe(false);
			expect(retrieved?.consents?.marketing).toBe(false);
			expect(typeof retrieved?.consents?.measurement).toBe('boolean');
			expect(typeof retrieved?.consents?.marketing).toBe('boolean');
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

		it('should convert true booleans to 1 and omit false for compression', () => {
			const consentData = {
				consents: { necessary: true, measurement: false, marketing: true },
				consentInfo: { time: 1234567890 },
			};

			saveConsentToStorage(consentData);

			// Extract flat cookie value
			const cookieValue =
				document.cookie.split(`${STORAGE_KEY_V2}=`)[1]?.split(';')[0] || '';

			// True booleans should be stored as 1 in flat format
			expect(cookieValue).toContain(':1'); // true -> 1
			// False booleans should be omitted entirely for better compression
			expect(cookieValue).not.toContain(':0'); // false -> omitted
			expect(cookieValue).not.toContain('true');
			expect(cookieValue).not.toContain('false');

			// Clear localStorage to test cookie-only behavior
			window.localStorage.clear();

			// Reading back from cookie should restore true to boolean and normalize false values
			const retrieved = getConsentFromStorage<typeof consentData>();
			expect(retrieved?.consents?.necessary).toBe(true);
			expect(retrieved?.consents?.measurement).toBe(false); // explicitly false, not undefined
			expect(retrieved?.consents?.marketing).toBe(true);
			expect(typeof retrieved?.consents?.necessary).toBe('boolean');
			expect(typeof retrieved?.consents?.measurement).toBe('boolean');
		});

		it('should reduce cookie size with flat format and key shortening', () => {
			const consentData = {
				consents: { necessary: true, measurement: false },
				consentInfo: { time: Date.now() },
			};

			// Calculate size with JSON + URL encoding (old approach)
			const fullKeysUrlEncoded = encodeURIComponent(
				JSON.stringify(consentData)
			).length;

			// Save with shortened keys + flat format + false omission (new approach)
			saveConsentToStorage(consentData);

			// Extract cookie value size
			const cookieValue =
				document.cookie.split(`${STORAGE_KEY_V2}=`)[1]?.split(';')[0] || '';
			const optimizedSize = cookieValue.length;

			// New approach should be significantly smaller (even more with false omission)
			expect(optimizedSize).toBeLessThan(fullKeysUrlEncoded);
			expect(optimizedSize).toBeLessThan(fullKeysUrlEncoded * 0.5);

			// Verify flat format is used
			expect(cookieValue).toContain(':');
			expect(cookieValue).toContain(',');
			expect(cookieValue).not.toContain('{');
			expect(cookieValue).not.toContain('"');

			// Verify false value is omitted from cookie
			expect(cookieValue).not.toContain('measurement');

			// Verify it still works correctly (false values are explicitly returned as false)
			const retrieved = getConsentFromStorage<typeof consentData>();
			expect(retrieved?.consents?.necessary).toBe(true);
			expect(retrieved?.consents?.measurement).toBe(false); // explicitly false
			expect(retrieved?.consentInfo?.time).toBe(consentData.consentInfo.time);
		});
	});

	describe('Explicit false values', () => {
		it('should return explicit false for all standard consent types', () => {
			const consentData: {
				consents: Partial<ConsentState>;
				consentInfo: ConsentInfo;
			} = {
				consents: { necessary: true }, // Only one consent is true
				consentInfo: { time: Date.now(), type: 'custom' },
			};

			saveConsentToStorage(consentData);

			// Clear localStorage to test cookie-only behavior
			window.localStorage.clear();

			const retrieved = getConsentFromStorage<typeof consentData>();

			// All standard consent types should have explicit boolean values
			expect(retrieved?.consents?.necessary).toBe(true);
			expect(retrieved?.consents?.functionality).toBe(false);
			expect(retrieved?.consents?.measurement).toBe(false);
			expect(retrieved?.consents?.experience).toBe(false);
			expect(retrieved?.consents?.marketing).toBe(false);

			// All should be booleans, not undefined
			expect(typeof retrieved?.consents?.necessary).toBe('boolean');
			expect(typeof retrieved?.consents?.functionality).toBe('boolean');
			expect(typeof retrieved?.consents?.measurement).toBe('boolean');
			expect(typeof retrieved?.consents?.experience).toBe('boolean');
			expect(typeof retrieved?.consents?.marketing).toBe('boolean');
		});

		it('should preserve custom consent types while normalizing standard ones', () => {
			const consentData: {
				consents: Partial<ConsentState> & { customConsent?: boolean };
				consentInfo: ConsentInfo;
			} = {
				consents: {
					necessary: true,
					customConsent: true, // Non-standard consent type
				},
				consentInfo: { time: Date.now(), type: 'custom' },
			};

			saveConsentToStorage(consentData);

			// Clear localStorage to test cookie-only behavior
			window.localStorage.clear();

			const retrieved = getConsentFromStorage<typeof consentData>();

			// Standard consent types should be normalized
			expect(retrieved?.consents?.necessary).toBe(true);
			expect(retrieved?.consents?.functionality).toBe(false);

			// Custom consent type should be preserved
			expect(retrieved?.consents?.customConsent).toBe(true);
		});
	});

	describe('Backward compatibility', () => {
		it('should correctly read legacy cookies with explicit false values (0)', () => {
			// Simulate a legacy cookie format with '0' for false values
			const legacyCookieValue =
				'c.necessary:1,c.measurement:0,c.marketing:0,i.t:1234567890';
			document.cookie = `${STORAGE_KEY_V2}=${legacyCookieValue}`;

			// Read the legacy cookie
			const retrieved = getConsentFromStorage<{
				consents: {
					necessary: boolean;
					measurement: boolean;
					marketing: boolean;
				};
				consentInfo: { time: number };
			}>();

			// Should correctly parse '0' as false for backward compatibility
			expect(retrieved?.consents?.necessary).toBe(true);
			expect(retrieved?.consents?.measurement).toBe(false);
			expect(retrieved?.consents?.marketing).toBe(false);
			expect(retrieved?.consentInfo?.time).toBe(1234567890);
		});

		it('should save new cookies without false values (optimized)', () => {
			const consentData = {
				consents: { necessary: true, measurement: false, marketing: false },
				consentInfo: { time: 1234567890 },
			};

			saveConsentToStorage(consentData);

			// Extract the new cookie format
			const cookieValue =
				document.cookie.split(`${STORAGE_KEY_V2}=`)[1]?.split(';')[0] || '';

			// New format should omit false values
			expect(cookieValue).not.toContain(':0');
			expect(cookieValue).toContain('c.necessary:1');
			expect(cookieValue).not.toContain('measurement');
			expect(cookieValue).not.toContain('marketing');
		});

		it('should handle mixed scenario: read legacy, save optimized', () => {
			// Start with legacy cookie
			const legacyCookieValue = 'c.necessary:0,c.measurement:1,i.t:1111111111';
			document.cookie = `${STORAGE_KEY_V2}=${legacyCookieValue}`;

			// Read legacy
			const retrieved = getConsentFromStorage<{
				consents: { necessary: boolean; measurement: boolean };
				consentInfo: { time: number };
			}>();

			expect(retrieved?.consents?.necessary).toBe(false);
			expect(retrieved?.consents?.measurement).toBe(true);

			// Now save new data (should use optimized format)
			const newData = {
				consents: { necessary: true, measurement: false, marketing: true },
				consentInfo: { time: 2222222222 },
			};

			saveConsentToStorage(newData);

			// Verify new format is optimized
			const newCookieValue =
				document.cookie.split(`${STORAGE_KEY_V2}=`)[1]?.split(';')[0] || '';

			expect(newCookieValue).toContain('necessary:1');
			expect(newCookieValue).toContain('marketing:1');
			expect(newCookieValue).not.toContain('measurement');
			expect(newCookieValue).not.toContain(':0');
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
				consents: { necessary: true, measurement: false },
				consentInfo: { time: Date.now(), type: 'custom' as const },
			};

			// Save with explicit cross-domain
			saveConsentToStorage(consentData, { domain: '.example.com' });

			// Verify cookie was set (checking it exists, normalized)
			const cookie = getConsentFromStorage();
			expectConsentsToMatch(cookie?.consents, consentData.consents);
			expect(cookie?.consentInfo).toEqual(consentData.consentInfo);
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
				consents: { necessary: true, measurement: false },
				consentInfo: { time: 1234567890, type: 'custom' as const },
			};

			saveConsentToStorage(consentData);

			// Verify the cookie exists and uses flat format
			const cookieStr = document.cookie;
			expect(cookieStr).toContain(`${STORAGE_KEY_V2}=`);

			// Retrieve and verify (normalized)
			const retrieved = getConsentFromStorage();
			expectConsentsToMatch(retrieved?.consents, consentData.consents);
			expect(retrieved?.consentInfo).toEqual(consentData.consentInfo);
		});

		it('should allow custom storage key via config parameter', () => {
			const consentData = {
				consents: { necessary: true },
				consentInfo: { time: Date.now(), type: 'custom' as const },
			};

			const customConfig = { storageKey: 'my-custom-consent' };

			saveConsentToStorage(consentData, undefined, customConfig);

			// Verify retrieval works with config (normalized)
			const retrieved = getConsentFromStorage(customConfig);
			expectConsentsToMatch(retrieved?.consents, consentData.consents);
			expect(retrieved?.consentInfo).toEqual(consentData.consentInfo);

			// Check that it's NOT in the default storage key
			const defaultRetrieved = getConsentFromStorage();
			expect(defaultRetrieved).toBeNull();
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
				consentInfo: { time: Date.now(), type: 'custom' as const },
			};

			const customConfig = { storageKey: 'my-custom-consent' };

			saveConsentToStorage(consentData, undefined, customConfig);
			const saved = getConsentFromStorage(customConfig);
			expectConsentsToMatch(saved?.consents, consentData.consents);

			deleteConsentFromStorage(undefined, customConfig);

			// Verify retrieval returns null or empty after deletion
			const retrieved = getConsentFromStorage(customConfig);
			expect(retrieved === null || retrieved === '').toBe(true);
		});
	});

	describe('Cross-subdomain timestamp comparison', () => {
		it('should prioritize cookie when both exist (optimized for performance)', () => {
			const consoleLogSpy = vi
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			const olderConsent = {
				consents: { necessary: true, measurement: false },
				consentInfo: { time: 1000000000 },
			};

			const newerConsent = {
				consents: { necessary: true, measurement: true },
				consentInfo: { time: 2000000000 },
			};

			// Set older data in localStorage
			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(olderConsent));

			// Set newer data in cookie
			setCookie(STORAGE_KEY_V2, newerConsent);

			const retrieved = getConsentFromStorage();

			// Should return cookie data (always prioritized when both exist)
			expectConsentsToMatch(retrieved?.consents, newerConsent.consents);
			expect(retrieved?.consentInfo.time).toBe(newerConsent.consentInfo.time);

			// Should sync cookie to localStorage
			const syncedLS = JSON.parse(
				window.localStorage.getItem(STORAGE_KEY_V2) || '{}'
			);
			expectConsentsToMatch(syncedLS.consents, newerConsent.consents);
			expect(syncedLS.consentInfo.time).toBe(newerConsent.consentInfo.time);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				'[c15t] Updated localStorage with consent from cookie'
			);

			consoleLogSpy.mockRestore();
		});

		it('should prioritize cookie even when localStorage is newer (cookie is source of truth)', () => {
			const consoleLogSpy = vi
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			const olderConsent = {
				consents: { necessary: true, measurement: false },
				consentInfo: { time: 1000000000 },
			};

			const newerConsent = {
				consents: { necessary: true, measurement: true },
				consentInfo: { time: 2000000000 },
			};

			// Set newer data in localStorage
			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(newerConsent));

			// Set older data in cookie
			setCookie(STORAGE_KEY_V2, olderConsent);

			const retrieved = getConsentFromStorage();

			// Should return cookie data (always prioritized, even if older)
			expectConsentsToMatch(retrieved?.consents, olderConsent.consents);
			expect(retrieved?.consentInfo.time).toBe(olderConsent.consentInfo.time);

			// Should sync cookie to localStorage (cookie is source of truth)
			const syncedLS = JSON.parse(
				window.localStorage.getItem(STORAGE_KEY_V2) || '{}'
			);
			expectConsentsToMatch(syncedLS.consents, olderConsent.consents);
			expect(syncedLS.consentInfo.time).toBe(olderConsent.consentInfo.time);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				'[c15t] Updated localStorage with consent from cookie'
			);

			consoleLogSpy.mockRestore();
		});

		it('should prioritize cookie when crossSubdomain is enabled, regardless of timestamp', () => {
			const consoleLogSpy = vi
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			const newerConsent = {
				consents: { necessary: true, measurement: true },
				consentInfo: { time: 2000000000 },
			};

			const olderConsent = {
				consents: { necessary: true, measurement: false },
				consentInfo: { time: 1000000000 },
			};

			// Set newer data in localStorage
			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(newerConsent));

			// Set older data in cookie
			setCookie(STORAGE_KEY_V2, olderConsent);

			const config = { crossSubdomain: true };

			const retrieved = getConsentFromStorage(config);

			// Should return cookie data (prioritized in cross-subdomain mode)
			expectConsentsToMatch(retrieved?.consents, olderConsent.consents);
			expect(retrieved?.consentInfo.time).toBe(olderConsent.consentInfo.time);

			// Should sync cookie to localStorage (cookie is source of truth)
			const syncedLS = JSON.parse(
				window.localStorage.getItem(STORAGE_KEY_V2) || '{}'
			);
			expectConsentsToMatch(syncedLS.consents, olderConsent.consents);
			expect(syncedLS.consentInfo.time).toBe(olderConsent.consentInfo.time);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				'[c15t] Updated localStorage with consent from cookie (cross-subdomain mode)'
			);

			consoleLogSpy.mockRestore();
		});

		it('should prioritize cookie when defaultDomain is set, regardless of timestamp', () => {
			const consoleLogSpy = vi
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			const newerConsent = {
				consents: { necessary: true, measurement: true },
				consentInfo: { time: 2000000000 },
			};

			const olderConsent = {
				consents: { necessary: true, measurement: false },
				consentInfo: { time: 1000000000 },
			};

			// Set newer data in localStorage
			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(newerConsent));

			// Set older data in cookie
			setCookie(STORAGE_KEY_V2, olderConsent);

			const config = { defaultDomain: '.example.com' };

			const retrieved = getConsentFromStorage(config);

			// Should return cookie data (prioritized when defaultDomain is set)
			expectConsentsToMatch(retrieved?.consents, olderConsent.consents);
			expect(retrieved?.consentInfo.time).toBe(olderConsent.consentInfo.time);

			// Should sync cookie to localStorage
			const syncedLS = JSON.parse(
				window.localStorage.getItem(STORAGE_KEY_V2) || '{}'
			);
			expectConsentsToMatch(syncedLS.consents, olderConsent.consents);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				'[c15t] Updated localStorage with consent from cookie (cross-subdomain mode)'
			);

			consoleLogSpy.mockRestore();
		});

		it('should use cookie when localStorage is empty and sync to localStorage', () => {
			const consoleLogSpy = vi
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			const consentData = {
				consents: { necessary: true, measurement: true },
				consentInfo: { time: Date.now() },
			};

			// Set only in cookie
			setCookie(STORAGE_KEY_V2, consentData);

			const retrieved = getConsentFromStorage();

			// Should return cookie data
			expectConsentsToMatch(retrieved?.consents, consentData.consents);
			expect(retrieved?.consentInfo.time).toBe(consentData.consentInfo.time);

			// Should sync cookie to localStorage
			const syncedLS = JSON.parse(
				window.localStorage.getItem(STORAGE_KEY_V2) || '{}'
			);
			expectConsentsToMatch(syncedLS.consents, consentData.consents);
			expect(syncedLS.consentInfo.time).toBe(consentData.consentInfo.time);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				'[c15t] Synced consent from cookie to localStorage'
			);

			consoleLogSpy.mockRestore();
		});

		it('should use localStorage when cookie is empty and sync to cookie', () => {
			const consoleLogSpy = vi
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			const consentData = {
				consents: { necessary: true, measurement: true },
				consentInfo: { time: Date.now() },
			};

			// Set only in localStorage
			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(consentData));

			const retrieved = getConsentFromStorage();

			// Should return localStorage data
			expectConsentsToMatch(retrieved?.consents, consentData.consents);
			expect(retrieved?.consentInfo.time).toBe(consentData.consentInfo.time);

			// Should sync localStorage to cookie
			const syncedCookie = getCookie(STORAGE_KEY_V2);
			expectConsentsToMatch(syncedCookie?.consents, consentData.consents);
			expect(syncedCookie?.consentInfo.time).toBe(consentData.consentInfo.time);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				'[c15t] Synced consent from localStorage to cookie'
			);

			consoleLogSpy.mockRestore();
		});

		it('should prioritize cookie when both have equal timestamps (cookie is source of truth)', () => {
			const consentData = {
				consents: { necessary: true, measurement: true },
				consentInfo: { time: 1000000000 },
			};

			// Set same timestamp in both
			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(consentData));
			setCookie(STORAGE_KEY_V2, consentData);

			const retrieved = getConsentFromStorage();

			// Should return cookie data (always prioritized when both exist)
			expectConsentsToMatch(retrieved?.consents, consentData.consents);
			expect(retrieved?.consentInfo.time).toBe(consentData.consentInfo.time);
		});

		it('should prioritize cookie even when localStorage has consentInfo.time but cookie does not', () => {
			const consentWithoutTime = {
				consents: { necessary: true },
				// Missing consentInfo.time
			};

			const consentWithTime = {
				consents: { necessary: true, measurement: true },
				consentInfo: { time: 2000000000 },
			};

			// Set data with time in localStorage
			window.localStorage.setItem(
				STORAGE_KEY_V2,
				JSON.stringify(consentWithTime)
			);

			// Set data without time in cookie
			setCookie(STORAGE_KEY_V2, consentWithoutTime);

			const retrieved = getConsentFromStorage();

			// Should prefer cookie (always prioritized when both exist)
			expectConsentsToMatch(retrieved?.consents, consentWithoutTime.consents);
			expect(retrieved?.consentInfo).toBeUndefined();
		});

		it('should handle cross-subdomain scenario: cookie updated on app.example.com is read on example.com', () => {
			const consoleLogSpy = vi
				.spyOn(console, 'log')
				.mockImplementation(() => {});

			// Simulate: consent was set on example.com (older localStorage)
			const olderConsent = {
				consents: { necessary: true, measurement: false },
				consentInfo: { time: 1000000000 },
			};
			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(olderConsent));

			// Simulate: consent was updated on app.example.com (newer cookie shared across subdomains)
			const newerConsent = {
				consents: { necessary: true, measurement: true },
				consentInfo: { time: 2000000000 },
			};
			setCookie(STORAGE_KEY_V2, newerConsent);

			// Now reading on example.com with crossSubdomain enabled
			const config = { crossSubdomain: true };
			const retrieved = getConsentFromStorage(config);

			// Should return newer cookie data (shared across subdomains)
			expectConsentsToMatch(retrieved?.consents, newerConsent.consents);
			expect(retrieved?.consentInfo.time).toBe(newerConsent.consentInfo.time);

			// Should update localStorage with cookie data
			const updatedLS = JSON.parse(
				window.localStorage.getItem(STORAGE_KEY_V2) || '{}'
			);
			expectConsentsToMatch(updatedLS.consents, newerConsent.consents);
			expect(updatedLS.consentInfo.time).toBe(newerConsent.consentInfo.time);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				'[c15t] Updated localStorage with consent from cookie (cross-subdomain mode)'
			);

			consoleLogSpy.mockRestore();
		});
	});
});
