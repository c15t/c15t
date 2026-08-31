/**
 * Comprehensive tests for the consent management store.
 *
 * @vitest-environment jsdom
 * @packageDocumentation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createConsentManagerStore } from '..';
import { STORAGE_KEY_V2 } from '../initial-state';

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
// Mock Setup
// ─────────────────────────────────────────────────────────────────────────────

const createMockManager = function createMockManager() {
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
				consentInfo: {
					subjectId: 'test-subject',
					time: Date.now(),
					type: 'all',
				},
				consents: {
					experience: false,
					functionality: false,
					marketing: true,
					measurement: false,
					necessary: true,
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

	describe('unstable_acceptPolicyConsent', () => {
		it('passes proof fields for suffixed legal-document types', async () => {
			mockManager.setConsent.mockResolvedValueOnce({
				data: {
					consentId: 'cns_123',
					domain: 'example.com',
					domainId: 'dom_123',
					givenAt: new Date('2026-04-07T00:00:00.000Z'),
					subjectId: 'sub_2jv6z8n4q9',
					type: 'terms_and_conditions_b2b',
				},
				ok: true,
			});
			const store = createConsentManagerStore(mockManager);

			await store.getState().unstable_acceptPolicyConsent({
				domain: 'example.com',
				givenAt: 1_775_520_000_000,
				policyHash: 'sha256:abc123',
				type: 'terms_and_conditions_b2b',
			});

			expect(mockManager.setConsent).toHaveBeenCalledWith({
				body: expect.objectContaining({
					policyHash: 'sha256:abc123',
					type: 'terms_and_conditions_b2b',
				}),
			});
		});

		it('coalesces concurrent identical policy consent submissions', async () => {
			mockManager.setConsent.mockResolvedValue({
				data: {
					consentId: 'cns_123',
					domain: 'example.com',
					domainId: 'dom_123',
					givenAt: new Date('2026-04-07T00:00:00.000Z'),
					subjectId: 'sub_123',
					type: 'other',
				},
				ok: true,
			});
			const store = createConsentManagerStore(mockManager);
			const input = {
				domain: 'example.com',
				preferences: { necessary: true },
				type: 'other' as const,
			};

			const first = store.getState().unstable_acceptPolicyConsent(input);
			const second = store.getState().unstable_acceptPolicyConsent(input);

			expect(second).toBe(first);
			expect(mockManager.setConsent).toHaveBeenCalledTimes(1);

			const [firstResult, secondResult] = await Promise.all([first, second]);
			expect(secondResult.consentId).toBe(firstResult.consentId);
		});

		it('stores the server-recorded consent time after clamping', async () => {
			const clientGivenAt = Date.parse('2026-04-08T00:00:00.000Z');
			const serverGivenAt = new Date('2026-04-07T00:00:00.000Z');
			mockManager.setConsent.mockResolvedValue({
				data: {
					consentId: 'cns_123',
					domain: 'example.com',
					domainId: 'dom_123',
					givenAt: serverGivenAt,
					subjectId: 'sub_123',
					type: 'other',
				},
				ok: true,
			});
			const store = createConsentManagerStore(mockManager);

			const consent = await store.getState().unstable_acceptPolicyConsent({
				domain: 'example.com',
				givenAt: clientGivenAt,
				type: 'other',
			});

			expect(consent.givenAt).toEqual(serverGivenAt);
			expect(store.getState().consentInfo?.time).toBe(serverGivenAt.getTime());
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
					subjectId: 'test-subject',
					time: Date.now(),
					type: 'custom',
				},
			});

			store.getState().setConsent('marketing', true);

			// Allow async operations to complete
			await createDeferredPromise((resolve) => setTimeout(resolve, 100));

			expect(store.getState().selectedConsents.marketing).toBe(true);
		});

		it('coalesces concurrent identical banner consent saves', async () => {
			const store = createConsentManagerStore(mockManager);

			const first = store.getState().saveConsents('all', {
				uiSource: 'banner',
			});
			const second = store.getState().saveConsents('all', {
				uiSource: 'banner',
			});

			expect(second).toBe(first);
			await Promise.all([first, second]);
			expect(mockManager.setConsent).toHaveBeenCalledTimes(1);
		});

		it('should reset all consents with resetConsents', () => {
			const store = createConsentManagerStore(mockManager);

			// Set some custom consents
			store.setState({
				consentInfo: {
					subjectId: 'test-subject',
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
					subjectId: 'test-subject',
					time: Date.now(),
					type: 'all',
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
					subjectId: 'test-subject',
					time: Date.now(),
					type: 'all',
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
					subjectId: 'test-subject',
					time: Date.now(),
					type: 'all',
				},
			});

			store.getState().setActiveUI('dialog');
			expect(store.getState().activeUI).toBe('dialog');
		});

		it('should show banner without force when no consent and not loading', () => {
			const store = createConsentManagerStore(mockManager);

			// Simulate finished loading with no consent
			store.setState({
				consentInfo: null,
				isLoadingConsentInfo: false,
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
				consentInfo: {
					subjectId: 'test-subject',
					time: Date.now(),
					type: 'all',
				},
				consents: {
					experience: false,
					functionality: false,
					marketing: true,
					measurement: false,
					necessary: true,
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

		it('should omit invalid optional subject identifiers when saving from restored consent state', async () => {
			const storedData = {
				consentInfo: {
					externalId: 'undefined',
					identityProvider: null,
					subjectId: 'sub_111AEMh5qpiLmhEcbnqwrmsB7X',
					time: Date.now(),
					type: 'custom' as const,
				},
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: true,
					necessary: true,
				},
			};

			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedData));

			const store = createConsentManagerStore(mockManager);

			expect(store.getState().consentInfo).toEqual({
				subjectId: 'sub_111AEMh5qpiLmhEcbnqwrmsB7X',
				time: storedData.consentInfo.time,
				type: 'custom',
			});
			expect(store.getState().user).toBeUndefined();

			store.getState().setActiveUI('dialog');
			await store.getState().saveConsents('custom', { uiSource: 'dialog' });

			const callBody = (mockManager.setConsent as ReturnType<typeof vi.fn>).mock
				.calls[0][0].body;

			expect(callBody.externalSubjectId).toBeUndefined();
			expect(callBody.identityProvider).toBeUndefined();
			expect(callBody.uiSource).toBe('dialog');
			expect(store.getState().activeUI).toBe('none');
		});

		it('should allow banner again after resetConsents clears consentInfo', () => {
			const store = createConsentManagerStore(mockManager);

			// First, save consents to set consentInfo
			store.setState({
				consentInfo: {
					subjectId: 'test-subject',
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
				policyScopeMode: 'strict',
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
				policyScopeMode: 'strict',
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

		it('should not replay onConsentChanged when registered with setCallback', () => {
			const store = createConsentManagerStore(mockManager);
			const mockCallback = vi.fn();

			store.getState().setCallback('onConsentChanged', mockCallback);

			expect(mockCallback).not.toHaveBeenCalled();
		});

		it('should not call provided onConsentChanged during store creation', () => {
			const mockOnConsentChanged = vi.fn();

			createConsentManagerStore(mockManager, {
				callbacks: {
					onConsentChanged: mockOnConsentChanged,
				},
			});

			expect(mockOnConsentChanged).not.toHaveBeenCalled();
		});

		it('should invoke onConsentChanged for future changed saves after setCallback', async () => {
			const store = createConsentManagerStore(mockManager, {
				reloadOnConsentRevoked: false,
			});
			const mockOnConsentChanged = vi.fn();

			store.setState({
				consentCategories: ['necessary', 'marketing'],
				consentInfo: {
					subjectId: 'test-subject',
					time: Date.now(),
					type: 'custom',
				},
				isLoadingConsentInfo: false,
			});

			store.getState().setCallback('onConsentChanged', mockOnConsentChanged);
			store.getState().setConsent('marketing', true);
			await createDeferredPromise((resolve) => setTimeout(resolve, 100));

			expect(mockOnConsentChanged).toHaveBeenCalledTimes(1);
			expect(mockOnConsentChanged).toHaveBeenCalledWith({
				allowedCategories: ['necessary', 'marketing'],
				deniedCategories: [],
				preferences: expect.objectContaining({
					marketing: true,
					necessary: true,
				}),
				previousAllowedCategories: ['necessary'],
				previousDeniedCategories: ['marketing'],
				previousPreferences: expect.objectContaining({
					marketing: false,
					necessary: true,
				}),
			});
		});

		it('should notify subscribeToConsentChanges listeners exactly once per real change', async () => {
			const store = createConsentManagerStore(mockManager, {
				reloadOnConsentRevoked: false,
			});
			const listener = vi.fn();

			store.setState({
				consentCategories: ['necessary', 'marketing'],
				consentInfo: {
					subjectId: 'test-subject',
					time: Date.now(),
					type: 'custom',
				},
				isLoadingConsentInfo: false,
			});

			const unsubscribe = store.getState().subscribeToConsentChanges(listener);

			store.getState().setConsent('marketing', true);
			await createDeferredPromise((resolve) => setTimeout(resolve, 100));

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith({
				allowedCategories: ['necessary', 'marketing'],
				deniedCategories: [],
				preferences: expect.objectContaining({
					marketing: true,
					necessary: true,
				}),
				previousAllowedCategories: ['necessary'],
				previousDeniedCategories: ['marketing'],
				previousPreferences: expect.objectContaining({
					marketing: false,
					necessary: true,
				}),
			});

			unsubscribe();
			store.getState().setConsent('functionality', true);
			await createDeferredPromise((resolve) => setTimeout(resolve, 100));

			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('should notify multiple subscribeToConsentChanges listeners once per change', async () => {
			const store = createConsentManagerStore(mockManager, {
				reloadOnConsentRevoked: false,
			});
			const firstListener = vi.fn();
			const secondListener = vi.fn();

			store.setState({
				consentCategories: ['necessary', 'marketing'],
				consentInfo: {
					subjectId: 'test-subject',
					time: Date.now(),
					type: 'custom',
				},
				isLoadingConsentInfo: false,
			});

			store.getState().subscribeToConsentChanges(firstListener);
			store.getState().subscribeToConsentChanges(secondListener);

			store.getState().setConsent('marketing', true);
			await createDeferredPromise((resolve) => setTimeout(resolve, 100));

			expect(firstListener).toHaveBeenCalledTimes(1);
			expect(secondListener).toHaveBeenCalledTimes(1);
			expect(firstListener).toHaveBeenCalledWith(
				secondListener.mock.calls[0]?.[0]
			);
		});

		it('should not notify subscribeToConsentChanges for unchanged explicit saves', async () => {
			const store = createConsentManagerStore(mockManager, {
				reloadOnConsentRevoked: false,
			});
			const listener = vi.fn();

			store.setState({
				consentCategories: ['necessary', 'marketing'],
				consentInfo: {
					subjectId: 'test-subject',
					time: Date.now(),
					type: 'custom',
				},
				isLoadingConsentInfo: false,
				selectedConsents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
			});

			store.getState().subscribeToConsentChanges(listener);
			await store.getState().saveConsents('custom');

			expect(listener).not.toHaveBeenCalled();
		});

		it('should not notify subscribeToConsentChanges for resetConsents', () => {
			const store = createConsentManagerStore(mockManager);
			const listener = vi.fn();

			store.getState().subscribeToConsentChanges(listener);
			store.getState().resetConsents();

			expect(listener).not.toHaveBeenCalled();
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
				mode: 'override',
				overrideLanguage: 'de',
				translations: {},
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
					experience: false,
					functionality: false,
					marketing: false,
					measurement: true,
					necessary: true,
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
					experience: false,
					functionality: false,
					marketing: false,
					measurement: true,
					necessary: true,
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
					experience: false,
					functionality: false,
					marketing: false,
					measurement: true,
					necessary: true,
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
					experience: false,
					functionality: false,
					marketing: false,
					measurement: true,
					necessary: true,
				},
			});

			expect(store.getState().has({ not: 'marketing' })).toBe(true);
			expect(store.getState().has({ not: 'necessary' })).toBe(false);
		});

		it('should evaluate complex nested conditions', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: true,
					necessary: true,
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

		it('should respect out-of-policy category choices in has()', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				consents: {
					experience: false,
					functionality: false,
					marketing: true,
					measurement: true,
					necessary: true,
				},
				policyCategories: ['necessary', 'measurement'],
				policyScopeMode: 'permissive',
			});

			expect(store.getState().has('experience')).toBe(false);
			expect(store.getState().has('marketing')).toBe(true);
			expect(store.getState().has('measurement')).toBe(true);
		});

		it('should keep out-of-policy categories blocked in strict scope mode', () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: true,
					necessary: true,
				},
				policyCategories: ['necessary', 'measurement'],
				policyScopeMode: 'strict',
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
					subjectId: 'test-subject',
					time: Date.now(),
					type: 'all',
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
					subjectId: 'test-subject-id',
					time: Date.now(),
					type: 'all',
				},
			});

			await store.getState().identifyUser({
				id: 'user-123',
				identityProvider: 'custom',
			});

			expect(mockManager.identifyUser).toHaveBeenCalledWith({
				body: {
					externalId: 'user-123',
					identityProvider: 'custom',
					subjectId: 'test-subject-id',
				},
			});
		});

		it('should skip API call if user is already linked with same externalId', async () => {
			const store = createConsentManagerStore(mockManager);

			store.setState({
				consentInfo: {
					externalId: 'user-123',
					identityProvider: 'custom',
					subjectId: 'test-subject-id',
					time: Date.now(),
					type: 'all',
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
					category: 'measurement',
					id: 'analytics',
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
					category: 'measurement',
					id: 'analytics',
					src: 'https://example.com/analytics.js',
				},
				{
					category: 'marketing',
					id: 'marketing',
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
					category: 'measurement',
					id: 'analytics',
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
						category: 'measurement',
						id: 'analytics',
						src: 'https://example.com/analytics.js',
					},
				],
			});

			expect(store.getState().scripts).toHaveLength(1);
			expect(store.getState().consentCategories).toContain('measurement');
		});

		it('should not add out-of-policy script categories to consentCategories in strict scope mode', () => {
			const store = createConsentManagerStore(mockManager);
			store.setState({
				consentCategories: ['necessary', 'measurement'],
				policyCategories: ['necessary', 'measurement'],
				policyScopeMode: 'strict',
			});

			store.getState().setScripts([
				{
					category: 'marketing',
					id: 'marketing-pixel',
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
					crossSubdomain: true,
					storageKey: 'custom-key',
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
			expect(storeCustom.getState().reloadOnConsentRevoked).toBe(false);
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
