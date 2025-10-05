/**
 * @fileoverview Tests for useConsentSync hook
 */

import { act, renderHook } from '@testing-library/react';
import type { AnalyticsConsent } from 'c15t';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConsentSync } from './use-script-manager';

// Mock the core consent sync
const mockConsentSync = {
	consent: {
		necessary: true,
		measurement: true,
		marketing: false,
		functionality: true,
		experience: false,
	},
	loading: false,
	error: undefined,
	lastUpdated: Date.now(),
	source: 'initialization',
	tabId: 'tab-123',
	stats: {
		totalChanges: 0,
		crossTabSyncs: 0,
		conflictsResolved: 0,
		lastSyncTimestamp: 0,
		activeTabsCount: 1,
	},
	updateConsent: vi.fn(),
	resetConsent: vi.fn(),
	getChangeHistory: vi.fn(),
	getConsentStats: vi.fn(),
	destroy: vi.fn(),
};

// Mock the createConsentSync function
vi.mock('c15t', () => ({
	createConsentSync: vi.fn(() => mockConsentSync),
}));

describe('useConsentSync', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Setup default mock implementations
		mockConsentSync.updateConsent.mockResolvedValue(undefined);
		mockConsentSync.resetConsent.mockResolvedValue(undefined);
		mockConsentSync.getChangeHistory.mockReturnValue([]);
		mockConsentSync.getConsentStats.mockReturnValue({
			totalChanges: 0,
			crossTabSyncs: 0,
			conflictsResolved: 0,
			lastSyncTimestamp: 0,
			activeTabsCount: 1,
		});
	});

	describe('initialization', () => {
		it('should initialize consent sync', () => {
			const initialConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			const { result } = renderHook(() => useConsentSync(initialConsent));

			expect(result.current.consent).toEqual(initialConsent);
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBeUndefined();
			expect(typeof result.current.updateConsent).toBe('function');
			expect(typeof result.current.resetConsent).toBe('function');
			expect(typeof result.current.getChangeHistory).toBe('function');
			expect(typeof result.current.getConsentStats).toBe('function');
		});

		it('should initialize with custom options', () => {
			const initialConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			const options = {
				enableCrossTabSync: true,
				conflictResolution: 'latest' as const,
				storageKey: 'custom-consent',
				historyKey: 'custom-history',
				maxHistoryEntries: 20,
				syncTimeout: 10000,
				enableChangeTracking: true,
			};

			renderHook(() => useConsentSync(initialConsent, options));

			// The createConsentSync should be called with the options
			const { createConsentSync } = require('c15t');
			expect(createConsentSync).toHaveBeenCalledWith(initialConsent, options);
		});
	});

	describe('consent updates', () => {
		it('should update consent', async () => {
			const initialConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			const { result } = renderHook(() => useConsentSync(initialConsent));

			const newConsent: AnalyticsConsent = {
				necessary: true,
				measurement: false,
				marketing: true,
				functionality: true,
				experience: true,
			};

			await act(async () => {
				await result.current.updateConsent(
					newConsent,
					'user-action',
					'User clicked accept'
				);
			});

			expect(mockConsentSync.updateConsent).toHaveBeenCalledWith(
				newConsent,
				'user-action',
				'User clicked accept'
			);
		});

		it('should handle consent update errors', async () => {
			const initialConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			const onConsentError = vi.fn();
			mockConsentSync.updateConsent.mockRejectedValueOnce(
				new Error('Update failed')
			);

			const { result } = renderHook(() =>
				useConsentSync(initialConsent, { onConsentError })
			);

			const newConsent: AnalyticsConsent = {
				necessary: true,
				measurement: false,
				marketing: true,
				functionality: true,
				experience: true,
			};

			await act(async () => {
				try {
					await result.current.updateConsent(newConsent);
				} catch (error) {
					// Expected to throw
				}
			});

			expect(onConsentError).toHaveBeenCalledWith(expect.any(Error));
		});

		it('should reset consent', async () => {
			const initialConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			const { result } = renderHook(() => useConsentSync(initialConsent));

			await act(async () => {
				await result.current.resetConsent();
			});

			expect(mockConsentSync.resetConsent).toHaveBeenCalled();
		});
	});

	describe('change history', () => {
		it('should get change history', () => {
			const initialConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			const mockHistory = [
				{
					id: 'change-1',
					previousConsent: initialConsent,
					newConsent: {
						necessary: true,
						measurement: false,
						marketing: true,
						functionality: true,
						experience: true,
					},
					source: 'user-action',
					reason: 'User clicked accept',
					timestamp: Date.now(),
					tabId: 'tab-123',
					userAgent: 'Mozilla/5.0...',
				},
			];

			mockConsentSync.getChangeHistory.mockReturnValue(mockHistory);

			const { result } = renderHook(() => useConsentSync(initialConsent));

			const history = result.current.getChangeHistory();

			expect(history).toEqual(mockHistory);
			expect(mockConsentSync.getChangeHistory).toHaveBeenCalled();
		});
	});

	describe('consent statistics', () => {
		it('should get consent stats', () => {
			const initialConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			const mockStats = {
				totalChanges: 5,
				crossTabSyncs: 3,
				conflictsResolved: 1,
				lastSyncTimestamp: Date.now(),
				activeTabsCount: 2,
			};

			mockConsentSync.getConsentStats.mockReturnValue(mockStats);

			const { result } = renderHook(() => useConsentSync(initialConsent));

			const stats = result.current.getConsentStats();

			expect(stats).toEqual(mockStats);
			expect(mockConsentSync.getConsentStats).toHaveBeenCalled();
		});
	});

	describe('loading state', () => {
		it('should set loading state during consent update', async () => {
			const initialConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			let resolvePromise: (value: any) => void;
			const promise = new Promise((resolve) => {
				resolvePromise = resolve;
			});
			mockConsentSync.updateConsent.mockReturnValueOnce(promise);

			const { result } = renderHook(() => useConsentSync(initialConsent));

			const newConsent: AnalyticsConsent = {
				necessary: true,
				measurement: false,
				marketing: true,
				functionality: true,
				experience: true,
			};

			act(() => {
				result.current.updateConsent(newConsent);
			});

			expect(result.current.loading).toBe(true);

			await act(async () => {
				resolvePromise!(undefined);
			});

			expect(result.current.loading).toBe(false);
		});
	});

	describe('error state', () => {
		it('should handle consent sync errors', async () => {
			const initialConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			const error = new Error('Sync failed');
			mockConsentSync.updateConsent.mockRejectedValueOnce(error);

			const { result } = renderHook(() => useConsentSync(initialConsent));

			const newConsent: AnalyticsConsent = {
				necessary: true,
				measurement: false,
				marketing: true,
				functionality: true,
				experience: true,
			};

			await act(async () => {
				try {
					await result.current.updateConsent(newConsent);
				} catch (e) {
					// Expected to throw
				}
			});

			expect(result.current.error).toBeDefined();
		});
	});

	describe('cleanup', () => {
		it('should cleanup on unmount', () => {
			const initialConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			const { unmount } = renderHook(() => useConsentSync(initialConsent));

			unmount();

			// The consent sync should be destroyed
			expect(mockConsentSync.destroy).toHaveBeenCalled();
		});
	});

	describe('consent change callbacks', () => {
		it('should call onConsentChange callback', async () => {
			const initialConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			const onConsentChange = vi.fn();

			const { result } = renderHook(() =>
				useConsentSync(initialConsent, { onConsentChange })
			);

			const newConsent: AnalyticsConsent = {
				necessary: true,
				measurement: false,
				marketing: true,
				functionality: true,
				experience: true,
			};

			await act(async () => {
				await result.current.updateConsent(newConsent);
			});

			expect(onConsentChange).toHaveBeenCalledWith(newConsent);
		});
	});

	describe('consent validation', () => {
		it('should validate consent format', async () => {
			const initialConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			const { result } = renderHook(() => useConsentSync(initialConsent));

			// Test with invalid consent (missing required fields)
			const invalidConsent = {
				necessary: true,
				// Missing other required fields
			} as any;

			await act(async () => {
				try {
					await result.current.updateConsent(invalidConsent);
				} catch (error) {
					// Expected to throw validation error
				}
			});

			// Should handle validation error gracefully
			expect(result.current.error).toBeDefined();
		});
	});

	describe('cross-tab synchronization', () => {
		it('should handle cross-tab consent changes', () => {
			const initialConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			const { result } = renderHook(() => useConsentSync(initialConsent));

			// Simulate cross-tab consent change
			const crossTabConsent: AnalyticsConsent = {
				necessary: true,
				measurement: false,
				marketing: true,
				functionality: true,
				experience: true,
			};

			// Update the mock consent sync to reflect the change
			mockConsentSync.consent = crossTabConsent;

			// The consent should be updated
			expect(result.current.consent).toEqual(crossTabConsent);
		});
	});
});
