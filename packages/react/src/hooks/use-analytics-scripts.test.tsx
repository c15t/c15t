/**
 * @fileoverview Tests for useAnalyticsScripts hook
 */

import { act, renderHook } from '@testing-library/react';
import type { AnalyticsConsent, Script } from 'c15t';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalyticsScripts } from './use-analytics-scripts';

// Mock the core modules
const mockScriptManager = {
	loadScript: vi.fn(),
	unloadScript: vi.fn(),
	loadScripts: vi.fn(),
	reloadScripts: vi.fn(),
	clearAllScripts: vi.fn(),
	clearCache: vi.fn(),
	getScriptStatus: vi.fn(),
	retryFailedScripts: vi.fn(),
	preloadScripts: vi.fn(),
	getScriptsByConsent: vi.fn(),
	getStats: vi.fn(),
};

const mockConsentSync = {
	consent: {
		necessary: true,
		measurement: true,
		marketing: false,
		functionality: true,
		experience: false,
	},
	updateConsent: vi.fn(),
	resetConsent: vi.fn(),
	getChangeHistory: vi.fn(),
	getConsentStats: vi.fn(),
	destroy: vi.fn(),
};

// Mock the core functions
vi.mock('c15t', () => ({
	createScriptManager: vi.fn(() => mockScriptManager),
	createConsentSync: vi.fn(() => mockConsentSync),
}));

