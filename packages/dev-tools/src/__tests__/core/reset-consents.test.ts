import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAllConsents } from '../../core/reset-consents';
import type { StateManager } from '../../core/state-manager';

// Mock store
function createMockStore() {
	const mockState = {
		resetConsents: vi.fn(),
		initConsentManager: vi.fn().mockResolvedValue(undefined),
	};

	return {
		getState: vi.fn(() => mockState),
		mockState,
	};
}

// Mock state manager
function createMockStateManager(): StateManager {
	return {
		getState: vi.fn(() => ({
			isOpen: false,
			position: 'bottom-right' as const,
			activeTab: 'consents' as const,
			isConnected: true,
			eventLog: [],
			maxEventLogSize: 100,
		})),
		subscribe: vi.fn(() => vi.fn()),
		setOpen: vi.fn(),
		toggle: vi.fn(),
		setPosition: vi.fn(),
		setActiveTab: vi.fn(),
		setConnected: vi.fn(),
		addEvent: vi.fn(),
		clearEventLog: vi.fn(),
		destroy: vi.fn(),
	};
}

describe('resetAllConsents', () => {
	let mockLocalStorage: Record<string, string>;
	let mockCookies: string;

	beforeEach(() => {
		// Reset localStorage mock
		mockLocalStorage = {};
		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
			setItem: vi.fn((key: string, value: string) => {
				mockLocalStorage[key] = value;
			}),
			removeItem: vi.fn((key: string) => {
				delete mockLocalStorage[key];
			}),
			clear: vi.fn(() => {
				mockLocalStorage = {};
			}),
		});

		// Reset cookie mock
		mockCookies = '';
		Object.defineProperty(document, 'cookie', {
			get: () => mockCookies,
			set: (value: string) => {
				mockCookies = value;
			},
			configurable: true,
		});
	});

	it('should call resetConsents on the store', async () => {
		const store = createMockStore();
		// @ts-expect-error - mock store
		await resetAllConsents(store);

		expect(store.mockState.resetConsents).toHaveBeenCalled();
	});

	it('should call initConsentManager to reset IAB state', async () => {
		const store = createMockStore();
		// @ts-expect-error - mock store
		await resetAllConsents(store);

		expect(store.mockState.initConsentManager).toHaveBeenCalled();
	});

	it('should clear cookies by setting them to expired', async () => {
		const cookiesSet: string[] = [];
		Object.defineProperty(document, 'cookie', {
			get: () => cookiesSet.join('; '),
			set: (value: string) => {
				cookiesSet.push(value);
			},
			configurable: true,
		});

		const store = createMockStore();
		// @ts-expect-error - mock store
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
		// @ts-expect-error - mock store
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

		// @ts-expect-error - mock store
		await resetAllConsents(store, stateManager);

		expect(stateManager.addEvent).toHaveBeenCalledWith({
			type: 'consent_reset',
			message: 'All consents reset (storage cleared)',
		});
	});

	it('should not log event when stateManager is not provided', async () => {
		const store = createMockStore();

		// @ts-expect-error - mock store
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
		// @ts-expect-error - mock store
		await expect(resetAllConsents(store)).resolves.not.toThrow();
	});
});
