/**
 * Test setup and utilities for core package tests.
 *
 * This file provides:
 * - Mock factories for localStorage, cookies, and document
 * - Common test fixtures for consent state
 * - Cleanup utilities
 *
 * @packageDocumentation
 */

import { vi } from 'vitest';

import type { ConsentInfo, ConsentState } from '../types';
import type { AllConsentNames } from '../types/consent-types';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

// ─────────────────────────────────────────────────────────────────────────────
// LocalStorage Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock localStorage instance.
 */
export const createMockLocalStorage = function createMockLocalStorage(): {
	storage: Map<string, string>;
	mock: Storage;
	cleanup: () => void;
} {
	const storage = new Map<string, string>();

	const mock: Storage = {
		clear: vi.fn(() => {
			storage.clear();
		}),
		getItem: vi.fn((key: string) => storage.get(key) ?? null),
		key: vi.fn((index: number) => {
			const keys = Array.from(storage.keys());
			return keys[index] ?? null;
		}),
		get length() {
			return storage.size;
		},
		removeItem: vi.fn((key: string) => {
			storage.delete(key);
		}),
		setItem: vi.fn((key: string, value: string) => {
			storage.set(key, value);
		}),
	};

	return {
		cleanup: () => {
			storage.clear();
			vi.clearAllMocks();
		},
		mock,
		storage,
	};
};

/**
 * Sets up localStorage mock on window.
 */
export const setupLocalStorageMock = function setupLocalStorageMock(
	initialData?: Record<string, string>
): {
	storage: Map<string, string>;
	cleanup: () => void;
} {
	const { storage, mock, cleanup } = createMockLocalStorage();

	if (initialData) {
		for (const [key, value] of Object.entries(initialData)) {
			storage.set(key, value);
		}
	}

	Object.defineProperty(window, 'localStorage', {
		configurable: true,
		value: mock,
		writable: true,
	});

	return { cleanup, storage };
};

// ─────────────────────────────────────────────────────────────────────────────
// Cookie Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

export const createMockCookies = function createMockCookies(): {
	cookies: Map<string, string>;
	getCookieString: () => string;
	cleanup: () => void;
} {
	const cookies = new Map<string, string>();

	const getCookieString = () =>
		Array.from(cookies.entries())
			.map(([name, value]) => `${name}=${value}`)
			.join('; ');

	return {
		cleanup: () => {
			cookies.clear();
		},
		cookies,
		getCookieString,
	};
};

/**
 * Sets up document.cookie mock.
 */
export const setupCookieMock = function setupCookieMock(): {
	cookies: Map<string, string>;
	cleanup: () => void;
} {
	const { cookies, getCookieString, cleanup } = createMockCookies();

	Object.defineProperty(document, 'cookie', {
		configurable: true,
		get: () => getCookieString(),
		set: (value: string) => {
			// Parse the cookie string
			const parts = value.split(';');
			const [nameValue] = parts;
			const [name, ...valueParts] = nameValue.split('=');
			const cookieVal = valueParts.join('=');

			// Check for expiry (deletion)
			const expiresMatch = value.match(/expires=(?<date>[^;]+)/iu);
			if (expiresMatch) {
				const expiresDate = new Date(expiresMatch[1]);
				if (expiresDate < new Date()) {
					cookies.delete(name.trim());
					return;
				}
			}

			if (cookieVal) {
				cookies.set(name.trim(), cookieVal);
			}
		},
	});

	return { cleanup, cookies };
};

// ─────────────────────────────────────────────────────────────────────────────
// Consent State Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const createDefaultConsentState =
	function createDefaultConsentState(): ConsentState {
		return {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		};
	};

export const createAllGrantedConsentState =
	function createAllGrantedConsentState(): ConsentState {
		return {
			experience: true,
			functionality: true,
			marketing: true,
			measurement: true,
			necessary: true,
		};
	};

export const createAllDeniedConsentState =
	function createAllDeniedConsentState(): ConsentState {
		return {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		};
	};

