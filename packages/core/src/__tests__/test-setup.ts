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

// ─────────────────────────────────────────────────────────────────────────────
// LocalStorage Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock localStorage instance.
 */
export function createMockLocalStorage(): {
	storage: Map<string, string>;
	mock: Storage;
	cleanup: () => void;
} {
	const storage = new Map<string, string>();

	const mock: Storage = {
		getItem: vi.fn((key: string) => storage.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => {
			storage.set(key, value);
		}),
		removeItem: vi.fn((key: string) => {
			storage.delete(key);
		}),
		clear: vi.fn(() => {
			storage.clear();
		}),
		get length() {
			return storage.size;
		},
		key: vi.fn((index: number) => {
			const keys = Array.from(storage.keys());
			return keys[index] ?? null;
		}),
	};

	return {
		storage,
		mock,
		cleanup: () => {
			storage.clear();
			vi.clearAllMocks();
		},
	};
}

/**
 * Sets up localStorage mock on window.
 */
export function setupLocalStorageMock(initialData?: Record<string, string>): {
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
		value: mock,
		writable: true,
		configurable: true,
	});

	return { storage, cleanup };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cookie Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock document.cookie implementation.
 */
export function createMockCookies(): {
	cookies: Map<string, string>;
	getCookieString: () => string;
	cleanup: () => void;
} {
	const cookies = new Map<string, string>();

	const getCookieString = () => {
		return Array.from(cookies.entries())
			.map(([name, value]) => `${name}=${value}`)
			.join('; ');
	};

	return {
		cookies,
		getCookieString,
		cleanup: () => {
			cookies.clear();
		},
	};
}

/**
 * Sets up document.cookie mock.
 */
export function setupCookieMock(): {
	cookies: Map<string, string>;
	cleanup: () => void;
} {
	const { cookies, getCookieString, cleanup } = createMockCookies();

	let cookieValue = '';

	Object.defineProperty(document, 'cookie', {
		get: () => getCookieString(),
		set: (value: string) => {
			// Parse the cookie string
			const parts = value.split(';');
			const [nameValue] = parts;
			const [name, ...valueParts] = nameValue.split('=');
			const cookieVal = valueParts.join('=');

			// Check for expiry (deletion)
			const expiresMatch = value.match(/expires=([^;]+)/i);
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
			cookieValue = value;
		},
		configurable: true,
	});

	return { cookies, cleanup };
}

// ─────────────────────────────────────────────────────────────────────────────
// Consent State Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a default consent state (all false except necessary).
 */
export function createDefaultConsentState(): ConsentState {
	return {
		necessary: true,
		functionality: false,
		marketing: false,
		measurement: false,
		experience: false,
	};
}

/**
 * Creates a consent state with all consents granted.
 */
export function createAllGrantedConsentState(): ConsentState {
	return {
		necessary: true,
		functionality: true,
		marketing: true,
		measurement: true,
		experience: true,
	};
}

/**
 * Creates a consent state with all consents denied (except necessary).
 */
export function createAllDeniedConsentState(): ConsentState {
	return {
		necessary: true,
		functionality: false,
		marketing: false,
		measurement: false,
		experience: false,
	};
}

/**
 * Creates a custom consent state.
 */
export function createConsentState(
	overrides?: Partial<ConsentState>
): ConsentState {
	return {
		...createDefaultConsentState(),
		...overrides,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Consent Info Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates mock consent info.
 */
export function createMockConsentInfo(
	overrides?: Partial<ConsentInfo>
): ConsentInfo {
	return {
		time: Date.now(),
		type: 'custom',
		subjectId: 'test-subject-id-123',
		...overrides,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Stored Consent Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock stored consent object (as saved to localStorage/cookie).
 */
export function createMockStoredConsent(overrides?: {
	consents?: Partial<ConsentState>;
	consentInfo?: Partial<ConsentInfo>;
}) {
	return {
		consents: createConsentState(overrides?.consents),
		consentInfo: createMockConsentInfo(overrides?.consentInfo),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Clear Consent State
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clears all consent state from localStorage and cookies.
 */
export function clearConsentState(): void {
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Manager Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock ConsentManagerInterface for testing.
 */
export function createMockManager() {
	return {
		init: vi.fn().mockResolvedValue({
			ok: true,
			data: {
				jurisdiction: 'GDPR',
				location: { countryCode: 'DE', regionCode: null },
				translations: { language: 'en', translations: {} },
			},
		}),
		setConsent: vi.fn().mockResolvedValue({ ok: true, data: {} }),
		identifyUser: vi.fn().mockResolvedValue({ ok: true, data: {} }),
		$fetch: vi.fn().mockResolvedValue({ ok: true, data: {} }),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Mock Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock fetch function.
 */
export function createMockFetch(
	responses?: Array<{ status: number; data: unknown }>
) {
	const responseQueue = [...(responses || [])];
	let defaultResponse = { status: 200, data: {} };

	return vi.fn().mockImplementation(() => {
		const response = responseQueue.shift() || defaultResponse;
		return Promise.resolve(
			new Response(JSON.stringify(response.data), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' },
			})
		);
	});
}

/**
 * Sets up fetch mock globally.
 */
export function setupFetchMock(
	responses?: Array<{ status: number; data: unknown }>
) {
	const mockFetch = createMockFetch(responses);
	const originalFetch = globalThis.fetch;

	globalThis.fetch = mockFetch as typeof fetch;

	return {
		mockFetch,
		cleanup: () => {
			globalThis.fetch = originalFetch;
		},
	};
}

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
export async function flushPromises(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Waits for a condition to be true.
 */
export async function waitFor(
	condition: () => boolean,
	timeout = 1000
): Promise<void> {
	const start = Date.now();
	while (!condition()) {
		if (Date.now() - start > timeout) {
			throw new Error('Timeout waiting for condition');
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}
