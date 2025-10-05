/**
 * @fileoverview Tests for ScriptManagerImpl
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	ScriptFetchError,
	ScriptLoadingError,
	ScriptManagerImpl,
} from './script-manager';
import type { AnalyticsConsent, Script } from './types';

// Mock DOM APIs
const mockScriptElement = {
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	setAttribute: vi.fn(),
	removeAttribute: vi.fn(),
	remove: vi.fn(),
	onload: null,
	onerror: null,
	src: '',
	async: false,
	defer: false,
	crossOrigin: null,
	integrity: '',
};

const mockDocument = {
	createElement: vi.fn(() => mockScriptElement),
	head: {
		appendChild: vi.fn(),
		removeChild: vi.fn(),
	},
	querySelector: vi.fn(),
};

const mockFetch = vi.fn();
const mockConsole = {
	error: vi.fn(),
	warn: vi.fn(),
	log: vi.fn(),
};

// Setup global mocks
beforeEach(() => {
	vi.stubGlobal('document', mockDocument);
	vi.stubGlobal('fetch', mockFetch);
	vi.stubGlobal('console', mockConsole);

	// Reset all mocks
	vi.clearAllMocks();
	mockScriptElement.onload = null;
	mockScriptElement.onerror = null;
	mockScriptElement.src = '';
	mockScriptElement.async = false;
	mockScriptElement.defer = false;
	mockScriptElement.crossOrigin = null;
	mockScriptElement.integrity = '';
});

describe('ScriptManagerImpl', () => {
	let scriptManager: ScriptManagerImpl;
	let mockConsent: AnalyticsConsent;

	beforeEach(() => {
		scriptManager = new ScriptManagerImpl();
		mockConsent = {
			necessary: true,
			measurement: true,
			marketing: true,
			functionality: true,
			experience: true,
		};
	});

	describe('constructor', () => {
		it('should initialize with empty state', () => {
			expect(scriptManager.getStats()).toEqual({
				totalLoaded: 0,
				totalFailed: 0,
				totalUnloaded: 0,
				cacheHits: 0,
				cacheMisses: 0,
				averageLoadTime: 0,
			});
		});
	});

	describe('loadScript', () => {
		it('should load inline script successfully', async () => {
			const script: Script = {
				id: 'test-inline',
				type: 'inline',
				content: 'console.log("test");',
				strategy: 'eager',
			};

			const result = await scriptManager.loadScript(script);

			expect(result).toEqual({
				id: 'test-inline',
				script,
				status: 'loaded',
				loadTime: expect.any(Number),
				element: mockScriptElement,
			});
			expect(mockDocument.createElement).toHaveBeenCalledWith('script');
			expect(mockScriptElement.setAttribute).toHaveBeenCalledWith(
				'data-script-id',
				'test-inline'
			);
		});

		it('should load external script successfully', async () => {
			const script: Script = {
				id: 'test-external',
				type: 'external',
				src: 'https://example.com/script.js',
				strategy: 'eager',
			};

			// Mock successful fetch
			mockFetch.mockResolvedValueOnce({
				ok: true,
				text: () => Promise.resolve('console.log("external");'),
			});

			const result = await scriptManager.loadScript(script);

			expect(result.status).toBe('loaded');
			expect(mockFetch).toHaveBeenCalledWith('https://example.com/script.js');
			expect(mockScriptElement.src).toBe('https://example.com/script.js');
		});

		it('should handle script load errors', async () => {
			const script: Script = {
				id: 'test-error',
				type: 'external',
				src: 'https://example.com/error.js',
				strategy: 'eager',
			};

			// Mock fetch error
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(scriptManager.loadScript(script)).rejects.toThrow(
				ScriptFetchError
			);
		});

		it('should respect loadOnce setting', async () => {
			const script: Script = {
				id: 'test-once',
				type: 'inline',
				content: 'console.log("once");',
				loadOnce: true,
			};

			// Load first time
			await scriptManager.loadScript(script);

			// Load second time - should return cached version
			const result = await scriptManager.loadScript(script);

			expect(result.status).toBe('loaded');
			expect(mockDocument.createElement).toHaveBeenCalledTimes(1); // Only called once
		});

		it('should filter scripts by consent', async () => {
			const script: Script = {
				id: 'test-marketing',
				type: 'inline',
				content: 'console.log("marketing");',
				requiredConsent: ['marketing'],
			};

			const restrictedConsent: AnalyticsConsent = {
				necessary: true,
				measurement: false,
				marketing: false, // No marketing consent
				functionality: false,
				experience: false,
			};

			await expect(
				scriptManager.loadScript(script, restrictedConsent)
			).rejects.toThrow(ScriptLoadingError);
		});
	});

	describe('unloadScript', () => {
		it('should unload script successfully', async () => {
			const script: Script = {
				id: 'test-unload',
				type: 'inline',
				content: 'console.log("unload");',
			};

			await scriptManager.loadScript(script);
			scriptManager.unloadScript('test-unload');

			expect(mockScriptElement.remove).toHaveBeenCalled();
			expect(scriptManager.getScriptStatus('test-unload')).toBeNull();
		});

		it('should handle unloading non-existent script', () => {
			expect(() => scriptManager.unloadScript('non-existent')).not.toThrow();
		});
	});

	describe('loadScripts', () => {
		it('should load multiple scripts', async () => {
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

			const results = await scriptManager.loadScripts(scripts, mockConsent);

			expect(results).toHaveLength(2);
			expect(results[0].status).toBe('loaded');
			expect(results[1].status).toBe('loaded');
		});

		it('should handle partial failures', async () => {
			const scripts: Script[] = [
				{
					id: 'script1',
					type: 'inline',
					content: 'console.log("1");',
				},
				{
					id: 'script2',
					type: 'external',
					src: 'https://example.com/error.js',
				},
			];

			// Mock fetch error for second script
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const results = await scriptManager.loadScripts(scripts, mockConsent);

			expect(results).toHaveLength(2);
			expect(results[0].status).toBe('loaded');
			expect(results[1].status).toBe('failed');
		});
	});

	describe('filterAndLoadScripts', () => {
		it('should filter scripts by consent and load them', async () => {
			const scripts: Script[] = [
				{
					id: 'necessary',
					type: 'inline',
					content: 'console.log("necessary");',
					requiredConsent: ['necessary'],
				},
				{
					id: 'marketing',
					type: 'inline',
					content: 'console.log("marketing");',
					requiredConsent: ['marketing'],
				},
			];

			const restrictedConsent: AnalyticsConsent = {
				necessary: true,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			};

			const results = await scriptManager.filterAndLoadScripts(
				scripts,
				restrictedConsent
			);

			expect(results).toHaveLength(1);
			expect(results[0].script.id).toBe('necessary');
		});
	});

	describe('clearAllScripts', () => {
		it('should unload all scripts', async () => {
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

			await scriptManager.loadScripts(scripts, mockConsent);
			scriptManager.clearAllScripts();

			expect(scriptManager.getScriptStatus('script1')).toBeNull();
			expect(scriptManager.getScriptStatus('script2')).toBeNull();
		});
	});

	describe('retryFailedScripts', () => {
		it('should retry failed scripts', async () => {
			const script: Script = {
				id: 'retry-script',
				type: 'external',
				src: 'https://example.com/retry.js',
			};

			// First attempt fails
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			try {
				await scriptManager.loadScript(script);
			} catch (error) {
				// Expected to fail
			}

			// Second attempt succeeds
			mockFetch.mockResolvedValueOnce({
				ok: true,
				text: () => Promise.resolve('console.log("retry success");'),
			});

			const results = await scriptManager.retryFailedScripts();

			expect(results).toHaveLength(1);
			expect(results[0].status).toBe('loaded');
		});
	});

	describe('getStats', () => {
		it('should return accurate statistics', async () => {
			const scripts: Script[] = [
				{
					id: 'success',
					type: 'inline',
					content: 'console.log("success");',
				},
				{
					id: 'failure',
					type: 'external',
					src: 'https://example.com/error.js',
				},
			];

			// Mock fetch error for second script
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await scriptManager.loadScripts(scripts, mockConsent);

			const stats = scriptManager.getStats();
			expect(stats.totalLoaded).toBe(1);
			expect(stats.totalFailed).toBe(1);
		});
	});

	describe('preloadScripts', () => {
		it('should preload scripts without executing', async () => {
			const script: Script = {
				id: 'preload',
				type: 'external',
				src: 'https://example.com/preload.js',
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				text: () => Promise.resolve('console.log("preload");'),
			});

			await scriptManager.preloadScripts([script]);

			expect(mockFetch).toHaveBeenCalledWith('https://example.com/preload.js');
			// Script should be cached but not loaded
			expect(scriptManager.getScriptStatus('preload')).toBeNull();
		});
	});

	describe('error handling', () => {
		it('should handle ScriptLoadingError', () => {
			const error = new ScriptLoadingError('Test error', 'test-script');
			expect(error.message).toBe('Test error');
			expect(error.scriptId).toBe('test-script');
			expect(error.name).toBe('ScriptLoadingError');
		});

		it('should handle ScriptFetchError', () => {
			const originalError = new Error('Network error');
			const error = new ScriptFetchError(
				'Test fetch error',
				originalError,
				'test-url'
			);
			expect(error.message).toBe('Test fetch error');
			expect(error.originalError).toBe(originalError);
			expect(error.url).toBe('test-url');
			expect(error.name).toBe('ScriptFetchError');
		});
	});
});
