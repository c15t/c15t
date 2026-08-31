import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConsentManagerInterface } from '../client/client-factory';
import { createConsentManagerStore } from '../store';

// Mock DOM APIs needed by the store
Object.defineProperty(global, 'document', {
	value: {
		addEventListener: vi.fn(),
		body: {
			appendChild: vi.fn(),
			removeChild: vi.fn(),
		},
		cookie: '',
		querySelectorAll: vi.fn().mockReturnValue([]),
		readyState: 'complete',
	},
	writable: true,
});

// Mock MutationObserver
if (typeof global.MutationObserver === 'undefined') {
	global.MutationObserver = class MutationObserver {
		// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
		observe(_target: Node, _options?: MutationObserverInit) {
			// Mock implementation
		}

		// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
		disconnect() {
			// Mock implementation
		}

		// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
		takeRecords(): MutationRecord[] {
			return [];
		}
	} as typeof MutationObserver;
}

const createMockConsentManager = (): ConsentManagerInterface => ({
	$fetch: vi.fn(),
	identifyUser: vi.fn(),
	init: vi.fn(),
	setConsent: vi.fn(),
	verifyConsent: vi.fn(),
});

describe('Store setOverrides', () => {
	let store: ReturnType<typeof createConsentManagerStore>;
	let mockManager: ConsentManagerInterface;

	beforeEach(() => {
		mockManager = createMockConsentManager();
		store = createConsentManagerStore(mockManager);
	});

	it('should set overrides when called', () => {
		const overrides = {
			country: 'DE',
			language: 'de',
			region: 'BE',
		};

		store.getState().setOverrides(overrides);

		expect(store.getState().overrides).toEqual(overrides);
	});

	it('should merge partial overrides with existing overrides', () => {
		// Set initial overrides
		store.getState().setOverrides({
			country: 'DE',
			language: 'de',
			region: 'BE',
		});

		// Update only country
		store.getState().setOverrides({
			country: 'FR',
		});

		expect(store.getState().overrides).toEqual({
			country: 'FR',
			language: 'de',
			region: 'BE',
		});
	});

	it('should handle undefined overrides initially', () => {
		expect(store.getState().overrides).toBeUndefined();
	});

	it('should allow setting only country', () => {
		store.getState().setOverrides({
			country: 'US',
		});

		expect(store.getState().overrides).toEqual({
			country: 'US',
		});
	});

	it('should allow setting only region', () => {
		store.getState().setOverrides({
			region: 'CA',
		});

		expect(store.getState().overrides).toEqual({
			region: 'CA',
		});
	});

	it('should allow setting only language', () => {
		store.getState().setOverrides({
			language: 'fr',
		});

		expect(store.getState().overrides).toEqual({
			language: 'fr',
		});
	});

	it('should merge multiple partial updates', () => {
		// First update
		store.getState().setOverrides({
			country: 'DE',
		});

		// Second update
		store.getState().setOverrides({
			region: 'BE',
		});

		// Third update
		store.getState().setOverrides({
			language: 'de',
		});

		expect(store.getState().overrides).toEqual({
			country: 'DE',
			language: 'de',
			region: 'BE',
		});
	});

	it('should overwrite existing values when updating', () => {
		store.getState().setOverrides({
			country: 'DE',
			language: 'de',
		});

		store.getState().setOverrides({
			country: 'FR',
			language: 'fr',
		});
		expect(store.getState().overrides).toEqual({
			country: 'FR',
			language: 'fr',
		});
	});
});
