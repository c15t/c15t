import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Script } from '../libs/script-loader';
import { updateScripts } from '../libs/script-loader/core';
import { loadedScripts } from '../libs/script-loader/utils';
import { createConsentManagerStore } from '../store';
import type { ConsentState } from '../types/compliance';

// Mock document.createElement and other DOM methods
const mockScriptElement = {
	id: '',
	src: '',
	fetchPriority: undefined as 'high' | 'low' | 'auto' | undefined,
	async: false,
	defer: false,
	nonce: '',
	addEventListener: vi.fn(),
	setAttribute: vi.fn(),
	remove: vi.fn(),
};

const mockHead = {
	appendChild: vi.fn(),
};

// Mock consent manager
const mockConsentManager = {
	fetchConsentBannerInfo: vi.fn().mockResolvedValue({
		showConsentBanner: true,
		jurisdiction: { code: 'GDPR', message: 'GDPR applies' },
		location: {
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
			jurisdictionMessage: 'GDPR applies',
		},
		branding: 'c15t',
	}),
	saveConsents: vi.fn().mockResolvedValue({ success: true }),
	setConsent: vi.fn().mockResolvedValue({ success: true }),
};

// Mock localStorage
vi.mock('vitest-localstorage-mock', () => {
	return {
		localStorage: {
			getItem: vi.fn(),
			setItem: vi.fn(),
			clear: vi.fn(),
		},
	};
});

// Mock the store's fetchConsentBannerInfo method
vi.mock('../libs/fetch-consent-banner', () => ({
	fetchConsentBannerInfo: vi.fn().mockResolvedValue({
		showConsentBanner: true,
		jurisdiction: { code: 'GDPR', message: 'GDPR applies' },
		location: {
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
			jurisdictionMessage: 'GDPR applies',
		},
		branding: 'c15t',
	}),
}));