export const createConsentState = function createConsentState(
	overrides?: Partial<ConsentState>
): ConsentState {
	return {
		...createDefaultConsentState(),
		...overrides,
	};
};

// ─────────────────────────────────────────────────────────────────────────────
// Consent Info Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates mock consent info.
 */
export const createMockConsentInfo = function createMockConsentInfo(
	overrides?: Partial<ConsentInfo>
): ConsentInfo {
	return {
		subjectId: 'test-subject-id-123',
		time: Date.now(),
		type: 'custom',
		...overrides,
	};
};

// ─────────────────────────────────────────────────────────────────────────────
// Stored Consent Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock stored consent object (as saved to localStorage/cookie).
 */
export const createMockStoredConsent =
	function createMockStoredConsent(overrides?: {
		consents?: Partial<ConsentState>;
		consentInfo?: Partial<ConsentInfo>;
	}) {
		return {
			consentInfo: createMockConsentInfo(overrides?.consentInfo),
			consents: createConsentState(overrides?.consents),
		};
	};

// ─────────────────────────────────────────────────────────────────────────────
// Clear Consent State
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clears all consent state from localStorage and cookies.
 */
export const clearConsentState = function clearConsentState(): void {
	// Clear localStorage
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			window.localStorage.removeItem('c15t');
			window.localStorage.removeItem('privacy-consent-storage');
		}
	} catch {
		// Ignore errors
	}

	// Clear cookies
	try {
		if (typeof document !== 'undefined') {
			document.cookie = 'c15t=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
			document.cookie =
				'privacy-consent-storage=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
		}
	} catch {
		// Ignore errors
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock Manager Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock ConsentManagerInterface for testing.
 */
export const createMockManager = function createMockManager() {
	return {
		$fetch: vi.fn().mockResolvedValue({ data: {}, ok: true }),
		identifyUser: vi.fn().mockResolvedValue({ data: {}, ok: true }),
		init: vi.fn().mockResolvedValue({
			data: {
				jurisdiction: 'GDPR',
				location: { countryCode: 'DE', regionCode: null },
				translations: { language: 'en', translations: {} },
			},
			ok: true,
		}),
		setConsent: vi.fn().mockResolvedValue({ data: {}, ok: true }),
	};
};

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Mock Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock fetch function.
 */
export const createMockFetch = function createMockFetch(
	responses?: { status: number; data: unknown }[]
) {
	const responseQueue = [...(responses || [])];
	const defaultResponse = { data: {}, status: 200 };

	return vi.fn().mockImplementation(() => {
		const response = responseQueue.shift() || defaultResponse;
		return Promise.resolve(
			new Response(JSON.stringify(response.data), {
				headers: { 'Content-Type': 'application/json' },
				status: response.status,
			})
		);
	});
};

export const setupFetchMock = function setupFetchMock(
	responses?: { status: number; data: unknown }[]
) {
	const mockFetch = createMockFetch(responses);
	const originalFetch = globalThis.fetch;

	globalThis.fetch = mockFetch as typeof fetch;

	return {
		cleanup: () => {
			globalThis.fetch = originalFetch;
		},
		mockFetch,
	};
};

// ─────────────────────────────────────────────────────────────────────────────
// Consent Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All consent category names for testing.
 */
export const testConsentNames: AllConsentNames[] = [
	'necessary',
	'functionality',
	'marketing',
	'measurement',
	'experience',
];

// ─────────────────────────────────────────────────────────────────────────────
// Test Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Waits for all pending promises to resolve.
 */
export const flushPromises = async function flushPromises(): Promise<void> {
	await createDeferredPromise((resolve) => setTimeout(resolve, 0));
};

export const waitFor = async function waitFor(
	condition: () => boolean,
	timeout = 1000
): Promise<void> {
	const start = Date.now();
	const poll = async (): Promise<void> => {
		if (condition()) {
			return;
		}
		if (Date.now() - start > timeout) {
			throw new Error('Timeout waiting for condition');
		}
		await createDeferredPromise((resolve) => setTimeout(resolve, 10));
		await poll();
	};

	await poll();
};
