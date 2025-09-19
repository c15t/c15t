/**
 * @fileoverview Tests for the iframe blocker store integration
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrivacyConsentState } from '../../../store.type';
import { createIframeBlocker } from '../core';
import { createIframeManager, resetIframeBlocker } from '../store';

// Mock the core iframe blocker
const mockIframeBlocker = {
	updateConsents: vi.fn(),
	processIframes: vi.fn(),
	destroy: vi.fn(),
};

vi.mock('../core', () => ({
	createIframeBlocker: vi.fn(() => mockIframeBlocker),
}));

describe('createIframeManager', () => {
	let mockGet: ReturnType<typeof vi.fn>;
	let mockSet: ReturnType<typeof vi.fn>;
	let manager: ReturnType<typeof createIframeManager>;

	beforeEach(() => {
		mockGet = vi.fn();
		mockSet = vi.fn();
		manager = createIframeManager(mockGet, mockSet);

		// Clear all mocks
		vi.clearAllMocks();

		// Reset the iframe blocker instance for each test
		resetIframeBlocker();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('initializeIframeBlocker', () => {
		it('should initialize iframe blocker with config and consents', () => {
			const mockState: Partial<PrivacyConsentState> = {
				iframeBlockerConfig: { disableAutomaticBlocking: false },
				consents: {
					necessary: true,
					functionality: false,
					experience: false,
					marketing: true,
					measurement: false,
				},
			};

			mockGet.mockReturnValue(mockState);

			manager.initializeIframeBlocker();

			expect(mockGet).toHaveBeenCalled();
			// The createIframeBlocker should be called with the config and consents
			expect(createIframeBlocker).toHaveBeenCalledWith(
				mockState.iframeBlockerConfig,
				mockState.consents
			);
		});

		it('should not initialize iframe blocker when already initialized', () => {
			// First initialization
			mockGet.mockReturnValue({
				iframeBlockerConfig: {},
				consents: {},
			});

			manager.initializeIframeBlocker();

			// Second initialization should not create another instance
			manager.initializeIframeBlocker();

			expect(createIframeBlocker).toHaveBeenCalledTimes(1);
		});

		it('should not initialize iframe blocker on server side', () => {
			// Mock window as undefined (server side)
			const originalWindow = global.window;
			// @ts-expect-error - intentionally setting to undefined for test
			global.window = undefined;

			mockGet.mockReturnValue({
				iframeBlockerConfig: {},
				consents: {},
			});

			manager.initializeIframeBlocker();

			expect(createIframeBlocker).not.toHaveBeenCalled();

			// Restore window
			global.window = originalWindow;
		});

		it('should handle missing config gracefully', () => {
			mockGet.mockReturnValue({
				consents: {},
			});

			manager.initializeIframeBlocker();

			expect(createIframeBlocker).toHaveBeenCalledWith(undefined, {});
		});
	});

	describe('updateIframeConsents', () => {
		it('should update iframe blocker consents when blocker exists', () => {
			// Initialize the blocker first
			mockGet.mockReturnValue({
				iframeBlockerConfig: {},
				consents: {},
			});

			manager.initializeIframeBlocker();

			// Now test update
			const mockConsents = {
				necessary: true,
				functionality: true,
				experience: false,
				marketing: true,
				measurement: false,
			};

			mockGet.mockReturnValue({
				iframeBlockerConfig: {},
				consents: mockConsents,
			});

			manager.updateIframeConsents();

			expect(mockIframeBlocker.updateConsents).toHaveBeenCalledWith(
				mockConsents
			);
		});

		it('should not update iframe blocker when blocker does not exist', () => {
			// Don't initialize the blocker
			mockGet.mockReturnValue({
				consents: {},
			});

			manager.updateIframeConsents();

			expect(mockIframeBlocker.updateConsents).not.toHaveBeenCalled();
		});
	});

	describe('destroyIframeBlocker', () => {
		it('should destroy iframe blocker when it exists', () => {
			// Initialize the blocker first
			mockGet.mockReturnValue({
				iframeBlockerConfig: {},
				consents: {},
			});

			manager.initializeIframeBlocker();

			// Now destroy
			manager.destroyIframeBlocker();

			expect(mockIframeBlocker.destroy).toHaveBeenCalled();
		});

		it('should not throw error when destroying non-existent blocker', () => {
			// Don't initialize the blocker
			expect(() => {
				manager.destroyIframeBlocker();
			}).not.toThrow();

			expect(mockIframeBlocker.destroy).not.toHaveBeenCalled();
		});

		it('should reset iframe blocker reference after destroy', () => {
			// Initialize the blocker first
			mockGet.mockReturnValue({
				iframeBlockerConfig: {},
				consents: {},
			});

			manager.initializeIframeBlocker();

			// Destroy
			manager.destroyIframeBlocker();

			// Try to update consents after destroy
			manager.updateIframeConsents();

			expect(mockIframeBlocker.updateConsents).not.toHaveBeenCalled();
		});
	});

	describe('integration scenarios', () => {
		it('should handle full lifecycle correctly', () => {
			const mockState: Partial<PrivacyConsentState> = {
				iframeBlockerConfig: { disableAutomaticBlocking: false },
				consents: {
					necessary: true,
					functionality: false,
					experience: false,
					marketing: false,
					measurement: false,
				},
			};

			mockGet.mockReturnValue(mockState);

			// Initialize
			manager.initializeIframeBlocker();

			expect(createIframeBlocker).toHaveBeenCalledWith(
				mockState.iframeBlockerConfig,
				mockState.consents
			);

			// Update consents
			const updatedConsents = {
				...mockState.consents,
				marketing: true,
			};

			mockGet.mockReturnValue({
				...mockState,
				consents: updatedConsents,
			});

			manager.updateIframeConsents();
			expect(mockIframeBlocker.updateConsents).toHaveBeenCalledWith(
				updatedConsents
			);

			// Destroy
			manager.destroyIframeBlocker();
			expect(mockIframeBlocker.destroy).toHaveBeenCalled();
		});

		it('should handle multiple consent updates', () => {
			// Initialize
			mockGet.mockReturnValue({
				iframeBlockerConfig: {},
				consents: {},
			});

			manager.initializeIframeBlocker();

			// Multiple updates
			const consents1 = { marketing: true };
			const consents2 = { marketing: false, functionality: true };
			const consents3 = { marketing: true, functionality: true };

			mockGet.mockReturnValueOnce({ consents: consents1 });
			manager.updateIframeConsents();

			mockGet.mockReturnValueOnce({ consents: consents2 });
			manager.updateIframeConsents();

			mockGet.mockReturnValueOnce({ consents: consents3 });
			manager.updateIframeConsents();

			expect(mockIframeBlocker.updateConsents).toHaveBeenCalledTimes(3);
			expect(mockIframeBlocker.updateConsents).toHaveBeenNthCalledWith(
				1,
				consents1
			);
			expect(mockIframeBlocker.updateConsents).toHaveBeenNthCalledWith(
				2,
				consents2
			);
			expect(mockIframeBlocker.updateConsents).toHaveBeenNthCalledWith(
				3,
				consents3
			);
		});
	});
});
