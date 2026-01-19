import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hasGlobalPrivacyControlSignal } from './global-privacy-control';

describe('hasGlobalPrivacyControlSignal', () => {
	let originalWindow: typeof window | undefined;

	beforeEach(() => {
		// Preserve the original window so we can safely override it per test
		// without leaking global state across tests.
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (typeof window !== 'undefined') {
			originalWindow = window;
		} else {
			originalWindow = undefined;
		}
	});

	afterEach(() => {
		// Restore the original window reference after each test
		if (originalWindow !== undefined) {
			globalThis.window = originalWindow;
		} else {
			// @ts-expect-error - In some environments window might not exist
			// and we want to clean up any window we created.
			delete (globalThis as typeof globalThis & { window?: unknown }).window;
		}
	});

	it('returns false when window is undefined (server-side environment)', () => {
		// Simulate a server-side environment where window is not available
		// @ts-expect-error - We intentionally delete the global window
		delete (globalThis as typeof globalThis & { window?: unknown }).window;

		const result = hasGlobalPrivacyControlSignal(true);

		expect(result).toBe(false);
	});

	it('returns true when navigator.globalPrivacyControl is boolean true', () => {
		const mockNavigator = {
			globalPrivacyControl: true,
		} as Navigator & { globalPrivacyControl?: boolean | string };

		// Provide a minimal window implementation with the mocked navigator
		const mockWindow = { navigator: mockNavigator } as unknown as Window;

		// @ts-expect-error - We intentionally override the global window
		globalThis.window = mockWindow;

		const result = hasGlobalPrivacyControlSignal(true);

		expect(result).toBe(true);
	});

	it('returns true when navigator.globalPrivacyControl is string "1"', () => {
		const mockNavigator = {
			globalPrivacyControl: '1',
		} as Navigator & { globalPrivacyControl?: boolean | string };

		const mockWindow = { navigator: mockNavigator } as unknown as Window;

		// @ts-expect-error - We intentionally override the global window
		globalThis.window = mockWindow;

		const result = hasGlobalPrivacyControlSignal(true);

		expect(result).toBe(true);
	});

	it('returns false for other values or when the flag is missing', () => {
		const mockNavigator = {
			globalPrivacyControl: false,
		} as Navigator & { globalPrivacyControl?: boolean | string };

		const mockWindow = { navigator: mockNavigator } as unknown as Window;

		// @ts-expect-error - We intentionally override the global window
		globalThis.window = mockWindow;

		const resultFalse = hasGlobalPrivacyControlSignal(true);

		expect(resultFalse).toBe(false);

		// Now simulate the flag being completely absent
		const mockNavigatorWithoutFlag: Navigator = {} as Navigator;
		const mockWindowWithoutFlag = {
			navigator: mockNavigatorWithoutFlag,
		} as unknown as Window;

		// @ts-expect-error - We intentionally override the global window
		globalThis.window = mockWindowWithoutFlag;

		const resultMissing = hasGlobalPrivacyControlSignal(true);

		expect(resultMissing).toBe(false);
	});

	it('returns false if reading navigator.globalPrivacyControl throws', () => {
		// Provide a navigator accessor that throws when accessed to exercise
		// the defensive try/catch path in the helper.
		const throwingWindow = {} as Window;

		Object.defineProperty(throwingWindow, 'navigator', {
			get() {
				throw new Error('navigator access error');
			},
		});

		// @ts-expect-error - We intentionally override the global window
		globalThis.window = throwingWindow;

		const result = hasGlobalPrivacyControlSignal(true);

		expect(result).toBe(false);
	});
});
