/**
 * @file Tests for the iframe blocker store integration
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConsentStoreState } from '../../../store/type';
import { createIframeManager } from '../store';

const mockObserver = {
	disconnect: vi.fn(),
};

const getIframeConsentCategories = vi.fn(() => []);
const processAllIframes = vi.fn();
const setupIframeObserver = vi.fn(() => mockObserver);
const iframeDependencies = {
	getIframeConsentCategories,
	processAllIframes,
	setupIframeObserver,
};

describe('createIframeManager', () => {
	let mockGet: ReturnType<typeof vi.fn>;
	let mockSet: ReturnType<typeof vi.fn>;
	let manager: ReturnType<typeof createIframeManager>;

	beforeEach(() => {
		mockGet = vi.fn();
		mockSet = vi.fn();
		manager = createIframeManager(mockGet, mockSet, iframeDependencies);

		// Clear all mocks
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('initializeIframeBlocker', () => {
		it('should initialize iframe blocker with config and consents', () => {
			const mockState: Partial<ConsentStoreState> = {
				consents: {
					experience: false,
					functionality: false,
					marketing: true,
					measurement: false,
					necessary: true,
				},
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			};

			mockGet.mockReturnValue(mockState);

			manager.initializeIframeBlocker();

			expect(mockGet).toHaveBeenCalled();
			// Pure function should process all iframes with current consents
			expect(processAllIframes).toHaveBeenCalledWith(mockState.consents);
			// Observer should be set up
			expect(setupIframeObserver).toHaveBeenCalled();
			// Should update state to mark blocker as active (like script loader pattern)
		});

		it('should not initialize iframe blocker when already initialized', () => {
			// First initialization
			mockGet.mockReturnValueOnce({
				consents: {},
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});

			manager.initializeIframeBlocker();

			// Second initialization should not process again
			mockGet.mockReturnValueOnce({
				consents: {},
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});

			manager.initializeIframeBlocker();

			expect(processAllIframes).toHaveBeenCalledTimes(1);
			expect(setupIframeObserver).toHaveBeenCalledTimes(1);
			// mockSet is not used in the current implementation, so it should not be called
			expect(mockSet).not.toHaveBeenCalled();
		});

		it('should respect disableAutomaticBlocking config', () => {
			mockGet.mockReturnValue({
				consents: {},
				iframeBlockerConfig: { disableAutomaticBlocking: true },
			});

			manager.initializeIframeBlocker();

			// Should not process or set up observer when automatic blocking is disabled
			expect(processAllIframes).not.toHaveBeenCalled();
			expect(setupIframeObserver).not.toHaveBeenCalled();
			expect(mockSet).not.toHaveBeenCalled();
		});

		it('should discover and update consent categories from iframes', () => {
			const mockUpdateConsentCategories = vi.fn();

			// Mock that iframes have marketing and measurement categories
			vi.mocked(getIframeConsentCategories).mockReturnValueOnce([
				'marketing',
				'measurement',
			]);

			mockGet.mockReturnValue({
				consents: {},
				iframeBlockerConfig: { disableAutomaticBlocking: false },
				updateConsentCategories: mockUpdateConsentCategories,
			});

			manager.initializeIframeBlocker();

			// Should extract categories from iframes
			expect(getIframeConsentCategories).toHaveBeenCalled();
			// Should update consentCategories with discovered categories
			expect(mockUpdateConsentCategories).toHaveBeenCalledWith([
				'marketing',
				'measurement',
			]);
		});

		it('should not update categories when no iframes with categories exist', () => {
			const mockUpdateConsentCategories = vi.fn();

			// Mock that no iframes have categories
			vi.mocked(getIframeConsentCategories).mockReturnValueOnce([]);

			mockGet.mockReturnValue({
				consents: {},
				iframeBlockerConfig: { disableAutomaticBlocking: false },
				updateConsentCategories: mockUpdateConsentCategories,
			});

			manager.initializeIframeBlocker();

			// Should still call the extraction function
			expect(getIframeConsentCategories).toHaveBeenCalled();
			// Should not update categories when none found
			expect(mockUpdateConsentCategories).not.toHaveBeenCalled();
		});
	});

	describe('updateIframeConsents', () => {
		it('should reprocess all iframes when blocker is active', () => {
			// First initialize the blocker
			mockGet.mockReturnValueOnce({
				consents: {},
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});
			manager.initializeIframeBlocker();

			const mockConsents = {
				experience: false,
				functionality: true,
				marketing: true,
				measurement: false,
				necessary: true,
			};

			mockGet.mockReturnValue({
				consents: mockConsents,
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});

			manager.updateIframeConsents();

			// Should call pure function to process all iframes with new consents
			expect(processAllIframes).toHaveBeenCalledWith(mockConsents);
		});

		it('should not process iframes when blocker is not active', () => {
			// Don't initialize the blocker first
			mockGet.mockReturnValue({
				consents: {},
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});

			manager.updateIframeConsents();

			// Should not process if blocker isn't active
			expect(processAllIframes).not.toHaveBeenCalled();
		});
	});

	describe('destroyIframeBlocker', () => {
		it('should disconnect observer and mark as inactive', () => {
			// First initialize
			mockGet.mockReturnValueOnce({
				consents: {},
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});
			manager.initializeIframeBlocker();

			// Then destroy
			mockGet.mockReturnValueOnce({
				consents: {},
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});
			manager.destroyIframeBlocker();

			expect(mockObserver.disconnect).toHaveBeenCalled();
		});

		it('should not throw error when destroying non-initialized blocker', () => {
			// Don't initialize the blocker
			expect(() => {
				manager.destroyIframeBlocker();
			}).not.toThrow();
		});
	});

	describe('integration scenarios', () => {
		it('should handle full lifecycle correctly', () => {
			const initialConsents = {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			};

			// Initialize
			mockGet.mockReturnValueOnce({
				consents: initialConsents,
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});

			manager.initializeIframeBlocker();

			expect(processAllIframes).toHaveBeenCalledWith(initialConsents);
			expect(setupIframeObserver).toHaveBeenCalled();

			// Update consents
			const updatedConsents = {
				...initialConsents,
				marketing: true,
			};

			mockGet.mockReturnValueOnce({
				consents: updatedConsents,
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});

			manager.updateIframeConsents();
			expect(processAllIframes).toHaveBeenCalledWith(updatedConsents);

			// Destroy
			mockGet.mockReturnValueOnce({
				consents: {},
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});
			manager.destroyIframeBlocker();
			expect(mockObserver.disconnect).toHaveBeenCalled();
		});

		it('should handle multiple consent updates', () => {
			// Initialize first
			mockGet.mockReturnValueOnce({
				consents: {},
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});
			manager.initializeIframeBlocker();

			// Reset call count after init
			vi.clearAllMocks();

			// Multiple updates
			const consents1 = { marketing: true };
			const consents2 = { functionality: true, marketing: false };
			const consents3 = { functionality: true, marketing: true };

			mockGet.mockReturnValueOnce({
				consents: consents1,
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});
			manager.updateIframeConsents();

			mockGet.mockReturnValueOnce({
				consents: consents2,
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});
			manager.updateIframeConsents();

			mockGet.mockReturnValueOnce({
				consents: consents3,
				iframeBlockerConfig: { disableAutomaticBlocking: false },
			});
			manager.updateIframeConsents();

			// Pure function called 3 times with different consents
			expect(processAllIframes).toHaveBeenCalledTimes(3);
			expect(processAllIframes).toHaveBeenNthCalledWith(1, consents1);
			expect(processAllIframes).toHaveBeenNthCalledWith(2, consents2);
			expect(processAllIframes).toHaveBeenNthCalledWith(3, consents3);
		});
	});
});