describe('Store Script Loader Integration', () => {
	// Setup mocks before each test
	beforeEach(() => {
		// Mock document.createElement
		vi.spyOn(document, 'createElement').mockImplementation(() => {
			return { ...mockScriptElement } as unknown as HTMLScriptElement;
		});

		// Mock document.head
		Object.defineProperty(document, 'head', {
			value: mockHead,
			writable: true,
		});

		// Clear any scripts that might have been loaded in previous tests
		// Note: We don't mock Map here as it breaks the loadedScripts Map
		// Clear the loadedScripts Map
		loadedScripts.clear();

		// Clear localStorage
		localStorage.clear();

		// Reset mocks
		vi.clearAllMocks();
	});

	// Clean up after each test
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// Sample scripts for testing
	const scripts: Script[] = [
		{
			id: 'necessary-script',
			src: 'https://example.com/necessary.js',
			category: 'necessary',
		},
		{
			id: 'marketing-script',
			src: 'https://example.com/marketing.js',
			category: 'marketing',
		},
		{
			id: 'analytics-script',
			src: 'https://example.com/analytics.js',
			category: 'measurement',
		},
	];

	// Helper function to create a store with initial consents
	function createTestStore(initialConsents?: Partial<ConsentState>) {
		// Create store with mock consent manager
		const store = createConsentManagerStore(mockConsentManager, {
			config: {
				pkg: 'test',
				version: '1.0.0',
				mode: 'test',
			},
		});

		// Directly set consents in the store state
		if (initialConsents) {
			store.setState((state) => ({
				...state,
				consents: {
					...state.consents,
					...initialConsents,
				},
				selectedConsents: {
					...state.selectedConsents,
					...initialConsents,
				},
			}));
		}

		return store;
	}

	describe('Script Management in Store', () => {
		it('should add scripts to the store', () => {
			const store = createTestStore();

			// Add a script
			store.getState().setScripts([scripts[0]]);

			// Check that script was added
			expect(store.getState().scripts).toHaveLength(1);
			expect(store.getState().scripts[0].id).toBe('necessary-script');

			// Add multiple scripts
			store.getState().setScripts([scripts[1], scripts[2]]);

			// Check that scripts were added
			expect(store.getState().scripts).toHaveLength(3);
			expect(store.getState().scripts.map((s) => s.id)).toContain(
				'marketing-script'
			);
			expect(store.getState().scripts.map((s) => s.id)).toContain(
				'analytics-script'
			);
		});

		it('should remove scripts from the store', () => {
			const store = createTestStore();

			// Add scripts
			store.getState().setScripts(scripts);

			// Remove a script
			store.getState().removeScript('marketing-script');

			// Check that script was removed
			expect(store.getState().scripts).toHaveLength(2);
			expect(store.getState().scripts.map((s) => s.id)).not.toContain(
				'marketing-script'
			);
		});

		it('should update scripts based on consent changes', () => {
			const store = createTestStore({
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: false,
				experience: false,
			});

			// Add scripts
			store.getState().setScripts(scripts);

			// Update scripts based on current consent
			const state = store.getState();
			const result = state.updateScripts();

			// Since scripts are already loaded by setScripts, updateScripts should return empty arrays
			// but the scripts should be marked as loaded in the store
			expect(result.loaded).toEqual([]);
			expect(result.unloaded).toEqual([]);

			// Check that scripts are marked as loaded in the store
			expect(store.getState().loadedScripts['necessary-script']).toBe(true);
			expect(store.getState().loadedScripts['analytics-script']).toBe(true);
			expect(
				store.getState().loadedScripts['marketing-script']
			).toBeUndefined();
		});

		it('should check if scripts are loaded', () => {
			const store = createTestStore({
				necessary: true,
				marketing: false,
				functionality: false,
				measurement: false,
				experience: false,
			});

			// Add scripts
			store.getState().setScripts([scripts[0], scripts[1]]);

			// Update scripts
			const state = store.getState();
			const result = updateScripts(
				state.scripts || [],
				state.consents,
				state.scriptIdMap || {}
			);

			// Update loadedScripts state
			const newLoadedScripts = { ...state.loadedScripts };

			// Mark loaded scripts
			result.loaded.forEach((id) => {
				newLoadedScripts[id] = true;
			});

			// Mark unloaded scripts
			result.unloaded.forEach((id) => {
				newLoadedScripts[id] = false;
			});

			store.setState({ loadedScripts: newLoadedScripts });

			// Check if scripts are loaded
			expect(store.getState().isScriptLoaded('necessary-script')).toBe(true);
			expect(store.getState().isScriptLoaded('marketing-script')).toBe(false);

			// Get loaded script IDs
			const loadedIds = store.getState().getLoadedScriptIds();
			expect(loadedIds).toContain('necessary-script');
			expect(loadedIds).not.toContain('marketing-script');
		});
	});

	describe('Script Loading with Consent Changes', () => {
		it('should load and unload scripts when consent changes', () => {
			const store = createTestStore({
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			});

			// Add scripts
			store.getState().setScripts(scripts);

			// Update scripts initially
			const state = store.getState();
			const result = updateScripts(
				state.scripts || [],
				state.consents,
				state.scriptIdMap || {}
			);

			// Update loadedScripts state
			const newLoadedScripts = { ...state.loadedScripts };

			// Mark loaded scripts
			result.loaded.forEach((id) => {
				newLoadedScripts[id] = true;
			});

			// Mark unloaded scripts
			result.unloaded.forEach((id) => {
				newLoadedScripts[id] = false;
			});

			store.setState({ loadedScripts: newLoadedScripts });

			// Only necessary script should be loaded
			expect(store.getState().isScriptLoaded('necessary-script')).toBe(true);
			expect(store.getState().isScriptLoaded('analytics-script')).toBe(false);
			expect(store.getState().isScriptLoaded('marketing-script')).toBe(false);

			// Directly update consent state for measurement
			store.setState((state) => ({
				...state,
				consents: {
					...state.consents,
					measurement: true,
				},
				selectedConsents: {
					...state.selectedConsents,
					measurement: true,
				},
			}));

			// Update scripts
			const state2 = store.getState();
			const result2 = updateScripts(
				state2.scripts || [],
				state2.consents,
				state2.scriptIdMap || {}
			);

			// Update loadedScripts state
			const newLoadedScripts2 = { ...state2.loadedScripts };

			// Mark loaded scripts
			result2.loaded.forEach((id) => {
				newLoadedScripts2[id] = true;
			});

			// Mark unloaded scripts
			result2.unloaded.forEach((id) => {
				newLoadedScripts2[id] = false;
			});

			store.setState({ loadedScripts: newLoadedScripts2 });

			// Now analytics script should also be loaded
			expect(store.getState().isScriptLoaded('necessary-script')).toBe(true);
			expect(store.getState().isScriptLoaded('analytics-script')).toBe(true);
			expect(store.getState().isScriptLoaded('marketing-script')).toBe(false);

			// Directly update consent state to revoke necessary consent
			store.setState((state) => ({
				...state,
				consents: {
					...state.consents,
					necessary: false,
				},
				selectedConsents: {
					...state.selectedConsents,
					necessary: false,
				},
			}));

			// Update scripts
			const state3 = store.getState();
			const result3 = updateScripts(
				state3.scripts || [],
				state3.consents,
				state3.scriptIdMap || {}
			);

			// Update loadedScripts state
			const newLoadedScripts3 = { ...state3.loadedScripts };

			// Mark loaded scripts
			result3.loaded.forEach((id) => {
				newLoadedScripts3[id] = true;
			});

			// Mark unloaded scripts
			result3.unloaded.forEach((id) => {
				newLoadedScripts3[id] = false;
			});

			store.setState({ loadedScripts: newLoadedScripts3 });

			// Necessary script should be unloaded
			expect(store.getState().isScriptLoaded('necessary-script')).toBe(false);
			expect(store.getState().isScriptLoaded('analytics-script')).toBe(true);
		});

		it('should handle saveConsents affecting multiple script categories', () => {
			const store = createTestStore();

			// Add scripts
			store.getState().setScripts(scripts);

			// Directly set all consents to true
			store.setState((state) => ({
				...state,
				consents: {
					necessary: true,
					marketing: true,
					measurement: true,
					functionality: true,
					experience: true,
				},
				selectedConsents: {
					necessary: true,
					marketing: true,
					measurement: true,
					functionality: true,
					experience: true,
				},
				consentInfo: {
					time: Date.now(),
					type: 'all',
				},
			}));

			// Update scripts
			const state = store.getState();
			const result = updateScripts(
				state.scripts || [],
				state.consents,
				state.scriptIdMap || {}
			);

			// Update loadedScripts state
			const newLoadedScripts = { ...state.loadedScripts };

			// Mark loaded scripts
			result.loaded.forEach((id) => {
				newLoadedScripts[id] = true;
			});

			// Mark unloaded scripts
			result.unloaded.forEach((id) => {
				newLoadedScripts[id] = false;
			});

			store.setState({ loadedScripts: newLoadedScripts });

			// All scripts should be loaded
			expect(store.getState().isScriptLoaded('necessary-script')).toBe(true);
			expect(store.getState().isScriptLoaded('analytics-script')).toBe(true);
			expect(store.getState().isScriptLoaded('marketing-script')).toBe(true);

			// Directly set only necessary consent to true
			store.setState((state) => ({
				...state,
				consents: {
					necessary: true,
					marketing: false,
					measurement: false,
					functionality: false,
					experience: false,
				},
				selectedConsents: {
					necessary: true,
					marketing: false,
					measurement: false,
					functionality: false,
					experience: false,
				},
				consentInfo: {
					time: Date.now(),
					type: 'necessary',
				},
			}));

			// Update scripts
			const state2 = store.getState();
			const result2 = updateScripts(
				state2.scripts || [],
				state2.consents,
				state2.scriptIdMap || {}
			);

			// Update loadedScripts state
			const newLoadedScripts2 = { ...state2.loadedScripts };

			// Mark loaded scripts
			result2.loaded.forEach((id) => {
				newLoadedScripts2[id] = true;
			});

			// Mark unloaded scripts
			result2.unloaded.forEach((id) => {
				newLoadedScripts2[id] = false;
			});

			store.setState({ loadedScripts: newLoadedScripts2 });

			// Only necessary script should remain loaded
			expect(store.getState().isScriptLoaded('necessary-script')).toBe(true);
			expect(store.getState().isScriptLoaded('analytics-script')).toBe(false);
			expect(store.getState().isScriptLoaded('marketing-script')).toBe(false);
		});
	});
});
