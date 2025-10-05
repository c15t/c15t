/**
 * @fileoverview Tests for ConsentSyncImpl
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type ConsentConflict, ConsentSyncImpl } from './consent-sync';
import type { AnalyticsConsent } from './types';

// Mock localStorage
const mockLocalStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};

const mockStorageEvent = {
	key: 'c15t-consent',
	newValue: JSON.stringify({
		necessary: true,
		measurement: true,
		marketing: false,
		functionality: true,
		experience: false,
	}),
	oldValue: null,
	storageArea: mockLocalStorage,
};

const mockConsole = {
	error: vi.fn(),
	warn: vi.fn(),
	log: vi.fn(),
};

// Setup global mocks
beforeEach(() => {
	vi.stubGlobal('localStorage', mockLocalStorage);
	vi.stubGlobal('console', mockConsole);
	vi.stubGlobal('addEventListener', vi.fn());
	vi.stubGlobal('removeEventListener', vi.fn());

	// Reset all mocks
	vi.clearAllMocks();
});

describe('ConsentSyncImpl', () => {
	let consentSync: ConsentSyncImpl;
	let initialConsent: AnalyticsConsent;

	beforeEach(() => {
		initialConsent = {
			necessary: true,
			measurement: true,
			marketing: false,
			functionality: true,
			experience: false,
		};

		consentSync = new ConsentSyncImpl(initialConsent, {
			enableCrossTabSync: true,
			conflictResolution: 'latest',
			storageKey: 'c15t-consent',
			historyKey: 'c15t-consent-history',
			maxHistoryEntries: 10,
			syncTimeout: 5000,
			enableChangeTracking: true,
		});
	});

	describe('constructor', () => {
		it('should initialize with provided consent', () => {
			expect(consentSync.consent).toEqual(initialConsent);
			expect(consentSync.loading).toBe(false);
			expect(consentSync.error).toBeUndefined();
			expect(consentSync.source).toBe('initialization');
			expect(consentSync.tabId).toBeDefined();
		});

		it('should initialize stats correctly', () => {
			const stats = consentSync.getConsentStats();
			expect(stats.totalChanges).toBe(0);
			expect(stats.crossTabSyncs).toBe(0);
			expect(stats.conflictsResolved).toBe(0);
			expect(stats.lastSyncTimestamp).toBe(0);
			expect(stats.activeTabsCount).toBe(1);
		});

		it('should set up storage listener', () => {
			expect(vi.mocked(addEventListener)).toHaveBeenCalledWith(
				'storage',
				expect.any(Function)
			);
		});
	});

	describe('updateConsent', () => {
		it('should update consent successfully', async () => {
			const newConsent: AnalyticsConsent = {
				necessary: true,
				measurement: false,
				marketing: true,
				functionality: true,
				experience: true,
			};

			await consentSync.updateConsent(
				newConsent,
				'user-action',
				'User clicked accept'
			);

			expect(consentSync.consent).toEqual(newConsent);
			expect(consentSync.source).toBe('user-action');
			expect(consentSync.lastUpdated).toBeGreaterThan(Date.now() - 1000);
		});

		it('should track consent changes', async () => {
			const newConsent: AnalyticsConsent = {
				necessary: true,
				measurement: false,
				marketing: true,
				functionality: true,
				experience: true,
			};

			await consentSync.updateConsent(
				newConsent,
				'user-action',
				'User clicked accept'
			);

			const history = consentSync.getChangeHistory();
			expect(history).toHaveLength(1);
			expect(history[0].previousConsent).toEqual(initialConsent);
			expect(history[0].newConsent).toEqual(newConsent);
			expect(history[0].source).toBe('user-action');
			expect(history[0].reason).toBe('User clicked accept');
		});

		it('should store consent in localStorage', async () => {
			const newConsent: AnalyticsConsent = {
				necessary: true,
				measurement: false,
				marketing: true,
				functionality: true,
				experience: true,
			};

			await consentSync.updateConsent(newConsent);

			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				'c15t-consent',
				JSON.stringify(newConsent)
			);
		});

		it('should handle storage errors gracefully', async () => {
			mockLocalStorage.setItem.mockImplementationOnce(() => {
				throw new Error('Storage quota exceeded');
			});

			const newConsent: AnalyticsConsent = {
				necessary: true,
				measurement: false,
				marketing: true,
				functionality: true,
				experience: true,
			};

			await expect(consentSync.updateConsent(newConsent)).rejects.toThrow(
				'Storage quota exceeded'
			);
		});
	});

	describe('resetConsent', () => {
		it('should reset to default consent', async () => {
			const defaultConsent: AnalyticsConsent = {
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			};

			await consentSync.resetConsent();

			expect(consentSync.consent).toEqual(defaultConsent);
			expect(consentSync.source).toBe('reset');
		});

		it('should clear localStorage', async () => {
			await consentSync.resetConsent();

			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('c15t-consent');
		});
	});

	describe('cross-tab synchronization', () => {
		it('should handle storage events from other tabs', () => {
			const storageListener = vi
				.mocked(addEventListener)
				.mock.calls.find((call) => call[0] === 'storage')?.[1] as (
				event: StorageEvent
			) => void;

			expect(storageListener).toBeDefined();

			// Simulate storage event from another tab
			storageListener(mockStorageEvent);

			expect(consentSync.consent).toEqual({
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			});
		});

		it('should ignore storage events from same tab', () => {
			const storageListener = vi
				.mocked(addEventListener)
				.mock.calls.find((call) => call[0] === 'storage')?.[1] as (
				event: StorageEvent
			) => void;

			const sameTabEvent = {
				...mockStorageEvent,
				key: 'c15t-consent-tab-' + consentSync.tabId,
			};

			// Should not update consent for same tab
			const originalConsent = consentSync.consent;
			storageListener(sameTabEvent);
			expect(consentSync.consent).toEqual(originalConsent);
		});
	});

	describe('conflict resolution', () => {
		it('should resolve conflicts using latest strategy', async () => {
			const conflict: ConsentConflict = {
				localConsent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: true,
					experience: false,
				},
				remoteConsent: {
					necessary: true,
					measurement: false,
					marketing: true,
					functionality: true,
					experience: true,
				},
				localTimestamp: Date.now() - 1000,
				remoteTimestamp: Date.now(),
				resolution: 'latest',
			};

			const resolved = consentSync.resolveConflict(conflict);
			expect(resolved).toEqual(conflict.remoteConsent);
		});

		it('should resolve conflicts using user-choice strategy', async () => {
			const conflict: ConsentConflict = {
				localConsent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: true,
					experience: false,
				},
				remoteConsent: {
					necessary: true,
					measurement: false,
					marketing: true,
					functionality: true,
					experience: true,
				},
				localTimestamp: Date.now() - 1000,
				remoteTimestamp: Date.now(),
				resolution: 'user-choice',
			};

			const resolved = consentSync.resolveConflict(conflict);
			expect(resolved).toEqual(conflict.localConsent);
		});

		it('should resolve conflicts using merge strategy', async () => {
			const conflict: ConsentConflict = {
				localConsent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: true,
					experience: false,
				},
				remoteConsent: {
					necessary: true,
					measurement: false,
					marketing: true,
					functionality: true,
					experience: true,
				},
				localTimestamp: Date.now() - 1000,
				remoteTimestamp: Date.now(),
				resolution: 'merge',
			};

			const resolved = consentSync.resolveConflict(conflict);
			// Merge should take the most permissive consent
			expect(resolved).toEqual({
				necessary: true,
				measurement: true,
				marketing: true,
				functionality: true,
				experience: true,
			});
		});

		it('should use custom conflict resolver', async () => {
			const customResolver = vi.fn().mockReturnValue({
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			});

			const customConsentSync = new ConsentSyncImpl(initialConsent, {
				enableCrossTabSync: true,
				conflictResolution: 'latest',
				customConflictResolver: customResolver,
			});

			const conflict: ConsentConflict = {
				localConsent: initialConsent,
				remoteConsent: {
					necessary: true,
					measurement: false,
					marketing: true,
					functionality: true,
					experience: true,
				},
				localTimestamp: Date.now() - 1000,
				remoteTimestamp: Date.now(),
				resolution: 'custom',
			};

			const resolved = customConsentSync.resolveConflict(conflict);
			expect(customResolver).toHaveBeenCalledWith(conflict);
			expect(resolved).toEqual({
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			});
		});
	});

	describe('change history', () => {
		it('should limit history entries', async () => {
			const limitedConsentSync = new ConsentSyncImpl(initialConsent, {
				maxHistoryEntries: 2,
			});

			// Add more than max entries
			for (let i = 0; i < 5; i++) {
				await limitedConsentSync.updateConsent(
					{
						...initialConsent,
						measurement: i % 2 === 0,
					},
					'test',
					`Change ${i}`
				);
			}

			const history = limitedConsentSync.getChangeHistory();
			expect(history).toHaveLength(2);
		});

		it('should track change statistics', async () => {
			await consentSync.updateConsent(
				{
					necessary: true,
					measurement: false,
					marketing: true,
					functionality: true,
					experience: true,
				},
				'user-action',
				'User clicked accept'
			);

			const stats = consentSync.getConsentStats();
			expect(stats.totalChanges).toBe(1);
		});
	});

	describe('destroy', () => {
		it('should clean up event listeners', () => {
			consentSync.destroy();

			expect(vi.mocked(removeEventListener)).toHaveBeenCalledWith(
				'storage',
				expect.any(Function)
			);
		});

		it('should clear intervals', () => {
			const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
			consentSync.destroy();

			expect(clearIntervalSpy).toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('should handle invalid consent data', async () => {
			mockLocalStorage.getItem.mockReturnValueOnce('invalid-json');

			await expect(consentSync.updateConsent(initialConsent)).rejects.toThrow();
		});

		it('should handle network errors during sync', async () => {
			// Mock network error
			vi.stubGlobal(
				'fetch',
				vi.fn().mockRejectedValue(new Error('Network error'))
			);

			await expect(consentSync.updateConsent(initialConsent)).rejects.toThrow(
				'Network error'
			);
		});
	});

	describe('tab management', () => {
		it('should generate unique tab ID', () => {
			const consentSync2 = new ConsentSyncImpl(initialConsent);
			expect(consentSync.tabId).not.toBe(consentSync2.tabId);
		});

		it('should track active tabs', () => {
			const stats = consentSync.getConsentStats();
			expect(stats.activeTabsCount).toBeGreaterThan(0);
		});
	});
});
