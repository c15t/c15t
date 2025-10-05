/**
 * @fileoverview Tests for useScriptManager hook
 */

import { act, renderHook } from '@testing-library/react';
import type { Script } from 'c15t';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScriptManager } from './use-script-manager';

// Mock the core script manager
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

// Mock the createScriptManager function
vi.mock('c15t', () => ({
	createScriptManager: vi.fn(() => mockScriptManager),
}));

describe('useScriptManager', () => {
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
	});

	describe('initialization', () => {
		it('should initialize script manager', () => {
			const { result } = renderHook(() => useScriptManager());

			expect(result.current.scripts).toEqual({});
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBeUndefined();
			expect(typeof result.current.loadScript).toBe('function');
			expect(typeof result.current.unloadScript).toBe('function');
			expect(typeof result.current.loadScripts).toBe('function');
			expect(typeof result.current.reloadScripts).toBe('function');
			expect(typeof result.current.clearAllScripts).toBe('function');
			expect(typeof result.current.clearCache).toBe('function');
			expect(typeof result.current.getScriptStatus).toBe('function');
			expect(typeof result.current.retryFailedScripts).toBe('function');
			expect(typeof result.current.preloadScripts).toBe('function');
		});

		it('should initialize with custom options', () => {
			const options = {
				cacheSize: 50,
				retryAttempts: 3,
				retryDelay: 1000,
			};

			renderHook(() => useScriptManager(options));

			// The createScriptManager should be called with the options
			const { createScriptManager } = require('c15t');
			expect(createScriptManager).toHaveBeenCalledWith(options);
		});
	});

	describe('script loading', () => {
		it('should load single script', async () => {
			const { result } = renderHook(() => useScriptManager());

			const script: Script = {
				id: 'test-script',
				type: 'inline',
				content: 'console.log("test");',
			};

			await act(async () => {
				await result.current.loadScript(script);
			});

			expect(mockScriptManager.loadScript).toHaveBeenCalledWith(script);
		});

		it('should load multiple scripts', async () => {
			const { result } = renderHook(() => useScriptManager());

			const scripts: Script[] = [
				{
					id: 'script1',
					type: 'inline',
					content: 'console.log("1");',
				},
				{
					id: 'script2',
					type: 'inline',
					content: 'console.log("2");',
				},
			];

			await act(async () => {
				await result.current.loadScripts(scripts);
			});

			expect(mockScriptManager.loadScripts).toHaveBeenCalledWith(scripts);
		});

		it('should handle loading errors', async () => {
			const onScriptError = vi.fn();
			mockScriptManager.loadScript.mockRejectedValueOnce(
				new Error('Load failed')
			);

			const { result } = renderHook(() => useScriptManager({ onScriptError }));

			const script: Script = {
				id: 'test-script',
				type: 'inline',
				content: 'console.log("test");',
			};

			await act(async () => {
				try {
					await result.current.loadScript(script);
				} catch (error) {
					// Expected to throw
				}
			});

			expect(onScriptError).toHaveBeenCalledWith(expect.any(Error));
		});

		it('should set loading state during script loading', async () => {
			let resolvePromise: (value: any) => void;
			const promise = new Promise((resolve) => {
				resolvePromise = resolve;
			});
			mockScriptManager.loadScript.mockReturnValueOnce(promise);

			const { result } = renderHook(() => useScriptManager());

			const script: Script = {
				id: 'test-script',
				type: 'inline',
				content: 'console.log("test");',
			};

			act(() => {
				result.current.loadScript(script);
			});

			expect(result.current.loading).toBe(true);

			await act(async () => {
				resolvePromise!({
					id: 'test-script',
					script,
					status: 'loaded',
					loadTime: 100,
					element: document.createElement('script'),
				});
			});

			expect(result.current.loading).toBe(false);
		});
	});

	describe('script unloading', () => {
		it('should unload script', () => {
			const { result } = renderHook(() => useScriptManager());

			result.current.unloadScript('test-script');

			expect(mockScriptManager.unloadScript).toHaveBeenCalledWith(
				'test-script'
			);
		});

		it('should clear all scripts', () => {
			const { result } = renderHook(() => useScriptManager());

			result.current.clearAllScripts();

			expect(mockScriptManager.clearAllScripts).toHaveBeenCalled();
		});
	});

	describe('script reloading', () => {
		it('should reload scripts', async () => {
			const { result } = renderHook(() => useScriptManager());

			const scripts: Script[] = [
				{
					id: 'script1',
					type: 'inline',
					content: 'console.log("1");',
				},
			];

			await act(async () => {
				await result.current.reloadScripts(scripts);
			});

			expect(mockScriptManager.reloadScripts).toHaveBeenCalledWith(scripts);
		});

		it('should retry failed scripts', async () => {
			const { result } = renderHook(() => useScriptManager());

			await act(async () => {
				await result.current.retryFailedScripts();
			});

			expect(mockScriptManager.retryFailedScripts).toHaveBeenCalled();
		});
	});

	describe('script preloading', () => {
		it('should preload scripts', async () => {
			const { result } = renderHook(() => useScriptManager());

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
			const { result } = renderHook(() => useScriptManager());

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

			const { result } = renderHook(() => useScriptManager());

			const isLoaded = result.current.isScriptLoaded('test-script');

			expect(isLoaded).toBe(true);
		});

		it('should return false for non-loaded script', () => {
			mockScriptManager.getScriptStatus.mockReturnValue(null);

			const { result } = renderHook(() => useScriptManager());

			const isLoaded = result.current.isScriptLoaded('test-script');

			expect(isLoaded).toBe(false);
		});
	});

	describe('cache management', () => {
		it('should clear cache', () => {
			const { result } = renderHook(() => useScriptManager());

			result.current.clearCache();

			expect(mockScriptManager.clearCache).toHaveBeenCalled();
		});
	});

	describe('stats', () => {
		it('should return script manager stats', () => {
			const mockStats = {
				totalLoaded: 5,
				totalFailed: 1,
				totalUnloaded: 2,
				cacheHits: 10,
				cacheMisses: 3,
				averageLoadTime: 150,
			};

			mockScriptManager.getStats.mockReturnValue(mockStats);

			const { result } = renderHook(() => useScriptManager());

			expect(result.current.stats).toEqual(mockStats);
		});
	});

	describe('cleanup', () => {
		it('should cleanup on unmount', () => {
			const { unmount } = renderHook(() => useScriptManager());

			unmount();

			// The script manager should be destroyed
			expect(mockScriptManager.clearAllScripts).toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('should handle script loading errors gracefully', async () => {
			const onScriptError = vi.fn();
			mockScriptManager.loadScript.mockRejectedValueOnce(
				new Error('Network error')
			);

			const { result } = renderHook(() => useScriptManager({ onScriptError }));

			const script: Script = {
				id: 'test-script',
				type: 'external',
				src: 'https://example.com/script.js',
			};

			await act(async () => {
				try {
					await result.current.loadScript(script);
				} catch (error) {
					// Expected to throw
				}
			});

			expect(onScriptError).toHaveBeenCalledWith(expect.any(Error));
		});

		it('should handle script unloading errors gracefully', () => {
			mockScriptManager.unloadScript.mockImplementationOnce(() => {
				throw new Error('Unload failed');
			});

			const { result } = renderHook(() => useScriptManager());

			expect(() => {
				result.current.unloadScript('test-script');
			}).not.toThrow();
		});
	});

	describe('consent filtering', () => {
		it('should get scripts by consent', () => {
			const { result } = renderHook(() => useScriptManager());

			const consent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			result.current.getScriptsByConsent(consent);

			expect(mockScriptManager.getScriptsByConsent).toHaveBeenCalledWith(
				consent
			);
		});
	});
});
