import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsentManagerInterface } from '../client/client-factory';
import { createConsentManagerStore } from '../store';

// Mock DOM APIs needed by the store
Object.defineProperty(global, 'document', {
	value: {
		querySelectorAll: vi.fn().mockReturnValue([]),
		cookie: '',
	},
	writable: true,
});

const createMockConsentManager = (): ConsentManagerInterface => ({
	showConsentBanner: vi.fn(),
	setConsent: vi.fn(),
	verifyConsent: vi.fn(),
	identifyUser: vi.fn(),
	$fetch: vi.fn(),
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
			region: 'BE',
			language: 'de',
		};

		store.getState().setOverrides(overrides);

		expect(store.getState().overrides).toEqual(overrides);
	});

	it('should merge partial overrides with existing overrides', () => {
		// Set initial overrides
		store.getState().setOverrides({
			country: 'DE',
			region: 'BE',
			language: 'de',
		});

		// Update only country
		store.getState().setOverrides({
			country: 'FR',
		});

		expect(store.getState().overrides).toEqual({
			country: 'FR',
			region: 'BE',
			language: 'de',
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
			region: 'BE',
			language: 'de',
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