describe('useAnalyticsScripts', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Setup default mock implementations
		mockScriptManager.loadScripts.mockResolvedValue([]);
		mockScriptManager.reloadScripts.mockResolvedValue([]);
		mockScriptManager.retryFailedScripts.mockResolvedValue([]);
		mockScriptManager.preloadScripts.mockResolvedValue(undefined);
		mockScriptManager.getScriptsByConsent.mockReturnValue([]);
		mockScriptManager.getStats.mockReturnValue({
			totalLoaded: 0,
			totalFailed: 0,
			totalUnloaded: 0,
			cacheHits: 0,
			cacheMisses: 0,
			averageLoadTime: 0,
		});

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
		it('should initialize with default options', () => {
			const { result } = renderHook(() => useAnalyticsScripts());

			expect(result.current.consent).toEqual(mockConsentSync.consent);
			expect(result.current.scripts).toEqual({});
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBeUndefined();
			expect(typeof result.current.loadScripts).toBe('function');
			expect(typeof result.current.updateConsent).toBe('function');
			expect(typeof result.current.resetConsent).toBe('function');
		});

		it('should initialize with custom options', () => {
			const options = {
				enableAutoLoad: true,
				enableConsentSync: true,
				scriptManagerOptions: {
					cacheSize: 50,
					retryAttempts: 3,
				},
				consentSyncOptions: {
					enableCrossTabSync: true,
					conflictResolution: 'latest' as const,
				},
			};

			renderHook(() => useAnalyticsScripts(options));

			// The core functions should be called with the options
			const { createScriptManager, createConsentSync } = require('c15t');
			expect(createScriptManager).toHaveBeenCalledWith(
				options.scriptManagerOptions
			);
			expect(createConsentSync).toHaveBeenCalledWith(
				expect.any(Object),
				options.consentSyncOptions
			);
		});
	});

	describe('script loading', () => {
		it('should load scripts based on consent', async () => {
			const { result } = renderHook(() => useAnalyticsScripts());

			const scripts: Script[] = [
				{
					id: 'test-script',
					type: 'inline',
					content: 'console.log("test");',
					requiredConsent: ['measurement'],
				},
			];

			await act(async () => {
				await result.current.loadScripts(scripts);
			});

			expect(mockScriptManager.loadScripts).toHaveBeenCalledWith(scripts);
		});

		it('should filter scripts by consent automatically', async () => {
			const { result } = renderHook(() => useAnalyticsScripts());

			const scripts: Script[] = [
				{
					id: 'necessary-script',
					type: 'inline',
					content: 'console.log("necessary");',
					requiredConsent: ['necessary'],
				},
				{
					id: 'marketing-script',
					type: 'inline',
					content: 'console.log("marketing");',
					requiredConsent: ['marketing'],
				},
			];

			// Mock consent that only allows necessary scripts
			mockConsentSync.consent = {
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			};

			await act(async () => {
				await result.current.loadScripts(scripts);
			});

			// Should only load scripts that match consent
			expect(mockScriptManager.loadScripts).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ id: 'necessary-script' }),
				])
			);
		});

		it('should handle script loading errors', async () => {
			const onScriptError = vi.fn();
			mockScriptManager.loadScripts.mockRejectedValueOnce(
				new Error('Load failed')
			);

			const { result } = renderHook(() =>
				useAnalyticsScripts({ onScriptError })
			);

			const scripts: Script[] = [
				{
					id: 'test-script',
					type: 'inline',
					content: 'console.log("test");',
				},
			];

			await act(async () => {
				try {
					await result.current.loadScripts(scripts);
				} catch (error) {
					// Expected to throw
				}
			});

			expect(onScriptError).toHaveBeenCalledWith(expect.any(Error));
		});
	});

	describe('consent management', () => {
		it('should update consent and reload scripts', async () => {
			const { result } = renderHook(() => useAnalyticsScripts());

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

			expect(mockConsentSync.updateConsent).toHaveBeenCalledWith(newConsent);
		});

		it('should reset consent', async () => {
			const { result } = renderHook(() => useAnalyticsScripts());

			await act(async () => {
				await result.current.resetConsent();
			});

			expect(mockConsentSync.resetConsent).toHaveBeenCalled();
		});

		it('should handle consent update errors', async () => {
			const onConsentError = vi.fn();
			mockConsentSync.updateConsent.mockRejectedValueOnce(
				new Error('Update failed')
			);

			const { result } = renderHook(() =>
				useAnalyticsScripts({ onConsentError })
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
	});

	describe('auto-loading', () => {
		it('should auto-load scripts when consent changes', async () => {
			const scripts: Script[] = [
				{
					id: 'auto-script',
					type: 'inline',
					content: 'console.log("auto");',
					requiredConsent: ['measurement'],
				},
			];

			const { result } = renderHook(() =>
				useAnalyticsScripts({
					enableAutoLoad: true,
					scripts,
				})
			);

			// Update consent to enable measurement
			const newConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			await act(async () => {
				await result.current.updateConsent(newConsent);
			});

			// Should automatically load scripts that match new consent
			expect(mockScriptManager.loadScripts).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ id: 'auto-script' })])
			);
		});

		it('should not auto-load when disabled', async () => {
			const scripts: Script[] = [
				{
					id: 'auto-script',
					type: 'inline',
					content: 'console.log("auto");',
					requiredConsent: ['measurement'],
				},
			];

			const { result } = renderHook(() =>
				useAnalyticsScripts({
					enableAutoLoad: false,
					scripts,
				})
			);

			// Update consent
			const newConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			await act(async () => {
				await result.current.updateConsent(newConsent);
			});

			// Should not automatically load scripts
			expect(mockScriptManager.loadScripts).not.toHaveBeenCalled();
		});
	});

	describe('script reloading', () => {
		it('should reload scripts', async () => {
			const { result } = renderHook(() => useAnalyticsScripts());

			const scripts: Script[] = [
				{
					id: 'reload-script',
					type: 'inline',
					content: 'console.log("reload");',
				},
			];

			await act(async () => {
				await result.current.reloadScripts(scripts);
			});

			expect(mockScriptManager.reloadScripts).toHaveBeenCalledWith(scripts);
		});

		it('should retry failed scripts', async () => {
			const { result } = renderHook(() => useAnalyticsScripts());

			await act(async () => {
				await result.current.retryFailedScripts();
			});

			expect(mockScriptManager.retryFailedScripts).toHaveBeenCalled();
		});
	});

	describe('script preloading', () => {
		it('should preload scripts', async () => {
			const { result } = renderHook(() => useAnalyticsScripts());

			const scripts: Script[] = [
				{
					id: 'preload-script',
					type: 'external',
					src: 'https://example.com/script.js',
				},
			];

			await act(async () => {
				await result.current.preloadScripts(scripts);
			});

			expect(mockScriptManager.preloadScripts).toHaveBeenCalledWith(scripts);
		});
	});

	describe('script status', () => {
		it('should get script status', () => {
			const { result } = renderHook(() => useAnalyticsScripts());

			result.current.getScriptStatus('test-script');

			expect(mockScriptManager.getScriptStatus).toHaveBeenCalledWith(
				'test-script'
			);
		});

		it('should check if script is loaded', () => {
			mockScriptManager.getScriptStatus.mockReturnValue({
				id: 'test-script',
				status: 'loaded',
			});

			const { result } = renderHook(() => useAnalyticsScripts());

			const isLoaded = result.current.isScriptLoaded('test-script');

			expect(isLoaded).toBe(true);
		});
	});

	describe('cache management', () => {
		it('should clear all scripts', () => {
			const { result } = renderHook(() => useAnalyticsScripts());

			result.current.clearAllScripts();

			expect(mockScriptManager.clearAllScripts).toHaveBeenCalled();
		});

		it('should clear cache', () => {
			const { result } = renderHook(() => useAnalyticsScripts());

			result.current.clearCache();

			expect(mockScriptManager.clearCache).toHaveBeenCalled();
		});
	});

	describe('statistics', () => {
		it('should return combined stats', () => {
			const mockScriptStats = {
				totalLoaded: 5,
				totalFailed: 1,
				totalUnloaded: 2,
				cacheHits: 10,
				cacheMisses: 3,
				averageLoadTime: 150,
			};

			const mockConsentStats = {
				totalChanges: 3,
				crossTabSyncs: 2,
				conflictsResolved: 1,
				lastSyncTimestamp: Date.now(),
				activeTabsCount: 2,
			};

			mockScriptManager.getStats.mockReturnValue(mockScriptStats);
			mockConsentSync.getConsentStats.mockReturnValue(mockConsentStats);

			const { result } = renderHook(() => useAnalyticsScripts());

			expect(result.current.stats).toEqual({
				scriptManager: mockScriptStats,
				consentSync: mockConsentStats,
			});
		});
	});

	describe('cleanup', () => {
		it('should cleanup on unmount', () => {
			const { unmount } = renderHook(() => useAnalyticsScripts());

			unmount();

			// Both managers should be destroyed
			expect(mockScriptManager.clearAllScripts).toHaveBeenCalled();
			expect(mockConsentSync.destroy).toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('should handle script manager errors', async () => {
			const onScriptError = vi.fn();
			mockScriptManager.loadScripts.mockRejectedValueOnce(
				new Error('Script error')
			);

			const { result } = renderHook(() =>
				useAnalyticsScripts({ onScriptError })
			);

			const scripts: Script[] = [
				{
					id: 'error-script',
					type: 'inline',
					content: 'console.log("error");',
				},
			];

			await act(async () => {
				try {
					await result.current.loadScripts(scripts);
				} catch (error) {
					// Expected to throw
				}
			});

			expect(onScriptError).toHaveBeenCalledWith(expect.any(Error));
		});

		it('should handle consent sync errors', async () => {
			const onConsentError = vi.fn();
			mockConsentSync.updateConsent.mockRejectedValueOnce(
				new Error('Consent error')
			);

			const { result } = renderHook(() =>
				useAnalyticsScripts({ onConsentError })
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
	});

	describe('consent change callbacks', () => {
		it('should call onConsentChange callback', async () => {
			const onConsentChange = vi.fn();

			const { result } = renderHook(() =>
				useAnalyticsScripts({ onConsentChange })
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
});
