import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Script } from '../libs/script-loader';
import { updateScripts } from '../libs/script-loader/core';
import { clearLoadedScripts } from '../libs/script-loader/utils';
import { createConsentManagerStore } from '../store';
import type { ConsentState } from '../types/compliance';

// Mock document.createElement and other DOM methods
const mockScriptElement = {
	addEventListener: vi.fn(),
	async: false,
	defer: false,
	fetchPriority: undefined as 'high' | 'low' | 'auto' | undefined,
	id: '',
	nonce: '',
	remove: vi.fn(),
	setAttribute: vi.fn(),
	src: '',
};

const mockHead = {
	appendChild: vi.fn(),
};

// Mock consent manager
const mockConsentManager = {
	fetchConsentBannerInfo: vi.fn().mockResolvedValue({
		branding: 'c15t',
		jurisdiction: { code: 'GDPR', message: 'GDPR applies' },
		location: {
			countryCode: 'DE',
			jurisdiction: 'GDPR',
			jurisdictionMessage: 'GDPR applies',
			regionCode: null,
		},
		showConsentBanner: true,
	}),
	saveConsents: vi.fn().mockResolvedValue({ success: true }),
	setConsent: vi.fn().mockResolvedValue({ success: true }),
};

describe('Store Script Loader Integration', () => {
	// Setup mocks before each test
	beforeEach(() => {
		// Mock document.createElement
		vi.spyOn(document, 'createElement').mockImplementation(
			() => ({ ...mockScriptElement }) as unknown as HTMLScriptElement
		);

		// Mock document.head
		Object.defineProperty(document, 'head', {
			configurable: true,
			value: mockHead,
			writable: true,
		});

		// Mock document.querySelectorAll for iframe blocker
		Object.defineProperty(document, 'querySelectorAll', {
			configurable: true,
			value: vi.fn().mockReturnValue([]),
			writable: true,
		});

		// Mock document.body for mutation observer
		Object.defineProperty(document, 'body', {
			configurable: true,
			value: {
				appendChild: vi.fn(),
				removeChild: vi.fn(),
			},
			writable: true,
		});

		// Mock MutationObserver as a constructor class
		global.MutationObserver = class MutationObserver {
			observe = vi.fn();
			disconnect = vi.fn();
			takeRecords = vi.fn().mockReturnValue([]);
		} as unknown as typeof MutationObserver;

		// Clear any scripts that might have been loaded in previous tests
		// Note: We don't mock Map here as it breaks the loadedScripts Map
		// Clear the loadedScripts Map
		clearLoadedScripts();

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
			category: 'necessary',
			id: 'necessary-script',
			src: 'https://example.com/necessary.js',
		},
		{
			category: 'marketing',
			id: 'marketing-script',
			src: 'https://example.com/marketing.js',
		},
		{
			category: 'measurement',
			id: 'analytics-script',
			src: 'https://example.com/analytics.js',
		},
		{
			alwaysLoad: true,
			category: 'measurement',
			id: 'gtm-script',
			src: 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXX',
		},
	];

	// Helper function to create a store with initial consents
	const createTestStore = function createTestStore(
		initialConsents?: Partial<ConsentState>
	) {
		// Create store with mock consent manager
		const store = createConsentManagerStore(mockConsentManager, {
			config: {
				mode: 'test',
				pkg: 'test',
				version: '1.0.0',
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
	};

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
			// Updated: now includes gtm-script
			expect(store.getState().scripts).toHaveLength(3);
			expect(store.getState().scripts.map((s) => s.id)).not.toContain(
				'marketing-script'
			);
		});

		it('should update scripts based on consent changes', () => {
			const store = createTestStore({
				experience: false,
				functionality: false,
				marketing: false,
				measurement: true,
				necessary: true,
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
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
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

		it('should respect denied out-of-policy category scripts in permissive scope', () => {
			const store = createTestStore({
				experience: false,
				functionality: false,
				marketing: false,
				measurement: true,
				necessary: true,
			});

			store.setState({
				policyCategories: ['necessary', 'measurement'],
				policyScopeMode: 'permissive',
			});

			store.getState().setScripts([scripts[1]]);

			expect(store.getState().consentCategories).toContain('marketing');
			expect(store.getState().isScriptLoaded('marketing-script')).toBe(false);
			expect(store.getState().loadedScripts['marketing-script']).not.toBe(true);
		});
	});

	describe('Script Loading with Consent Changes', () => {
		it('should load and unload scripts when consent changes', () => {
			const store = createTestStore({
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
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
			store.setState((stateLocal) => ({
				...stateLocal,
				consents: {
					...stateLocal.consents,
					measurement: true,
				},
				selectedConsents: {
					...stateLocal.selectedConsents,
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
			store.setState((stateLocal) => ({
				...stateLocal,
				consents: {
					...stateLocal.consents,
					necessary: false,
				},
				selectedConsents: {
					...stateLocal.selectedConsents,
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
				consentInfo: {
					time: Date.now(),
					type: 'all',
				},
				consents: {
					experience: true,
					functionality: true,
					marketing: true,
					measurement: true,
					necessary: true,
				},
				selectedConsents: {
					experience: true,
					functionality: true,
					marketing: true,
					measurement: true,
					necessary: true,
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
			store.setState((stateLocal) => ({
				...stateLocal,
				consentInfo: {
					time: Date.now(),
					type: 'necessary',
				},
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				selectedConsents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
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

	describe('Always Load Scripts', () => {
		it('should load scripts with alwaysLoad=true regardless of consent', () => {
			const store = createTestStore({
				experience: false,
				functionality: false,
				marketing: false,
				// GTM script requires measurement but has alwaysLoad
				measurement: false,
				necessary: true,
			});

			// Add scripts including GTM with alwaysLoad
			store.getState().setScripts(scripts);

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

			// GTM script should be loaded even though measurement consent is false
			expect(store.getState().isScriptLoaded('gtm-script')).toBe(true);
			expect(store.getState().isScriptLoaded('necessary-script')).toBe(true);
			expect(store.getState().isScriptLoaded('analytics-script')).toBe(false);
		});

		it('should never unload scripts with alwaysLoad=true when consent is revoked', () => {
			const store = createTestStore({
				experience: false,
				functionality: false,
				marketing: false,
				measurement: true,
				necessary: true,
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

			store.setState({ loadedScripts: newLoadedScripts });

			// Both GTM and analytics should be loaded
			expect(store.getState().isScriptLoaded('gtm-script')).toBe(true);
			expect(store.getState().isScriptLoaded('analytics-script')).toBe(true);

			// Revoke measurement consent
			store.setState((stateLocal) => ({
				...stateLocal,
				consents: {
					...stateLocal.consents,
					measurement: false,
				},
				selectedConsents: {
					...stateLocal.selectedConsents,
					measurement: false,
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

			// Mark unloaded scripts
			result2.unloaded.forEach((id) => {
				newLoadedScripts2[id] = false;
			});

			store.setState({ loadedScripts: newLoadedScripts2 });

			// GTM script should still be loaded (alwaysLoad=true)
			// but analytics script should be unloaded
			expect(store.getState().isScriptLoaded('gtm-script')).toBe(true);
			expect(store.getState().isScriptLoaded('analytics-script')).toBe(false);
		});
	});

	describe('CSP nonce', () => {
		const createStoreWithNonce = function createStoreWithNonce(nonce?: string) {
			const store = createConsentManagerStore(mockConsentManager, {
				config: { mode: 'test', pkg: 'test', version: '1.0.0' },
				nonce,
			});

			store.setState((state) => ({
				...state,
				consents: { ...state.consents, necessary: true },
				selectedConsents: { ...state.selectedConsents, necessary: true },
			}));

			return store;
		};

		const lastCreatedScriptElement = function lastCreatedScriptElement() {
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: { value: HTMLScriptElement }[] };
			};
			const { results } = mockCreateElement.mock;

			return results[results.length - 1]?.value;
		};

		it('applies the store-level nonce to injected script elements', () => {
			const store = createStoreWithNonce('store-nonce');

			store.getState().setScripts([scripts[0]]);

			expect(lastCreatedScriptElement()?.nonce).toBe('store-nonce');
		});

		it('lets a per-script nonce override the store-level nonce', () => {
			const store = createStoreWithNonce('store-nonce');

			store.getState().setScripts([{ ...scripts[0], nonce: 'script-nonce' }]);

			expect(lastCreatedScriptElement()?.nonce).toBe('script-nonce');
		});

		it('leaves the nonce unset when the store has none', () => {
			const store = createStoreWithNonce();

			store.getState().setScripts([scripts[0]]);

			expect(lastCreatedScriptElement()?.nonce).toBe('');
		});

		it('applies the store-level nonce when reloading a script', () => {
			const store = createStoreWithNonce('store-nonce');

			store.getState().setScripts([scripts[0]]);
			store.getState().reloadScript('necessary-script');

			// reloadScript recreates the element, so the most recent one must
			// still carry the nonce.
			expect(lastCreatedScriptElement()?.nonce).toBe('store-nonce');
		});
	});
});
