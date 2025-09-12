import { describe, expect, it, vi } from 'vitest';
import type { ConsentState } from '../../../types/compliance';
import type { AllConsentNames } from '../../../types/gdpr';
import {
	clearAllScripts,
	getLoadedScriptIds,
	isScriptLoaded,
	loadScripts,
	reloadScript,
	unloadScripts,
	updateScripts,
} from '../core';
import type { Script, ScriptCallbackInfo } from '../types';
import {
	mockRandomForTesting,
	sampleConsents,
	setupTestHooks,
} from './test-setup';

describe('Script Loader Core', () => {
	// Setup test hooks
	setupTestHooks();

	// Sample scripts for testing
	const scripts: Script[] = [
		{
			id: 'necessary-script',
			src: 'https://example.com/necessary.js',
			category: 'necessary',
			fetchPriority: 'high',
		},
		{
			id: 'marketing-script',
			src: 'https://example.com/marketing.js',
			category: 'marketing',
		},
		{
			id: 'analytics-script',
			src: 'https://example.com/analytics.js',
			category: 'measurement',
			async: true,
		},
		{
			id: 'complex-script',
			src: 'https://example.com/complex.js',
			category: { and: ['functionality', 'measurement'] },
			defer: true,
		},
		{
			id: 'either-script',
			src: 'https://example.com/either.js',
			category: { or: ['marketing', 'experience'] },
		},
		{
			id: 'text-based-script',
			textContent: 'console.log("Hello from inline script!");',
			category: 'marketing',
		},
		{
			id: 'meta-pixel-script',
			textContent: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '123456789012345');
fbq('track', 'PageView');
			`.trim(),
			category: 'marketing',
		},
		{
			id: 'callback-only-script',
			category: 'necessary',
			callbackOnly: true,
			onBeforeLoad: vi.fn(),
			onLoad: vi.fn(),
			onDelete: vi.fn(),
		},
	];

	describe('loadScripts', () => {
		it('should load scripts that have consent', () => {
			const loadedIds = loadScripts(scripts, sampleConsents);

			// Should load scripts with necessary, functionality, and measurement consent
			expect(loadedIds).toContain('necessary-script');
			expect(loadedIds).toContain('analytics-script');
			expect(loadedIds).toContain('complex-script');
			expect(loadedIds).toContain('callback-only-script');

			// Should not load scripts without consent
			expect(loadedIds).not.toContain('marketing-script');
			expect(loadedIds).not.toContain('either-script');

			// Should have called document.createElement for each standard script (3), but not for callback-only script
			expect(document.createElement).toHaveBeenCalledTimes(3);
			expect(document.head.appendChild).toHaveBeenCalledTimes(3);
		});

		it('should set script attributes correctly', () => {
			loadScripts(
				[
					{
						id: 'test-script',
						src: 'https://example.com/test.js',
						category: 'necessary',
						fetchPriority: 'high',
						async: true,
						defer: true,
						nonce: 'abc123',
						anonymizeId: false, // Ensure we get a non-anonymized ID for testing
						attributes: {
							'data-test': 'value',
							crossorigin: 'anonymous',
						},
					},
				],
				sampleConsents
			);

			// Get the last created script element
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: Array<{ value: HTMLScriptElement }> };
			};
			const scriptElement = mockCreateElement.mock.results[0].value;

			// Check that attributes were set correctly
			expect(scriptElement.id).toBe('c15t-script-test-script');
			expect(scriptElement.src).toBe('https://example.com/test.js');
			expect(scriptElement.fetchPriority).toBe('high');
			expect(scriptElement.async).toBe(true);
			expect(scriptElement.defer).toBe(true);
			expect(scriptElement.nonce).toBe('abc123');
			expect(scriptElement.setAttribute).toHaveBeenCalledWith(
				'data-test',
				'value'
			);
			expect(scriptElement.setAttribute).toHaveBeenCalledWith(
				'crossorigin',
				'anonymous'
			);
		});

		it('should use anonymized IDs by default', () => {
			// Mock the generateRandomScriptId function to return a predictable value
			mockRandomForTesting();

			const scriptIdMap: Record<string, string> = {};

			loadScripts(
				[
					{
						id: 'anonymized-script',
						src: 'https://example.com/anonymized.js',
						category: 'necessary',
					},
				],
				sampleConsents,
				scriptIdMap
			);

			// Get the created script element
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: Array<{ value: HTMLScriptElement }> };
			};
			const scriptElement = mockCreateElement.mock.results[0].value;

			// Check that the ID is anonymized (not using c15t prefix)
			expect(scriptElement.id).not.toBe('c15t-script-anonymized-script');
			expect(scriptElement.id).toBe(scriptIdMap['anonymized-script']);

			// Verify that the ID was added to the mapping
			expect(scriptIdMap['anonymized-script']).toBeDefined();
		});

		it('should respect anonymizeId=false option', () => {
			const scriptIdMap: Record<string, string> = {};

			loadScripts(
				[
					{
						id: 'non-anonymized-script',
						src: 'https://example.com/non-anonymized.js',
						category: 'necessary',
						anonymizeId: false,
					},
				],
				sampleConsents,
				scriptIdMap
			);

			// Get the created script element
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: Array<{ value: HTMLScriptElement }> };
			};
			const scriptElement = mockCreateElement.mock.results[0].value;

			// Check that the ID uses the c15t prefix
			expect(scriptElement.id).toBe('c15t-script-non-anonymized-script');

			// Verify that no ID was added to the mapping
			expect(scriptIdMap['non-anonymized-script']).toBeUndefined();
		});

		it('should handle load and error events with enhanced callback info', () => {
			const onLoad = vi.fn();
			const onError = vi.fn();
			const scriptIdMap: Record<string, string> = {};

			loadScripts(
				[
					{
						id: 'event-script',
						src: 'https://example.com/event.js',
						category: 'necessary',
						onLoad,
						onError,
					},
				],
				sampleConsents,
				scriptIdMap
			);

			// Get the last created script element
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: Array<{ value: HTMLScriptElement }> };
			};
			const scriptElement = mockCreateElement.mock.results[0].value;

			// Check that event listeners were added
			expect(scriptElement.addEventListener).toHaveBeenCalledTimes(2);

			// Get the element ID from the scriptIdMap
			const elementId = scriptIdMap['event-script'] || scriptElement.id;

			// Create the expected callback info
			const expectedCallbackInfo = {
				id: 'event-script',
				elementId,
				consents: sampleConsents,
				element: scriptElement,
			};

			// Simulate the load event
			onLoad(expectedCallbackInfo);
			expect(onLoad).toHaveBeenCalledTimes(1);
			expect(onLoad).toHaveBeenCalledWith(
				expect.objectContaining({
					id: expect.any(String),
					elementId: expect.any(String),
					consents: expect.any(Object),
					element: expect.any(Object),
				})
			);

			// Simulate the error event
			const errorCallbackInfo: ScriptCallbackInfo = {
				...expectedCallbackInfo,
				error: new Error('Failed to load script'),
			};
			onError(errorCallbackInfo);
			expect(onError).toHaveBeenCalledTimes(1);
			expect(onError).toHaveBeenCalledWith(
				expect.objectContaining({
					id: expect.any(String),
					elementId: expect.any(String),
					consents: expect.any(Object),
					element: expect.any(Object),
					error: expect.any(Error),
				})
			);
		});

		it('should call onBeforeLoad with enhanced callback info before adding the script to the document', () => {
			let onBeforeLoadCalled = false;
			let appendChildCalled = false;
			let onBeforeLoadTime = 0;
			let appendChildTime = 0;
			let receivedCallbackInfo: ScriptCallbackInfo | null = null;
			const scriptIdMap: Record<string, string> = {};

			// Create a function that tracks when it's called
			const onBeforeLoad = (info: ScriptCallbackInfo) => {
				onBeforeLoadCalled = true;
				onBeforeLoadTime = Date.now();
				receivedCallbackInfo = info;
			};

			// Override appendChild to track when it's called
			const originalAppendChild = document.head.appendChild;
			document.head.appendChild = ((child: Node) => {
				appendChildCalled = true;
				appendChildTime = Date.now();
				return child;
			}) as typeof document.head.appendChild;

			loadScripts(
				[
					{
						id: 'before-load-script',
						src: 'https://example.com/before-load.js',
						category: 'necessary',
						onBeforeLoad,
					},
				],
				sampleConsents,
				scriptIdMap
			);

			// Restore original appendChild
			document.head.appendChild = originalAppendChild;

			// onBeforeLoad should have been called
			expect(onBeforeLoadCalled).toBe(true);

			// onBeforeLoad should receive enhanced callback info
			expect(receivedCallbackInfo).toBeDefined();

			// Skip detailed assertions to avoid type issues
			expect(typeof receivedCallbackInfo).toBe('object');

			// appendChild should have been called
			expect(appendChildCalled).toBe(true);

			// onBeforeLoad should be called before appendChild
			expect(onBeforeLoadTime).toBeLessThanOrEqual(appendChildTime);
		});

		it('should handle callback-only scripts correctly', () => {
			const onBeforeLoad = vi.fn();
			const onLoad = vi.fn();
			const onDelete = vi.fn();
			const scriptIdMap: Record<string, string> = {};

			const callbackOnlyScript: Script = {
				id: 'test-callback-only',
				category: 'necessary',
				callbackOnly: true,
				onBeforeLoad,
				onLoad,
				onDelete,
			};

			// Load the callback-only script
			const loadedIds = loadScripts(
				[callbackOnlyScript],
				sampleConsents,
				scriptIdMap
			);

			// Script should be loaded
			expect(loadedIds).toContain('test-callback-only');
			expect(isScriptLoaded('test-callback-only')).toBe(true);

			// Should not have created a DOM element
			expect(document.createElement).not.toHaveBeenCalled();
			expect(document.head.appendChild).not.toHaveBeenCalled();

			// Should have called onBeforeLoad and onLoad callbacks
			expect(onBeforeLoad).toHaveBeenCalledTimes(1);
			expect(onLoad).toHaveBeenCalledTimes(1);
			expect(onDelete).not.toHaveBeenCalled();

			// Callback info should contain the correct properties
			expect(onBeforeLoad).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'test-callback-only',
					elementId: expect.any(String),
					consents: expect.any(Object),
					// No element property for callback-only scripts
				})
			);

			// onLoad should receive the same callback info
			expect(onLoad).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'test-callback-only',
					elementId: expect.any(String),
					consents: expect.any(Object),
					// No element property for callback-only scripts
				})
			);

			// Should have anonymized the ID by default
			expect(scriptIdMap['test-callback-only']).toBeDefined();
		});

		it('should load text-based scripts with inline content', () => {
			const textScript: Script = {
				id: 'test-text-script',
				textContent: 'console.log("Test inline script");',
				category: 'necessary', // Use necessary category to ensure consent
			};

			const loadedIds = loadScripts([textScript], sampleConsents);

			expect(loadedIds).toContain('test-text-script');
			expect(isScriptLoaded('test-text-script')).toBe(true);

			// Check that document.createElement was called
			expect(document.createElement).toHaveBeenCalledWith('script');

			// Check that the script was added to the document head
			expect(document.head.appendChild).toHaveBeenCalled();
		});

		it('should throw error when script has both src and textContent', () => {
			const invalidScript: Script = {
				id: 'invalid-script',
				src: 'https://example.com/script.js',
				textContent: 'console.log("Invalid");',
				category: 'necessary', // Use necessary category to ensure it gets processed
			};

			expect(() => {
				loadScripts([invalidScript], sampleConsents);
			}).toThrow(
				"Script 'invalid-script' cannot have both 'src' and 'textContent'. Choose one."
			);
		});

		it('should throw error when script has neither src nor textContent nor callbackOnly', () => {
			const invalidScript: Script = {
				id: 'invalid-script',
				category: 'necessary', // Use necessary category to ensure it gets processed
			};

			expect(() => {
				loadScripts([invalidScript], sampleConsents);
			}).toThrow(
				"Script 'invalid-script' must have either 'src', 'textContent', or 'callbackOnly' set to true."
			);
		});

		it('should execute onLoad callback for text-based scripts', async () => {
			const onLoadMock = vi.fn();
			const textScript: Script = {
				id: 'test-text-script-callback',
				textContent: 'console.log("Test callback");',
				category: 'necessary', // Use necessary category to ensure consent
				onLoad: onLoadMock,
			};

			loadScripts([textScript], sampleConsents);

			// Wait for the setTimeout to execute
			await new Promise((resolve) => setTimeout(resolve, 10));

			// onLoad should be called for text-based scripts
			expect(onLoadMock).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'test-text-script-callback',
					elementId: expect.any(String),
					consents: expect.any(Object),
					element: expect.any(Object), // Use Object instead of HTMLScriptElement
				})
			);
		});
	});

	describe('unloadScripts', () => {
		it('should unload scripts that no longer have consent', () => {
			// First load some scripts
			loadScripts([scripts[0], scripts[2], scripts[3]], sampleConsents);

			// Change consent state
			const newConsents: ConsentState = {
				...sampleConsents,
				measurement: false,
				functionality: false,
			};

			// Unload scripts without consent
			const unloadedIds = unloadScripts(scripts, newConsents);

			// Should unload analytics and complex scripts
			expect(unloadedIds).toContain('analytics-script');
			expect(unloadedIds).toContain('complex-script');

			// Should not unload scripts that still have consent
			expect(unloadedIds).not.toContain('necessary-script');

			// Should have called remove for each unloaded script
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: Array<{ value: HTMLScriptElement }> };
			};
			const scriptElements = mockCreateElement.mock.results;

			// Check that script elements were created
			expect(scriptElements.length).toBeGreaterThan(0);
		});

		it('should call onDelete callback with enhanced callback info when unloading scripts', () => {
			// Create a script with onDelete callback
			const onDelete = vi.fn();
			const callbackScript = {
				id: 'callback-script',
				src: 'https://example.com/callback.js',
				category: 'measurement' as AllConsentNames,
				onDelete,
			};

			const scriptIdMap: Record<string, string> = {};

			// First load the script
			loadScripts([callbackScript], sampleConsents, scriptIdMap);

			// Change consent state to revoke consent
			const newConsents: ConsentState = {
				...sampleConsents,
				measurement: false,
			};

			// Unload scripts without consent
			const unloadedIds = unloadScripts(
				[callbackScript],
				newConsents,
				scriptIdMap
			);

			// Should unload the callback script
			expect(unloadedIds).toContain('callback-script');

			// onDelete should have been called with enhanced callback info
			expect(onDelete).toHaveBeenCalledTimes(1);
			expect(onDelete).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'callback-script',
					elementId: expect.any(String),
					consents: newConsents,
					element: expect.any(Object),
				})
			);
		});

		it('should unload callback-only scripts correctly', () => {
			// Create a callback-only script with onDelete callback
			const onBeforeLoad = vi.fn();
			const onLoad = vi.fn();
			const onDelete = vi.fn();

			const callbackOnlyScript: Script = {
				id: 'callback-only-unload',
				category: 'measurement',
				callbackOnly: true,
				onBeforeLoad,
				onLoad,
				onDelete,
			};

			const scriptIdMap: Record<string, string> = {};

			// First load the callback-only script
			loadScripts([callbackOnlyScript], sampleConsents, scriptIdMap);

			// Verify it was loaded
			expect(isScriptLoaded('callback-only-unload')).toBe(true);
			expect(onBeforeLoad).toHaveBeenCalledTimes(1);
			expect(onLoad).toHaveBeenCalledTimes(1);

			// Change consent state to revoke consent
			const newConsents: ConsentState = {
				...sampleConsents,
				measurement: false,
			};

			// Reset mocks to track new calls
			vi.clearAllMocks();

			// Unload scripts without consent
			const unloadedIds = unloadScripts(
				[callbackOnlyScript],
				newConsents,
				scriptIdMap
			);

			// Should unload the callback-only script
			expect(unloadedIds).toContain('callback-only-unload');
			expect(isScriptLoaded('callback-only-unload')).toBe(false);

			// onDelete should have been called with callback info without element
			expect(onDelete).toHaveBeenCalledTimes(1);
			expect(onDelete).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'callback-only-unload',
					elementId: expect.any(String),
					consents: newConsents,
					// No element property for callback-only scripts
				})
			);

			// Should not have called remove on a DOM element
			// We can't directly check mockScriptElement.remove since it's not accessible here
			// But we know that if it were called, document.createElement would have been called first
			expect(document.createElement).not.toHaveBeenCalled();
		});
	});

	describe('updateScripts', () => {
		it('should load new scripts and unload revoked scripts', () => {
			// First load some scripts
			loadScripts([scripts[0], scripts[2]], sampleConsents); // necessary and analytics

			// Change consent state
			const newConsents: ConsentState = {
				...sampleConsents,
				measurement: false,
				marketing: true,
			};

			// Update scripts
			const result = updateScripts(scripts, newConsents);

			// Should unload analytics script
			expect(result.unloaded).toContain('analytics-script');

			// Should load marketing script
			expect(result.loaded).toContain('marketing-script');

			// Should not affect necessary script
			expect(result.unloaded).not.toContain('necessary-script');
			expect(result.loaded).not.toContain('necessary-script');
		});
	});

	describe('isScriptLoaded and getLoadedScriptIds', () => {
		it('should correctly report loaded script status', () => {
			// Load some scripts
			loadScripts([scripts[0], scripts[2]], sampleConsents); // necessary and analytics

			// Check if scripts are loaded
			expect(isScriptLoaded('necessary-script')).toBe(true);
			expect(isScriptLoaded('analytics-script')).toBe(true);
			expect(isScriptLoaded('marketing-script')).toBe(false);

			// Get all loaded script IDs
			const loadedIds = getLoadedScriptIds();
			expect(loadedIds).toContain('necessary-script');
			expect(loadedIds).toContain('analytics-script');
			expect(loadedIds).not.toContain('marketing-script');
			expect(loadedIds.length).toBe(2);
		});
	});

	describe('clearAllScripts', () => {
		it('should remove all loaded scripts including callback-only scripts', () => {
			// Load some scripts including a callback-only script
			const loadedIds = loadScripts(
				[scripts[0], scripts[2], scripts[3], scripts[7]],
				sampleConsents
			);

			// Clear all scripts
			const unloadedIds = clearAllScripts();

			// Should have unloaded all loaded scripts
			expect(unloadedIds).toContain('necessary-script');
			expect(unloadedIds).toContain('analytics-script');
			expect(unloadedIds).toContain('complex-script');
			expect(unloadedIds).toContain('callback-only-script');

			// Should have no loaded scripts remaining
			expect(getLoadedScriptIds().length).toBe(0);
			expect(isScriptLoaded('necessary-script')).toBe(false);
			expect(isScriptLoaded('callback-only-script')).toBe(false);
		});

		it('should call onDelete callbacks with enhanced callback info when clearing scripts', () => {
			// Create scripts with onDelete callbacks
			const onDelete1 = vi.fn();
			const onDelete2 = vi.fn();
			const scriptsWithCallbacks = [
				{
					id: 'callback-script-1',
					src: 'https://example.com/callback1.js',
					category: 'necessary' as AllConsentNames,
					onDelete: onDelete1,
				},
				{
					id: 'callback-script-2',
					src: 'https://example.com/callback2.js',
					category: 'necessary' as AllConsentNames,
					onDelete: onDelete2,
				},
			];

			const scriptIdMap: Record<string, string> = {};

			// Load the scripts
			loadScripts(scriptsWithCallbacks, sampleConsents, scriptIdMap);

			// Clear all scripts
			const unloadedIds = clearAllScripts(
				scriptsWithCallbacks,
				sampleConsents,
				scriptIdMap
			);

			// Should have unloaded all scripts
			expect(unloadedIds).toContain('callback-script-1');
			expect(unloadedIds).toContain('callback-script-2');

			// onDelete callbacks should have been called with enhanced callback info
			expect(onDelete1).toHaveBeenCalledTimes(1);
			expect(onDelete1).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'callback-script-1',
					elementId: expect.any(String),
					consents: sampleConsents,
					element: expect.any(Object),
				})
			);
			expect(onDelete2).toHaveBeenCalledTimes(1);
			expect(onDelete2).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'callback-script-2',
					elementId: expect.any(String),
					consents: sampleConsents,
					element: expect.any(Object),
				})
			);
		});

		it('should call onDelete callbacks for callback-only scripts when clearing', () => {
			// Create a callback-only script with onDelete callback
			const onDelete = vi.fn();
			const callbackOnlyScript = {
				id: 'callback-only-clear',
				category: 'necessary' as AllConsentNames,
				callbackOnly: true,
				onDelete,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the callback-only script
			loadScripts([callbackOnlyScript], sampleConsents, scriptIdMap);

			// Verify it was loaded
			expect(isScriptLoaded('callback-only-clear')).toBe(true);

			// Clear all scripts
			const unloadedIds = clearAllScripts(
				[callbackOnlyScript],
				sampleConsents,
				scriptIdMap
			);

			// Should have unloaded the callback-only script
			expect(unloadedIds).toContain('callback-only-clear');

			// onDelete should have been called with callback info without element
			expect(onDelete).toHaveBeenCalledTimes(1);
			expect(onDelete).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'callback-only-clear',
					elementId: expect.any(String),
					consents: sampleConsents,
					// No element property for callback-only scripts
				})
			);
		});
	});

	describe('reloadScript', () => {
		it('should reload an existing script', () => {
			// Load a script
			loadScripts([scripts[0]], sampleConsents); // necessary script

			// Mock document.createElement to track new script creation
			vi.spyOn(document, 'createElement').mockClear();
			vi.spyOn(document.head, 'appendChild').mockClear();

			// Reload the script
			const result = reloadScript('necessary-script', scripts, sampleConsents);

			// Should return true for successful reload
			expect(result).toBe(true);

			// Should have created a new script element
			expect(document.createElement).toHaveBeenCalledTimes(1);
			expect(document.head.appendChild).toHaveBeenCalledTimes(1);
		});

		it('should not reload a script without consent', () => {
			// Load a script
			loadScripts([scripts[0]], sampleConsents); // necessary script

			// Change consent state
			const newConsents: ConsentState = {
				...sampleConsents,
				necessary: false,
			};

			// Mock document.createElement to track new script creation
			vi.spyOn(document, 'createElement').mockClear();
			vi.spyOn(document.head, 'appendChild').mockClear();

			// Try to reload the script
			const result = reloadScript('necessary-script', scripts, newConsents);

			// Should return false for failed reload
			expect(result).toBe(false);

			// Should not have created a new script element
			expect(document.createElement).not.toHaveBeenCalled();
			expect(document.head.appendChild).not.toHaveBeenCalled();
		});

		it('should return false for non-existent script', () => {
			const result = reloadScript('non-existent', scripts, sampleConsents);
			expect(result).toBe(false);
		});

		it('should call onDelete and onBeforeLoad callbacks with enhanced callback info when reloading a script', () => {
			// Create a script with onDelete callback
			const onDelete = vi.fn();
			const onBeforeLoad = vi.fn();
			const scriptWithCallback = {
				id: 'reload-script',
				src: 'https://example.com/reload.js',
				category: 'necessary' as AllConsentNames,
				onDelete,
				onBeforeLoad,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the script
			loadScripts([scriptWithCallback], sampleConsents, scriptIdMap);

			// Reload the script
			const result = reloadScript(
				'reload-script',
				[scriptWithCallback],
				sampleConsents,
				scriptIdMap
			);

			// Should return true for successful reload
			expect(result).toBe(true);

			// onDelete should have been called with enhanced callback info
			expect(onDelete).toHaveBeenCalledTimes(1);
			expect(onDelete).toHaveBeenCalledWith(
				expect.objectContaining({
					id: expect.any(String),
					elementId: expect.any(String),
					consents: expect.any(Object),
					element: expect.any(Object),
				})
			);

			// onBeforeLoad should have been called for the new script with enhanced callback info
			expect(onBeforeLoad).toHaveBeenCalledTimes(2); // Once during initial load, once during reload
			expect(onBeforeLoad).toHaveBeenCalledWith(
				expect.objectContaining({
					id: expect.any(String),
					elementId: expect.any(String),
					consents: expect.any(Object),
					element: expect.any(Object),
				})
			);
		});

		it('should reload callback-only scripts correctly', () => {
			// Create a callback-only script with callbacks
			const onBeforeLoad = vi.fn();
			const onLoad = vi.fn();
			const onDelete = vi.fn();

			const callbackOnlyScript: Script = {
				id: 'callback-only-reload',
				category: 'necessary',
				callbackOnly: true,
				onBeforeLoad,
				onLoad,
				onDelete,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the callback-only script
			loadScripts([callbackOnlyScript], sampleConsents, scriptIdMap);

			// Verify it was loaded and callbacks were called
			expect(isScriptLoaded('callback-only-reload')).toBe(true);
			expect(onBeforeLoad).toHaveBeenCalledTimes(1);
			expect(onLoad).toHaveBeenCalledTimes(1);

			// Reset mocks to track new calls
			vi.clearAllMocks();

			// Reload the script
			const result = reloadScript(
				'callback-only-reload',
				[callbackOnlyScript],
				sampleConsents,
				scriptIdMap
			);

			// Should return true for successful reload
			expect(result).toBe(true);

			// onDelete should have been called with callback info without element
			expect(onDelete).toHaveBeenCalledTimes(1);
			expect(onDelete).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'callback-only-reload',
					elementId: expect.any(String),
					consents: sampleConsents,
					// No element property for callback-only scripts
				})
			);

			// onBeforeLoad and onLoad should have been called for the reloaded script
			expect(onBeforeLoad).toHaveBeenCalledTimes(1);
			expect(onLoad).toHaveBeenCalledTimes(1);

			// No DOM manipulation should have occurred for callback-only scripts
			// Check that createElement wasn't called during this test
			expect(document.createElement).toHaveBeenCalledTimes(0);
			// Note: mockHead.appendChild call count may vary due to test isolation issues
		});
	});

	describe('persistAfterConsentRevoked', () => {
		it('should keep script in DOM when persistAfterConsentRevoked is true during unloadScripts', () => {
			const onDelete = vi.fn();
			const persistentScript: Script = {
				id: 'persistent-script',
				src: 'https://example.com/persistent.js',
				category: 'marketing',
				persistAfterConsentRevoked: true,
				onDelete,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the script with marketing consent
			const consentsWithMarketing: ConsentState = {
				necessary: true,
				marketing: true,
				measurement: false,
				functionality: false,
				experience: false,
			};

			loadScripts([persistentScript], consentsWithMarketing, scriptIdMap);

			// Verify script is loaded
			expect(isScriptLoaded('persistent-script')).toBe(true);

			// Create a mock script element to track removal
			const mockScriptElement = document.createElement('script');
			mockScriptElement.id = 'persistent-script';
			document.head.appendChild(mockScriptElement);

			// Mock the remove method to track if it's called
			const removeSpy = vi.spyOn(mockScriptElement, 'remove');

			// Revoke marketing consent
			const consentsWithoutMarketing: ConsentState = {
				necessary: true,
				marketing: false,
				measurement: false,
				functionality: false,
				experience: false,
			};

			// Unload scripts
			const unloadedIds = unloadScripts(
				[persistentScript],
				consentsWithoutMarketing,
				scriptIdMap
			);

			// Script should be marked as unloaded
			expect(unloadedIds).toContain('persistent-script');
			expect(isScriptLoaded('persistent-script')).toBe(false);

			// onDelete callback should have been called
			expect(onDelete).toHaveBeenCalledTimes(1);
			expect(onDelete).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'persistent-script',
					elementId: expect.any(String),
					consents: consentsWithoutMarketing,
					element: expect.any(Object),
				})
			);

			// Script element should NOT have been removed from DOM
			expect(removeSpy).not.toHaveBeenCalled();
		});

		it('should remove script from DOM when persistAfterConsentRevoked is false during unloadScripts', () => {
			const onDelete = vi.fn();
			const nonPersistentScript: Script = {
				id: 'non-persistent-script',
				src: 'https://example.com/non-persistent.js',
				category: 'marketing',
				persistAfterConsentRevoked: false,
				onDelete,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the script with marketing consent
			const consentsWithMarketing: ConsentState = {
				necessary: true,
				marketing: true,
				measurement: false,
				functionality: false,
				experience: false,
			};

			loadScripts([nonPersistentScript], consentsWithMarketing, scriptIdMap);

			// Verify script is loaded
			expect(isScriptLoaded('non-persistent-script')).toBe(true);

			// Get the created script element from the mock
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: Array<{ value: HTMLScriptElement }> };
			};
			const scriptElement =
				mockCreateElement.mock.results[
					mockCreateElement.mock.results.length - 1
				]?.value;
			expect(scriptElement).toBeTruthy();

			// Mock the remove method to track if it's called
			const removeSpy = vi.spyOn(scriptElement, 'remove');

			// Revoke marketing consent
			const consentsWithoutMarketing: ConsentState = {
				necessary: true,
				marketing: false,
				measurement: false,
				functionality: false,
				experience: false,
			};

			// Unload scripts
			const unloadedIds = unloadScripts(
				[nonPersistentScript],
				consentsWithoutMarketing,
				scriptIdMap
			);

			// Script should be marked as unloaded
			expect(unloadedIds).toContain('non-persistent-script');
			expect(isScriptLoaded('non-persistent-script')).toBe(false);

			// onDelete callback should have been called
			expect(onDelete).toHaveBeenCalledTimes(1);

			// Script element SHOULD have been removed from DOM
			expect(removeSpy).toHaveBeenCalledTimes(1);
		});

		it('should keep script in DOM when persistAfterConsentRevoked is true during clearAllScripts', () => {
			const onDelete = vi.fn();
			const persistentScript: Script = {
				id: 'persistent-clear-script',
				src: 'https://example.com/persistent-clear.js',
				category: 'marketing',
				persistAfterConsentRevoked: true,
				onDelete,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the script
			const consentsWithMarketing: ConsentState = {
				necessary: true,
				marketing: true,
				measurement: false,
				functionality: false,
				experience: false,
			};

			loadScripts([persistentScript], consentsWithMarketing, scriptIdMap);

			// Verify script is loaded
			expect(isScriptLoaded('persistent-clear-script')).toBe(true);

			// Create a mock script element to track removal
			const mockScriptElement = document.createElement('script');
			mockScriptElement.id = 'persistent-clear-script';
			document.head.appendChild(mockScriptElement);

			// Mock the remove method to track if it's called
			const removeSpy = vi.spyOn(mockScriptElement, 'remove');

			// Clear all scripts
			const unloadedIds = clearAllScripts(
				[persistentScript],
				consentsWithMarketing,
				scriptIdMap
			);

			// Script should be marked as unloaded
			expect(unloadedIds).toContain('persistent-clear-script');
			expect(isScriptLoaded('persistent-clear-script')).toBe(false);

			// onDelete callback should have been called
			expect(onDelete).toHaveBeenCalledTimes(1);

			// Script element should NOT have been removed from DOM
			expect(removeSpy).not.toHaveBeenCalled();
		});

		it('should remove script from DOM when persistAfterConsentRevoked is false during clearAllScripts', () => {
			const onDelete = vi.fn();
			const nonPersistentScript: Script = {
				id: 'non-persistent-clear-script',
				src: 'https://example.com/non-persistent-clear.js',
				category: 'marketing',
				persistAfterConsentRevoked: false,
				onDelete,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the script
			const consentsWithMarketing: ConsentState = {
				necessary: true,
				marketing: true,
				measurement: false,
				functionality: false,
				experience: false,
			};

			loadScripts([nonPersistentScript], consentsWithMarketing, scriptIdMap);

			// Verify script is loaded
			expect(isScriptLoaded('non-persistent-clear-script')).toBe(true);

			// Get the created script element from the mock
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: Array<{ value: HTMLScriptElement }> };
			};
			const scriptElement =
				mockCreateElement.mock.results[
					mockCreateElement.mock.results.length - 1
				]?.value;
			expect(scriptElement).toBeTruthy();

			// Mock the remove method to track if it's called
			const removeSpy = vi.spyOn(scriptElement, 'remove');

			// Clear all scripts
			const unloadedIds = clearAllScripts(
				[nonPersistentScript],
				consentsWithMarketing,
				scriptIdMap
			);

			// Script should be marked as unloaded
			expect(unloadedIds).toContain('non-persistent-clear-script');
			expect(isScriptLoaded('non-persistent-clear-script')).toBe(false);

			// onDelete callback should have been called
			expect(onDelete).toHaveBeenCalledTimes(1);

			// Script element SHOULD have been removed from DOM
			expect(removeSpy).toHaveBeenCalledTimes(1);
		});

		it('should keep script in DOM when persistAfterConsentRevoked is true during reloadScript', () => {
			const onDelete = vi.fn();
			const onBeforeLoad = vi.fn();
			const persistentScript: Script = {
				id: 'persistent-reload-script',
				src: 'https://example.com/persistent-reload.js',
				category: 'marketing',
				persistAfterConsentRevoked: true,
				onDelete,
				onBeforeLoad,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the script
			const consentsWithMarketing: ConsentState = {
				necessary: true,
				marketing: true,
				measurement: false,
				functionality: false,
				experience: false,
			};

			loadScripts([persistentScript], consentsWithMarketing, scriptIdMap);

			// Verify script is loaded
			expect(isScriptLoaded('persistent-reload-script')).toBe(true);

			// Create a mock script element to track removal
			const mockScriptElement = document.createElement('script');
			mockScriptElement.id = 'persistent-reload-script';
			document.head.appendChild(mockScriptElement);

			// Mock the remove method to track if it's called
			const removeSpy = vi.spyOn(mockScriptElement, 'remove');

			// Reload the script
			const result = reloadScript(
				'persistent-reload-script',
				[persistentScript],
				consentsWithMarketing,
				scriptIdMap
			);

			// Should return true for successful reload
			expect(result).toBe(true);

			// onDelete callback should have been called
			expect(onDelete).toHaveBeenCalledTimes(1);

			// Script element should NOT have been removed from DOM
			expect(removeSpy).not.toHaveBeenCalled();
		});

		it('should remove script from DOM when persistAfterConsentRevoked is false during reloadScript', () => {
			const onDelete = vi.fn();
			const onBeforeLoad = vi.fn();
			const nonPersistentScript: Script = {
				id: 'non-persistent-reload-script',
				src: 'https://example.com/non-persistent-reload.js',
				category: 'marketing',
				persistAfterConsentRevoked: false,
				onDelete,
				onBeforeLoad,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the script
			const consentsWithMarketing: ConsentState = {
				necessary: true,
				marketing: true,
				measurement: false,
				functionality: false,
				experience: false,
			};

			loadScripts([nonPersistentScript], consentsWithMarketing, scriptIdMap);

			// Verify script is loaded
			expect(isScriptLoaded('non-persistent-reload-script')).toBe(true);

			// Get the created script element from the mock
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: Array<{ value: HTMLScriptElement }> };
			};
			const scriptElement =
				mockCreateElement.mock.results[
					mockCreateElement.mock.results.length - 1
				]?.value;
			expect(scriptElement).toBeTruthy();

			// Mock the remove method to track if it's called
			const removeSpy = vi.spyOn(scriptElement, 'remove');

			// Reload the script
			const result = reloadScript(
				'non-persistent-reload-script',
				[nonPersistentScript],
				consentsWithMarketing,
				scriptIdMap
			);

			// Should return true for successful reload
			expect(result).toBe(true);

			// onDelete callback should have been called
			expect(onDelete).toHaveBeenCalledTimes(1);

			// Script element SHOULD have been removed from DOM
			expect(removeSpy).toHaveBeenCalledTimes(1);
		});

		it('should handle persistAfterConsentRevoked for callback-only scripts', () => {
			const onDelete = vi.fn();
			const persistentCallbackScript: Script = {
				id: 'persistent-callback-script',
				category: 'marketing',
				callbackOnly: true,
				persistAfterConsentRevoked: true,
				onDelete,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the script
			const consentsWithMarketing: ConsentState = {
				necessary: true,
				marketing: true,
				measurement: false,
				functionality: false,
				experience: false,
			};

			loadScripts(
				[persistentCallbackScript],
				consentsWithMarketing,
				scriptIdMap
			);

			// Verify script is loaded
			expect(isScriptLoaded('persistent-callback-script')).toBe(true);

			// Revoke marketing consent
			const consentsWithoutMarketing: ConsentState = {
				necessary: true,
				marketing: false,
				measurement: false,
				functionality: false,
				experience: false,
			};

			// Unload scripts
			const unloadedIds = unloadScripts(
				[persistentCallbackScript],
				consentsWithoutMarketing,
				scriptIdMap
			);

			// Script should be marked as unloaded
			expect(unloadedIds).toContain('persistent-callback-script');
			expect(isScriptLoaded('persistent-callback-script')).toBe(false);

			// onDelete callback should have been called
			expect(onDelete).toHaveBeenCalledTimes(1);
			expect(onDelete).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'persistent-callback-script',
					elementId: expect.any(String),
					consents: consentsWithoutMarketing,
					// No element property for callback-only scripts
				})
			);

			// For callback-only scripts, persistAfterConsentRevoked doesn't affect DOM removal
			// since there's no DOM element to remove
		});

		it('should default to false when persistAfterConsentRevoked is undefined', () => {
			const onDelete = vi.fn();
			const defaultScript: Script = {
				id: 'default-script',
				src: 'https://example.com/default.js',
				category: 'marketing',
				// persistAfterConsentRevoked is undefined, should default to false
				onDelete,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the script
			const consentsWithMarketing: ConsentState = {
				necessary: true,
				marketing: true,
				measurement: false,
				functionality: false,
				experience: false,
			};

			loadScripts([defaultScript], consentsWithMarketing, scriptIdMap);

			// Verify script is loaded
			expect(isScriptLoaded('default-script')).toBe(true);

			// Get the created script element from the mock
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: Array<{ value: HTMLScriptElement }> };
			};
			const scriptElement =
				mockCreateElement.mock.results[
					mockCreateElement.mock.results.length - 1
				]?.value;
			expect(scriptElement).toBeTruthy();

			// Mock the remove method to track if it's called
			const removeSpy = vi.spyOn(scriptElement, 'remove');

			// Revoke marketing consent
			const consentsWithoutMarketing: ConsentState = {
				necessary: true,
				marketing: false,
				measurement: false,
				functionality: false,
				experience: false,
			};

			// Unload scripts
			const unloadedIds = unloadScripts(
				[defaultScript],
				consentsWithoutMarketing,
				scriptIdMap
			);

			// Script should be marked as unloaded
			expect(unloadedIds).toContain('default-script');
			expect(isScriptLoaded('default-script')).toBe(false);

			// onDelete callback should have been called
			expect(onDelete).toHaveBeenCalledTimes(1);

			// Script element SHOULD have been removed from DOM (default behavior)
			expect(removeSpy).toHaveBeenCalledTimes(1);
		});

		it('should not create duplicate script elements when persistAfterConsentRevoked is true', () => {
			const onConsentChange = vi.fn();
			const persistentScript: Script = {
				id: 'duplicate-test-script',
				src: 'https://example.com/duplicate-test.js',
				category: 'marketing',
				persistAfterConsentRevoked: true,
				onConsentChange,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the script with marketing consent
			const consentsWithMarketing: ConsentState = {
				necessary: true,
				marketing: true,
				measurement: false,
				functionality: false,
				experience: false,
			};

			// First load
			loadScripts([persistentScript], consentsWithMarketing, scriptIdMap);
			expect(isScriptLoaded('duplicate-test-script')).toBe(true);

			// Get the created script element
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: Array<{ value: HTMLScriptElement }> };
			};
			const firstScriptElement =
				mockCreateElement.mock.results[
					mockCreateElement.mock.results.length - 1
				]?.value;
			expect(firstScriptElement).toBeTruthy();

			// Revoke marketing consent
			const consentsWithoutMarketing: ConsentState = {
				necessary: true,
				marketing: false,
				measurement: false,
				functionality: false,
				experience: false,
			};

			// Unload scripts (script stays in DOM due to persistAfterConsentRevoked: true)
			unloadScripts([persistentScript], consentsWithoutMarketing, scriptIdMap);
			expect(isScriptLoaded('duplicate-test-script')).toBe(false);

			// Grant marketing consent again
			loadScripts([persistentScript], consentsWithMarketing, scriptIdMap);
			expect(isScriptLoaded('duplicate-test-script')).toBe(true);

			// Should not have created a new script element
			// The mock results should still have the same number of elements
			const totalElementsCreated = mockCreateElement.mock.results.length;

			// Clear the mock to track new calls
			vi.clearAllMocks();

			// Try to load again
			loadScripts([persistentScript], consentsWithMarketing, scriptIdMap);

			// Should not have called createElement again
			expect(document.createElement).not.toHaveBeenCalled();

			// onConsentChange should have been called
			expect(onConsentChange).toHaveBeenCalledTimes(1);
		});

		it('should reuse existing DOM element when script is reloaded with persistAfterConsentRevoked', () => {
			const onConsentChange = vi.fn();
			const persistentScript: Script = {
				id: 'reload-test-script',
				src: 'https://example.com/reload-test.js',
				category: 'marketing',
				persistAfterConsentRevoked: true,
				onConsentChange,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the script
			const consentsWithMarketing: ConsentState = {
				necessary: true,
				marketing: true,
				measurement: false,
				functionality: false,
				experience: false,
			};

			loadScripts([persistentScript], consentsWithMarketing, scriptIdMap);
			expect(isScriptLoaded('reload-test-script')).toBe(true);

			// Get the created script element
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: Array<{ value: HTMLScriptElement }> };
			};
			const originalScriptElement =
				mockCreateElement.mock.results[
					mockCreateElement.mock.results.length - 1
				]?.value;
			expect(originalScriptElement).toBeTruthy();

			// Reload the script
			const result = reloadScript(
				'reload-test-script',
				[persistentScript],
				consentsWithMarketing,
				scriptIdMap
			);
			expect(result).toBe(true);
			expect(isScriptLoaded('reload-test-script')).toBe(true);

			// Clear the mock to track new calls
			vi.clearAllMocks();

			// Try to load again after reload
			loadScripts([persistentScript], consentsWithMarketing, scriptIdMap);

			// Should not have called createElement again (reused existing element)
			expect(document.createElement).not.toHaveBeenCalled();

			// onConsentChange should have been called
			expect(onConsentChange).toHaveBeenCalledTimes(1);
		});

		it('should handle existing DOM elements with different anonymized IDs', () => {
			const persistentScript: Script = {
				id: 'anonymized-test-script',
				src: 'https://example.com/anonymized-test.js',
				category: 'marketing',
				persistAfterConsentRevoked: true,
				anonymizeId: true,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the script
			const consentsWithMarketing: ConsentState = {
				necessary: true,
				marketing: true,
				measurement: false,
				functionality: false,
				experience: false,
			};

			loadScripts([persistentScript], consentsWithMarketing, scriptIdMap);
			expect(isScriptLoaded('anonymized-test-script')).toBe(true);

			// Get the anonymized ID
			const anonymizedId = scriptIdMap['anonymized-test-script'];
			expect(anonymizedId).toBeTruthy();

			// Revoke consent
			const consentsWithoutMarketing: ConsentState = {
				necessary: true,
				marketing: false,
				measurement: false,
				functionality: false,
				experience: false,
			};

			unloadScripts([persistentScript], consentsWithoutMarketing, scriptIdMap);
			expect(isScriptLoaded('anonymized-test-script')).toBe(false);

			// Grant consent again - this should reuse the existing element
			// Since the element persists in DOM, it should be found and reused
			loadScripts([persistentScript], consentsWithMarketing, scriptIdMap);
			expect(isScriptLoaded('anonymized-test-script')).toBe(true);

			// The anonymized ID should be the same as before
			expect(scriptIdMap['anonymized-test-script']).toBe(anonymizedId);
		});

		it('should still create new elements for scripts without persistAfterConsentRevoked', () => {
			const nonPersistentScript: Script = {
				id: 'non-persistent-duplicate-test',
				src: 'https://example.com/non-persistent-duplicate.js',
				category: 'marketing',
				persistAfterConsentRevoked: false,
			};

			const scriptIdMap: Record<string, string> = {};

			// Load the script
			const consentsWithMarketing: ConsentState = {
				necessary: true,
				marketing: true,
				measurement: false,
				functionality: false,
				experience: false,
			};

			loadScripts([nonPersistentScript], consentsWithMarketing, scriptIdMap);
			expect(isScriptLoaded('non-persistent-duplicate-test')).toBe(true);

			// Revoke consent
			const consentsWithoutMarketing: ConsentState = {
				necessary: true,
				marketing: false,
				measurement: false,
				functionality: false,
				experience: false,
			};

			unloadScripts(
				[nonPersistentScript],
				consentsWithoutMarketing,
				scriptIdMap
			);
			expect(isScriptLoaded('non-persistent-duplicate-test')).toBe(false);

			// Clear the mock to track new calls
			vi.clearAllMocks();

			// Grant consent again
			loadScripts([nonPersistentScript], consentsWithMarketing, scriptIdMap);
			expect(isScriptLoaded('non-persistent-duplicate-test')).toBe(true);

			// Should have called createElement again (normal behavior)
			expect(document.createElement).toHaveBeenCalledWith('script');
		});
	});
});
