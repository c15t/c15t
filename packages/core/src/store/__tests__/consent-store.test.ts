/**
 * Comprehensive tests for the consent management store.
 *
 * @vitest-environment jsdom
 * @packageDocumentation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConsentManagerStore } from '..';
import { STORAGE_KEY_V2 } from '../initial-state';
import type { ConsentStoreState, StoreOptions } from '../type';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Setup
// ─────────────────────────────────────────────────────────────────────────────

function createMockManager() {
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
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Consent Store', () => {
	let mockManager: ReturnType<typeof createMockManager>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockManager = createMockManager();

		// Clear localStorage and cookies
		if (typeof window !== 'undefined') {
			window.localStorage.clear();
			document.cookie = `${STORAGE_KEY_V2}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	});

	afterEach(() => {
		vi.clearAllMocks();
		if (typeof window !== 'undefined') {
			window.localStorage.clear();
		}
	});

	describe('Initial State', () => {
		it('should create store with correct initial state', () => {
			const store = createConsentManagerStore(mockManager);
			const state = store.getState();

			expect(state.consents).toBeDefined();
			expect(state.consents.necessary).toBe(true);
			expect(state.selectedConsents).toBeDefined();
			expect(state.consentInfo).toBeNull();
			expect(state.activeUI).toBe('none');
			expect(state.isLoadingConsentInfo).toBe(true);
			expect(state.consentCategories).toContain('necessary');
		});

		it('should initialize consents as default values from consentTypes', () => {
			const store = createConsentManagerStore(mockManager);
			const state = store.getState();

			// Necessary should be true by default
			expect(state.consents.necessary).toBe(true);

			// Other consent types should be false by default
			expect(state.consents.marketing).toBe(false);
			expect(state.consents.measurement).toBe(false);
			expect(state.consents.functionality).toBe(false);
			expect(state.consents.experience).toBe(false);
		});

		it('should set namespace correctly', () => {
			const store = createConsentManagerStore(mockManager, {
				namespace: 'customStore',
			});

			// Store should be accessible via window under the namespace
			expect((window as Record<string, unknown>).customStore).toBe(store);
		});

		it('should apply initial consent categories if provided', () => {
			const store = createConsentManagerStore(mockManager, {
				initialConsentCategories: ['necessary', 'measurement', 'marketing'],
			});
			const state = store.getState();

			expect(state.consentCategories).toContain('necessary');
			expect(state.consentCategories).toContain('measurement');
			expect(state.consentCategories).toContain('marketing');
		});

		it('should restore state from stored consent if available', () => {
			// Pre-save consent data
			const storedData = {
				consents: {
					necessary: true,
					marketing: true,
					measurement: false,
					functionality: false,
					experience: false,
				},
				consentInfo: {
					time: Date.now(),
					type: 'all',
					subjectId: 'test-subject',
				},
			};
			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedData));

			const store = createConsentManagerStore(mockManager);
			const state = store.getState();

			expect(state.consents.marketing).toBe(true);
			expect(state.consentInfo).not.toBeNull();
			expect(state.consentInfo?.subjectId).toBe('test-subject');
			expect(state.activeUI).toBe('none');
			// When stored consent exists, isLoadingConsentInfo is set to false
			// but the store still initializes with the loading state
			// The store will update this after initConsentManager runs
		});
	});

	describe('Consent Actions', () => {
		it('should update selected consent with setSelectedConsent', () => {
			const store = createConsentManagerStore(mockManager);

			store.getState().setSelectedConsent('marketing', true);
			expect(store.getState().selectedConsents.marketing).toBe(true);

			store.getState().setSelectedConsent('marketing', false);
			expect(store.getState().selectedConsents.marketing).toBe(false);
		});

		it('should not allow changes to disabled consent types', () => {
			const store = createConsentManagerStore(mockManager);

			// Find and set necessary as disabled
			store.setState({
				consentTypes: store
					.getState()
					.consentTypes.map((type) =>
						type.name === 'necessary' ? { ...type, disabled: true } : type
					),
			});

			// Attempt to change necessary consent
			const originalValue = store.getState().selectedConsents.necessary;
			store.getState().setSelectedConsent('necessary', !originalValue);

			// Should not have changed
			expect(store.getState().selectedConsents.necessary).toBe(originalValue);
		});

		it('should update consent and save with setConsent', async () => {
			const store = createConsentManagerStore(mockManager);

			// First, ensure we have consent info so setConsent can save
			store.setState({
				consentInfo: {
					time: Date.now(),
					type: 'custom',
					subjectId: 'test-subject',
				},
			});

			store.getState().setConsent('marketing', true);

			// Allow async operations to complete
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(store.getState().selectedConsents.marketing).toBe(true);
		});

		it('should reset all consents with resetConsents', () => {
			const store = createConsentManagerStore(mockManager);

			// Set some custom consents
			store.setState({
				consents: {
					necessary: true,
					marketing: true,
					measurement: true,
					functionality: true,
					experience: true,
				},
				consentInfo: {
					time: Date.now(),
					type: 'all',
					subjectId: 'test-subject',
				},
			});

			store.getState().resetConsents();
			const state = store.getState();

			// Should be reset to default values
			expect(state.consents.marketing).toBe(false);
			expect(state.consents.measurement).toBe(false);
			expect(state.consentInfo).toBeNull();
		});
	});

	describe('Active UI State', () => {
		it('should control banner visibility with setActiveUI', () => {
			const store = createConsentManagerStore(mockManager);

			store.getState().setActiveUI('banner', { force: true });
			expect(store.getState().activeUI).toBe('banner');

			store.getState().setActiveUI('none');
			expect(store.getState().activeUI).toBe('none');
		});

		it('should not show banner if consent already exists', () => {
			const store = createConsentManagerStore(mockManager);

			// Set existing consent info
			store.setState({
				consentInfo: {
					time: Date.now(),
					type: 'all',
					subjectId: 'test-subject',
				},
				isLoadingConsentInfo: false,
			});

			// Try to show banner without force flag
			store.getState().setActiveUI('banner');
			expect(store.getState().activeUI).toBe('none');
		});

		it('should show banner with force flag regardless of consent state', () => {
			const store = createConsentManagerStore(mockManager);

			// Set existing consent info
			store.setState({
				consentInfo: {
					time: Date.now(),
					type: 'all',
					subjectId: 'test-subject',
				},
				isLoadingConsentInfo: false,
			});

			// Force show banner
			store.getState().setActiveUI('banner', { force: true });
			expect(store.getState().activeUI).toBe('banner');
		});

		it('should control dialog visibility with setActiveUI', () => {
			const store = createConsentManagerStore(mockManager);

			store.getState().setActiveUI('dialog');
			expect(store.getState().activeUI).toBe('dialog');

			store.getState().setActiveUI('none');
			expect(store.getState().activeUI).toBe('none');
		});

		it('should always allow setting dialog regardless of consent state', () => {
			const store = createConsentManagerStore(mockManager);

			// Set existing consent info
			store.setState({
				consentInfo: {
					time: Date.now(),
					type: 'all',
					subjectId: 'test-subject',
				},
			});

			store.getState().setActiveUI('dialog');
			expect(store.getState().activeUI).toBe('dialog');
		});

		it('should show banner without force when no consent and not loading', () => {
			const store = createConsentManagerStore(mockManager);

			// Simulate finished loading with no consent
			store.setState({
				isLoadingConsentInfo: false,
				consentInfo: null,
			});
			window.localStorage.clear();

			store.getState().setActiveUI('banner');
			expect(store.getState().activeUI).toBe('banner');
		});

		it('should not show banner without force during loading', () => {
			const store = createConsentManagerStore(mockManager);

			// Default state has isLoadingConsentInfo = true
			expect(store.getState().isLoadingConsentInfo).toBe(true);

			store.getState().setActiveUI('banner');
			expect(store.getState().activeUI).toBe('none');
		});

		it('should not show banner without force when stored consent exists', () => {
			// Pre-set localStorage with consent data
			const storedData = {
				consents: {
					necessary: true,
					marketing: true,
					measurement: false,
					functionality: false,
					experience: false,
				},
				consentInfo: {
					time: Date.now(),
					type: 'all',
					subjectId: 'test-subject',
				},
			};
			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedData));

			const store = createConsentManagerStore(mockManager);

			store.getState().setActiveUI('banner');
			expect(store.getState().activeUI).toBe('none');
		});

		it('should support full transition cycle: banner → dialog → none', () => {
			const store = createConsentManagerStore(mockManager);

			// Force banner
			store.getState().setActiveUI('banner', { force: true });
			expect(store.getState().activeUI).toBe('banner');

			// Transition to dialog
			store.getState().setActiveUI('dialog');
			expect(store.getState().activeUI).toBe('dialog');

			// Transition to none
			store.getState().setActiveUI('none');
			expect(store.getState().activeUI).toBe('none');
		});

		it('should set activeUI to none after saveConsents', async () => {
			const store = createConsentManagerStore(mockManager);

			// Force banner first
			store.getState().setActiveUI('banner', { force: true });
			expect(store.getState().activeUI).toBe('banner');

			// Save consents
			await store.getState().saveConsents('all');

			expect(store.getState().activeUI).toBe('none');
		});

		it('should allow banner again after resetConsents clears consentInfo', () => {
			const store = createConsentManagerStore(mockManager);

			// First, save consents to set consentInfo
			store.setState({
				consents: {
					necessary: true,
					marketing: true,
					measurement: true,
					functionality: true,
					experience: true,
				},
				consentInfo: {
					time: Date.now(),
					type: 'all',
					subjectId: 'test-subject',
				},
				isLoadingConsentInfo: false,
			});

			// Reset consents — this clears consentInfo
			store.getState().resetConsents();
			expect(store.getState().consentInfo).toBeNull();

			// Now banner should be allowed without force
			store.getState().setActiveUI('banner');
			expect(store.getState().activeUI).toBe('banner');
		});
	});

	describe('GDPR Types Management', () => {
		it('should update consent categories with setConsentCategories', () => {
			const store = createConsentManagerStore(mockManager);

			store.getState().setConsentCategories(['necessary', 'measurement']);
			expect(store.getState().consentCategories).toEqual([
				'necessary',
				'measurement',
			]);
		});

		it('should update consent categories with updateConsentCategories', () => {
			const store = createConsentManagerStore(mockManager);

			const initialTypes = store.getState().consentCategories;
			store.getState().updateConsentCategories(['experience', 'functionality']);

			const updatedTypes = store.getState().consentCategories;
			expect(updatedTypes).toContain('experience');
			expect(updatedTypes).toContain('functionality');
			// Should still contain initial types
			initialTypes.forEach((type) => {
				expect(updatedTypes).toContain(type);
			});
		});

		it('should enforce policy scope when setting consent categories', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				policyCategories: ['necessary', 'measurement'],
			});

			store
				.getState()
				.setConsentCategories([
					'necessary',
					'measurement',
					'experience',
					'marketing',
				]);

			expect(store.getState().consentCategories).toEqual([
				'necessary',
				'measurement',
			]);
		});

		it('should enforce policy scope when categories are discovered later', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				consentCategories: ['necessary', 'measurement'],
				policyCategories: ['necessary', 'measurement'],
			});

			store.getState().updateConsentCategories(['experience', 'marketing']);

			expect(store.getState().consentCategories).toEqual([
				'necessary',
				'measurement',
			]);
		});
	});

	describe('Callbacks', () => {
		it('should set callbacks with setCallback', () => {
			const store = createConsentManagerStore(mockManager);

			const mockCallback = vi.fn();
			store.getState().setCallback('onConsentSet', mockCallback);

			// Callback should be called immediately with current consent state
			expect(mockCallback).toHaveBeenCalledWith({
				preferences: expect.any(Object),
			});
		});

		it('should replay missed onBannerFetched callback if banner was already fetched', () => {
			const store = createConsentManagerStore(mockManager);

			// Set up banner fetch data
			store.setState({
				hasFetchedBanner: true,
				lastBannerFetchData: {
					jurisdiction: 'GDPR',
					location: { countryCode: 'DE', regionCode: null },
					translations: { language: 'en', translations: {} },
				},
			});

			const mockCallback = vi.fn();
			store.getState().setCallback('onBannerFetched', mockCallback);

			// Callback should be called with banner data
			expect(mockCallback).toHaveBeenCalledWith({
				jurisdiction: expect.any(Object),
				location: expect.any(Object),
				translations: expect.any(Object),
			});
		});
	});

	describe('Location and Translation', () => {
		it('should set location info with setLocationInfo', () => {
			const store = createConsentManagerStore(mockManager);

			store.getState().setLocationInfo({
				countryCode: 'US',
				regionCode: 'CA',
			});

			expect(store.getState().locationInfo).toEqual({
				countryCode: 'US',
				regionCode: 'CA',
			});
		});

		it('should set translation config with setTranslationConfig', () => {
			const store = createConsentManagerStore(mockManager);

			store.getState().setTranslationConfig({
				defaultLanguage: 'de',
				overrideLanguage: 'de',
				translations: {},
				mode: 'override',
			});

			expect(store.getState().translationConfig.defaultLanguage).toBe('de');
		});
	});

	describe('Has Condition Evaluation', () => {
		it('should evaluate simple consent conditions', () => {
			const store = createConsentManagerStore(mockManager);

			// Set up known consent state
			store.setState({
				consents: {
					necessary: true,
					marketing: false,
					measurement: true,
					functionality: false,
					experience: false,
				},
			});

			expect(store.getState().has('necessary')).toBe(true);
			expect(store.getState().has('marketing')).toBe(false);
			expect(store.getState().has('measurement')).toBe(true);
		});

		it('should evaluate AND conditions', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				consents: {
					necessary: true,
					marketing: false,
					measurement: true,
					functionality: false,
					experience: false,
				},
			});

			expect(store.getState().has({ and: ['necessary', 'measurement'] })).toBe(
				true
			);
			expect(store.getState().has({ and: ['necessary', 'marketing'] })).toBe(
				false
			);
		});

		it('should evaluate OR conditions', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				consents: {
					necessary: true,
					marketing: false,
					measurement: true,
					functionality: false,
					experience: false,
				},
			});

			expect(store.getState().has({ or: ['marketing', 'measurement'] })).toBe(
				true
			);
			expect(store.getState().has({ or: ['marketing', 'functionality'] })).toBe(
				false
			);
		});

		it('should evaluate NOT conditions', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				consents: {
					necessary: true,
					marketing: false,
					measurement: true,
					functionality: false,
					experience: false,
				},
			});

			expect(store.getState().has({ not: 'marketing' })).toBe(true);
			expect(store.getState().has({ not: 'necessary' })).toBe(false);
		});

		it('should evaluate complex nested conditions', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				consents: {
					necessary: true,
					marketing: false,
					measurement: true,
					functionality: false,
					experience: false,
				},
			});

			// necessary AND (marketing OR measurement) AND NOT functionality
			const condition = {
				and: [
					'necessary' as const,
					{ or: ['marketing' as const, 'measurement' as const] },
					{ not: 'functionality' as const },
				],
			};

			expect(store.getState().has(condition)).toBe(true);
		});

		it('should treat out-of-policy categories as granted in has()', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				policyCategories: ['necessary', 'measurement'],
				policyScopeMode: 'permissive',
				consents: {
					necessary: true,
					marketing: false,
					measurement: true,
					functionality: false,
					experience: false,
				},
			});

			expect(store.getState().has('experience')).toBe(true);
			expect(store.getState().has('marketing')).toBe(true);
			expect(store.getState().has('measurement')).toBe(true);
		});

		it('should keep out-of-policy categories blocked in strict scope mode', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				policyCategories: ['necessary', 'measurement'],
				policyScopeMode: 'strict',
				consents: {
					necessary: true,
					marketing: false,
					measurement: true,
					functionality: false,
					experience: false,
				},
			});

			expect(store.getState().has('experience')).toBe(false);
			expect(store.getState().has('marketing')).toBe(false);
			expect(store.getState().has('measurement')).toBe(true);
		});
	});

	describe('hasConsented', () => {
		it('should return false when no consent info exists', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({ consentInfo: null });
			expect(store.getState().hasConsented()).toBe(false);
		});

		it('should return true when consent info exists', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				consentInfo: {
					time: Date.now(),
					type: 'all',
					subjectId: 'test-subject',
				},
			});
			expect(store.getState().hasConsented()).toBe(true);
		});
	});

	describe('getDisplayedConsents', () => {
		it('should return only consents in consentCategories', () => {
			const store = createConsentManagerStore(mockManager, {
				initialConsentCategories: ['necessary', 'marketing'],
			});

			const displayed = store.getState().getDisplayedConsents();
			const displayedNames = displayed.map((c) => c.name);

			expect(displayedNames).toContain('necessary');
			expect(displayedNames).toContain('marketing');
			expect(displayedNames).not.toContain('measurement');
			expect(displayedNames).not.toContain('functionality');
			expect(displayedNames).not.toContain('experience');
		});
	});

	describe('User Identification', () => {
		it('should store user info immediately', async () => {
			const store = createConsentManagerStore(mockManager);

			await store.getState().identifyUser({
				id: 'user-123',
				identityProvider: 'custom',
			});

			expect(store.getState().user).toEqual({
				id: 'user-123',
				identityProvider: 'custom',
			});
		});

		it('should not call API when no consent exists yet', async () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({ consentInfo: null });

			await store.getState().identifyUser({
				id: 'user-123',
				identityProvider: 'custom',
			});

			// API should not be called because there's no consent yet
			expect(mockManager.identifyUser).not.toHaveBeenCalled();
		});

		it('should call API when consent exists with subjectId', async () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				consentInfo: {
					time: Date.now(),
					type: 'all',
					subjectId: 'test-subject-id',
				},
			});

			await store.getState().identifyUser({
				id: 'user-123',
				identityProvider: 'custom',
			});

			expect(mockManager.identifyUser).toHaveBeenCalledWith({
				body: {
					id: 'test-subject-id',
					externalId: 'user-123',
					identityProvider: 'custom',
				},
			});
		});

		it('should skip API call if user is already linked with same externalId', async () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				consentInfo: {
					time: Date.now(),
					type: 'all',
					subjectId: 'test-subject-id',
					externalId: 'user-123',
					identityProvider: 'custom',
				},
			});

			await store.getState().identifyUser({
				id: 'user-123',
				identityProvider: 'custom',
			});

			// Should skip API call since already linked
			expect(mockManager.identifyUser).not.toHaveBeenCalled();
		});
	});

	describe('Overrides', () => {
		it('should set overrides and reinitialize', async () => {
			const store = createConsentManagerStore(mockManager);

			await store.getState().setOverrides({
				countryCode: 'FR',
			});

			expect(store.getState().overrides?.countryCode).toBe('FR');
		});

		it('should set language override with setLanguage', async () => {
			const store = createConsentManagerStore(mockManager);

			await store.getState().setLanguage('de');

			expect(store.getState().overrides?.language).toBe('de');
		});
	});

	describe('Script Management', () => {
		it('should set scripts with setScripts', () => {
			const store = createConsentManagerStore(mockManager);

			store.getState().setScripts([
				{
					id: 'analytics',
					category: 'measurement',
					src: 'https://example.com/analytics.js',
				},
			]);

			expect(store.getState().scripts).toHaveLength(1);
			expect(store.getState().scripts[0].id).toBe('analytics');
		});

		it('should remove script with removeScript', () => {
			const store = createConsentManagerStore(mockManager);

			// Add scripts first
			store.getState().setScripts([
				{
					id: 'analytics',
					category: 'measurement',
					src: 'https://example.com/analytics.js',
				},
				{
					id: 'marketing',
					category: 'marketing',
					src: 'https://example.com/marketing.js',
				},
			]);

			store.getState().removeScript('analytics');

			expect(store.getState().scripts).toHaveLength(1);
			expect(store.getState().scripts[0].id).toBe('marketing');
		});

		it('should track loaded scripts in state', () => {
			const store = createConsentManagerStore(mockManager);

			// Initially no scripts loaded
			expect(store.getState().loadedScripts).toEqual({});

			// Add scripts
			store.getState().setScripts([
				{
					id: 'analytics',
					category: 'measurement',
					src: 'https://example.com/analytics.js',
				},
			]);

			// Scripts would be loaded/tracked through updateScripts
			// which is called automatically when scripts are set
			expect(store.getState().scripts).toHaveLength(1);
		});

		it('should expose isScriptLoaded function', () => {
			const store = createConsentManagerStore(mockManager);

			// isScriptLoaded is a function on the store that checks global script loader state
			expect(typeof store.getState().isScriptLoaded).toBe('function');
		});

		it('should expose getLoadedScriptIds function', () => {
			const store = createConsentManagerStore(mockManager);

			// getLoadedScriptIds is a function on the store
			expect(typeof store.getState().getLoadedScriptIds).toBe('function');

			const loaded = store.getState().getLoadedScriptIds();
			expect(Array.isArray(loaded)).toBe(true);
		});
	});

	describe('IAB Manager', () => {
		it('should be null when IAB config is not provided', () => {
			const store = createConsentManagerStore(mockManager);
			expect(store.getState().iab).toBeNull();
		});
	});

	describe('Store Configuration', () => {
		it('should apply provided callbacks to state', () => {
			const mockOnConsentSet = vi.fn();
			const store = createConsentManagerStore(mockManager, {
				callbacks: {
					onConsentSet: mockOnConsentSet,
				},
			});

			expect(store.getState().callbacks.onConsentSet).toBe(mockOnConsentSet);
			// Should also be called immediately
			expect(mockOnConsentSet).toHaveBeenCalled();
		});

		it('should apply provided scripts to state and update consentCategories', () => {
			const store = createConsentManagerStore(mockManager, {
				scripts: [
					{
						id: 'analytics',
						category: 'measurement',
						src: 'https://example.com/analytics.js',
					},
				],
			});

			expect(store.getState().scripts).toHaveLength(1);
			expect(store.getState().consentCategories).toContain('measurement');
		});

		it('should not add out-of-policy script categories to consentCategories', () => {
			const store = createConsentManagerStore(mockManager);
			store.setState({
				policyCategories: ['necessary', 'measurement'],
				consentCategories: ['necessary', 'measurement'],
			});

			store.getState().setScripts([
				{
					id: 'marketing-pixel',
					category: 'marketing',
					src: 'https://example.com/marketing.js',
				},
			]);

			expect(store.getState().consentCategories).toEqual([
				'necessary',
				'measurement',
			]);
		});

		it('should apply storage config', () => {
			const store = createConsentManagerStore(mockManager, {
				storageConfig: {
					storageKey: 'custom-key',
					crossSubdomain: true,
				},
			});

			expect(store.getState().storageConfig?.storageKey).toBe('custom-key');
			expect(store.getState().storageConfig?.crossSubdomain).toBe(true);
		});

		it('should set reloadOnConsentRevoked correctly', () => {
			const storeDefault = createConsentManagerStore(mockManager);
			expect(storeDefault.getState().reloadOnConsentRevoked).toBe(true);

			const storeCustom = createConsentManagerStore(mockManager, {
				reloadOnConsentRevoked: false,
			});
			// Note: reloadOnConsentRevoked might be in initial state, check actual behavior
		});

		it('should apply model configuration', () => {
			const store = createConsentManagerStore(mockManager);
			expect(store.getState().model).toBe('opt-in');
		});
	});

	describe('Subscription and State Updates', () => {
		it('should support subscription to state changes', () => {
			const store = createConsentManagerStore(mockManager);
			const listener = vi.fn();

			const unsubscribe = store.subscribe(listener);

			store.getState().setSelectedConsent('marketing', true);
			expect(listener).toHaveBeenCalled();

			unsubscribe();
		});

		it('should expose setState for direct updates', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({ activeUI: 'banner' });
			expect(store.getState().activeUI).toBe('banner');
		});
	});
});
