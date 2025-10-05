/**
 * @fileoverview Tests for useAnalytics hook
 */

import { act, renderHook } from '@testing-library/react';
import type { AnalyticsConsent, Script } from 'c15t';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsentStateContext } from '../context/consent-manager-context';
import { useAnalytics } from './use-analytics';

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

const mockAnalytics = {
	track: vi.fn(),
	page: vi.fn(),
	identify: vi.fn(),
	group: vi.fn(),
	alias: vi.fn(),
	consent: vi.fn(),
};

const mockContextValue = {
	analytics: mockAnalytics,
	scriptManager: mockScriptManager,
	consentSync: mockConsentSync,
	store: {} as any,
	translations: {} as any,
	theme: {} as any,
};

const createWrapper = (contextValue = mockContextValue) => {
	return ({ children }: { children: React.ReactNode }) => (
		<ConsentStateContext.Provider value={contextValue}>
			{children}
		</ConsentStateContext.Provider>
	);
};

describe('useAnalytics', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Setup default mock implementations
		mockScriptManager.loadScript.mockResolvedValue({
			id: 'test-script',
			script: {} as Script,
			status: 'loaded',
			loadTime: 100,
			element: document.createElement('script'),
		});

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

		mockAnalytics.track.mockResolvedValue(undefined);
		mockAnalytics.page.mockResolvedValue(undefined);
		mockAnalytics.identify.mockResolvedValue(undefined);
		mockAnalytics.group.mockResolvedValue(undefined);
		mockAnalytics.alias.mockResolvedValue(undefined);
		mockAnalytics.consent.mockResolvedValue(undefined);
	});

	describe('basic functionality', () => {
		it('should return analytics state and methods', () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			expect(result.current.consent).toEqual(mockConsentSync.consent);
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBeUndefined();
			expect(typeof result.current.track).toBe('function');
			expect(typeof result.current.page).toBe('function');
			expect(typeof result.current.identify).toBe('function');
			expect(typeof result.current.group).toBe('function');
			expect(typeof result.current.alias).toBe('function');
		});

		it('should throw error when used outside provider', () => {
			expect(() => {
				renderHook(() => useAnalytics());
			}).toThrow('useAnalytics must be used within a ConsentManagerProvider');
		});
	});

	describe('script management', () => {
		it('should load scripts successfully', async () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			const scripts: Script[] = [
				{
					id: 'test-script',
					type: 'inline',
					content: 'console.log("test");',
				},
			];

			await act(async () => {
				await result.current.loadScripts(scripts);
			});

			expect(mockScriptManager.loadScripts).toHaveBeenCalledWith(scripts);
		});

		it('should handle script loading errors', async () => {
			const onScriptError = vi.fn();
			mockScriptManager.loadScripts.mockRejectedValueOnce(
				new Error('Load failed')
			);

			const { result } = renderHook(() => useAnalytics({ onScriptError }), {
				wrapper: createWrapper(),
			});

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

		it('should unload scripts', async () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				result.current.unloadScript('test-script');
			});

			expect(mockScriptManager.unloadScript).toHaveBeenCalledWith(
				'test-script'
			);
		});

		it('should reload scripts', async () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			const scripts: Script[] = [
				{
					id: 'test-script',
					type: 'inline',
					content: 'console.log("test");',
				},
			];

			await act(async () => {
				await result.current.reloadScripts(scripts);
			});

			expect(mockScriptManager.reloadScripts).toHaveBeenCalledWith(scripts);
		});

		it('should retry failed scripts', async () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.retryFailedScripts();
			});

			expect(mockScriptManager.retryFailedScripts).toHaveBeenCalled();
		});

		it('should preload scripts', async () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			const scripts: Script[] = [
				{
					id: 'test-script',
					type: 'external',
					src: 'https://example.com/script.js',
				},
			];

			await act(async () => {
				await result.current.preloadScripts(scripts);
			});

			expect(mockScriptManager.preloadScripts).toHaveBeenCalledWith(scripts);
		});

		it('should get script status', () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

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

			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			const isLoaded = result.current.isScriptLoaded('test-script');

			expect(isLoaded).toBe(true);
		});

		it('should get scripts by consent', () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			result.current.getScriptsByConsent(mockConsentSync.consent);

			expect(mockScriptManager.getScriptsByConsent).toHaveBeenCalledWith(
				mockConsentSync.consent
			);
		});
	});

	describe('analytics tracking', () => {
		it('should track events', async () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.track('test-event', { property: 'value' });
			});

			expect(mockAnalytics.track).toHaveBeenCalledWith({
				name: 'test-event',
				properties: { property: 'value' },
			});
		});

		it('should track page views', async () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.page('Homepage', { section: 'hero' });
			});

			expect(mockAnalytics.page).toHaveBeenCalledWith({
				name: 'Homepage',
				properties: { section: 'hero' },
			});
		});

		it('should identify users', async () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.identify('user-123', {
					email: 'test@example.com',
				});
			});

			expect(mockAnalytics.identify).toHaveBeenCalledWith({
				userId: 'user-123',
				traits: { email: 'test@example.com' },
			});
		});

		it('should group users', async () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.group('org-456', { name: 'Acme Corp' });
			});

			expect(mockAnalytics.group).toHaveBeenCalledWith({
				groupId: 'org-456',
				traits: { name: 'Acme Corp' },
			});
		});

		it('should alias users', async () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.alias('new-user-123', 'old-user-456');
			});

			expect(mockAnalytics.alias).toHaveBeenCalledWith({
				userId: 'new-user-123',
				previousId: 'old-user-456',
			});
		});

		it('should handle tracking errors gracefully', async () => {
			mockAnalytics.track.mockRejectedValueOnce(new Error('Tracking failed'));

			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.track('test-event', { property: 'value' });
			});

			// Should not throw, but log error
			expect(mockAnalytics.track).toHaveBeenCalled();
		});
	});

	describe('consent management', () => {
		it('should update consent', async () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

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
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.resetConsent();
			});

			expect(mockConsentSync.resetConsent).toHaveBeenCalled();
		});
	});

	describe('utility functions', () => {
		it('should clear all scripts', () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			result.current.clearAllScripts();

			expect(mockScriptManager.clearAllScripts).toHaveBeenCalled();
		});

		it('should clear cache', () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			result.current.clearCache();

			expect(mockScriptManager.clearCache).toHaveBeenCalled();
		});

		it('should get stats', () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			const stats = result.current.stats;

			expect(stats).toEqual({
				scriptManager: {
					totalLoaded: 0,
					totalFailed: 0,
					totalUnloaded: 0,
					cacheHits: 0,
					cacheMisses: 0,
					averageLoadTime: 0,
				},
				consentSync: {
					totalChanges: 0,
					crossTabSyncs: 0,
					conflictsResolved: 0,
					lastSyncTimestamp: 0,
					activeTabsCount: 1,
				},
			});
		});
	});

	describe('options handling', () => {
		it('should call onScriptLoad callback', async () => {
			const onScriptLoad = vi.fn();
			const mockLoadedScript = {
				id: 'test-script',
				script: {} as Script,
				status: 'loaded',
				loadTime: 100,
				element: document.createElement('script'),
			};

			mockScriptManager.loadScripts.mockResolvedValueOnce([mockLoadedScript]);

			const { result } = renderHook(() => useAnalytics({ onScriptLoad }), {
				wrapper: createWrapper(),
			});

			const scripts: Script[] = [
				{
					id: 'test-script',
					type: 'inline',
					content: 'console.log("test");',
				},
			];

			await act(async () => {
				await result.current.loadScripts(scripts);
			});

			expect(onScriptLoad).toHaveBeenCalledWith(mockLoadedScript);
		});

		it('should call onScriptError callback', async () => {
			const onScriptError = vi.fn();
			const error = new Error('Script load failed');
			mockScriptManager.loadScripts.mockRejectedValueOnce(error);

			const { result } = renderHook(() => useAnalytics({ onScriptError }), {
				wrapper: createWrapper(),
			});

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
				} catch (e) {
					// Expected to throw
				}
			});

			expect(onScriptError).toHaveBeenCalledWith(error);
		});
	});

	describe('individual hooks', () => {
		it('should provide useTrack hook', () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			expect(typeof result.current.track).toBe('function');
		});

		it('should provide usePage hook', () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			expect(typeof result.current.page).toBe('function');
		});

		it('should provide useIdentify hook', () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			expect(typeof result.current.identify).toBe('function');
		});

		it('should provide useGroup hook', () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			expect(typeof result.current.group).toBe('function');
		});

		it('should provide useAlias hook', () => {
			const { result } = renderHook(() => useAnalytics(), {
				wrapper: createWrapper(),
			});

			expect(typeof result.current.alias).toBe('function');
		});
	});
});
