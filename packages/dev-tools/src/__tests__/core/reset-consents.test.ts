import type { ConsentStoreState } from '@c15t/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';

import { resetAllConsents } from '../../core/reset-consents';
import type { StateManager } from '../../core/state-manager';

// Mock store
const createMockStore = function createMockStore() {
	const mockState = {
		initConsentManager: vi.fn().mockResolvedValue(undefined),
		resetConsents: vi.fn(),
	};

	return {
		getInitialState: vi.fn(() => mockState),
		getState: vi.fn(() => mockState),
		mockState,
		setState: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
	} as unknown as StoreApi<ConsentStoreState> & {
		mockState: typeof mockState;
	};
};

// Mock state manager
const createMockStateManager = function createMockStateManager(): StateManager {
	return {
		addEvent: vi.fn(),
		clearEventLog: vi.fn(),
		destroy: vi.fn(),
		getState: vi.fn(() => ({
			activeTab: 'consents' as const,
			eventLog: [],
			isConnected: true,
			isOpen: false,
			maxEventLogSize: 100,

			position: 'bottom-right' as const,
		})),
		setActiveTab: vi.fn(),
		setConnected: vi.fn(),
		setOpen: vi.fn(),
		setPosition: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
		toggle: vi.fn(),
	};
};

describe('resetAllConsents', () => {
	let mockLocalStorage: Record<string, string>;
	let mockCookies: string;

	beforeEach(() => {
		// Reset localStorage mock
		mockLocalStorage = {};
		vi.stubGlobal('localStorage', {
			clear: vi.fn(() => {
				mockLocalStorage = {};
			}),
			getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
			removeItem: vi.fn((key: string) => {
				Reflect.deleteProperty(mockLocalStorage, key);
			}),
			setItem: vi.fn((key: string, value: string) => {
				mockLocalStorage[key] = value;
			}),
		});

		// Reset cookie mock
		mockCookies = '';
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => mockCookies,
			set: (value: string) => {
				mockCookies = value;
			},
		});
	});

	it('should call resetConsents on the store', async () => {
		const store = createMockStore();
		await resetAllConsents(store);

		expect(store.mockState.resetConsents).toHaveBeenCalled();
	});

	it('should call initConsentManager to reset IAB state', async () => {
		const store = createMockStore();
		await resetAllConsents(store);

		expect(store.mockState.initConsentManager).toHaveBeenCalled();
	});

	it('should clear cookies by setting them to expired', async () => {
		const cookiesSet: string[] = [];
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => cookiesSet.join('; '),
			set: (value: string) => {
				cookiesSet.push(value);
			},
		});

		const store = createMockStore();
		await resetAllConsents(store);

		// Both cookies should be cleared with expiration in the past
		expect(cookiesSet.some((c) => c.startsWith('c15t='))).toBe(true);
		expect(cookiesSet.some((c) => c.startsWith('euconsent-v2='))).toBe(true);
		expect(
			cookiesSet.every((c) => c.includes('expires=Thu, 01 Jan 1970'))
		).toBe(true);
	});

	it('should remove localStorage entries', async () => {
		// Set up localStorage with data
		mockLocalStorage.c15t = 'test';
		mockLocalStorage['c15t:pending-consent-sync'] = 'test';
		mockLocalStorage['c15t-pending-consent-submissions'] = 'test';
		mockLocalStorage['euconsent-v2'] = 'test';

		const store = createMockStore();
		await resetAllConsents(store);

		expect(localStorage.removeItem).toHaveBeenCalledWith('c15t');
		expect(localStorage.removeItem).toHaveBeenCalledWith(
			'c15t:pending-consent-sync'
		);
		expect(localStorage.removeItem).toHaveBeenCalledWith(
			'c15t-pending-consent-submissions'
		);
		expect(localStorage.removeItem).toHaveBeenCalledWith('euconsent-v2');
	});

	it('should log event when stateManager is provided', async () => {
		const store = createMockStore();
		const stateManager = createMockStateManager();

		await resetAllConsents(store, stateManager);

		expect(stateManager.addEvent).toHaveBeenCalledWith({
			message: 'All consents reset (storage cleared)',
			type: 'consent_reset',
		});
	});

	it('should not log event when stateManager is not provided', async () => {
		const store = createMockStore();

		await resetAllConsents(store);

		// No error should be thrown
	});

	it('should handle localStorage being unavailable', async () => {
		// Simulate localStorage throwing an error
		vi.stubGlobal('localStorage', {
			removeItem: vi.fn(() => {
				throw new Error('localStorage not available');
			}),
		});

		const store = createMockStore();

		// Should not throw
		await expect(resetAllConsents(store)).resolves.not.toThrow();
	});
});
