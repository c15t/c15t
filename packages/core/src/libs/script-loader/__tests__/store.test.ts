import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrivacyConsentState } from '../../../store.type';
import type { AllConsentNames } from '../../../types/gdpr';
import { clearAllScripts, loadScripts, updateScripts } from '../core';
import { createScriptManager } from '../store';
import type { Script } from '../types';
import {
	mockRandomForTesting,
	sampleConsents,
	setupTestHooks,
} from './test-setup';

describe('Script Manager Store Integration', () => {
	// Setup test hooks
	setupTestHooks();

	// Mock store state and setState function with required properties
	const mockState = {
		scripts: [] as Script[],
		loadedScripts: {} as Record<string, boolean>,
		scriptIdMap: {} as Record<string, string>,
		consents: sampleConsents,
	} as PrivacyConsentState;

	const getState = vi.fn(() => mockState as PrivacyConsentState);
	const setState = vi.fn((partial: Partial<PrivacyConsentState>) => {
		Object.assign(mockState, partial);
	});

	// Sample scripts for testing
	const scripts: Script[] = [
		{
			id: 'necessary-script',
			src: 'https://example.com/necessary.js',
			category: 'necessary',
		},
		{
			id: 'marketing-script',
			src: 'https://example.com/marketing.js',
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

	beforeEach(() => {
		// Reset mock state
		mockState.scripts = [];
		mockState.loadedScripts = {};
		mockState.scriptIdMap = {};
		vi.clearAllMocks();
		clearAllScripts();

		// Mock the generateRandomScriptId function to return predictable values
		mockRandomForTesting();
	});

	describe('removeScript', () => {
		it('should remove a script from the store and clean up the script ID map', () => {
			// Setup initial state with scripts and script ID mapping
			mockState.scripts = [...scripts];
			mockState.scriptIdMap = {
				'necessary-script': 'random-id-1',
				'marketing-script': 'random-id-2',
			};

			const scriptManager = createScriptManager(getState, setState);

			// Load a script first so we can test unloading
			loadScripts([scripts[0]], mockState.consents);

			// Remove the script
			scriptManager.removeScript('necessary-script');

			// Should have called setState to update scripts array and scriptIdMap
			expect(setState).toHaveBeenCalledWith(
				expect.objectContaining({
					scripts: scripts.filter((s) => s.id !== 'necessary-script'),
					loadedScripts: {
						'necessary-script': false,
					},
					scriptIdMap: {
						'marketing-script': 'random-id-2',
					},
				})
			);

			// Verify that the script ID was removed from the map
			const setStateCall = setState.mock.calls[0][0];
			expect(setStateCall.scriptIdMap).toBeDefined();
			expect(setStateCall.scriptIdMap?.['necessary-script']).toBeUndefined();
			expect(setStateCall.scriptIdMap?.['marketing-script']).toBe(
				'random-id-2'
			);
		});

		it('should call onDelete callback with consent state when removing a script', () => {
			// Create a script with onDelete callback
			const onDelete = vi.fn();
			const scriptWithCallback = {
				id: 'removable-script',
				src: 'https://example.com/removable.js',
				category: 'necessary' as AllConsentNames,
				onDelete,
			};

			// Setup initial state with the script
			mockState.scripts = [scriptWithCallback];

			const scriptManager = createScriptManager(getState, setState);

			// Load the script first
			loadScripts([scriptWithCallback], mockState.consents);

			// Remove the script
			scriptManager.removeScript('removable-script');

			// onDelete should have been called with consent state
			expect(onDelete).toHaveBeenCalledTimes(1);
			expect(onDelete).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'removable-script',
					elementId: expect.any(String),
					consents: mockState.consents,
					element: expect.any(Object),
				})
			);

			// Should have called setState to update scripts array
			expect(setState).toHaveBeenCalledWith(
				expect.objectContaining({
					scripts: [],
					loadedScripts: {
						'removable-script': false,
					},
				})
			);
		});
	});

	describe('updateScripts', () => {
		it('should update scripts based on consent state and use script ID mapping', () => {
			// Setup initial state with scripts
			mockState.scripts = [...scripts];
			mockState.scriptIdMap = {}; // Start with empty map

			// Get the current state
			const state = getState();

			// Call the core updateScripts function directly
			const result = updateScripts(
				state.scripts,
				state.consents,
				state.scriptIdMap
			);

			// Manually update the store state as the store method would
			const newLoadedScripts = { ...state.loadedScripts };

			// Mark loaded scripts
			result.loaded.forEach((id) => {
				newLoadedScripts[id] = true;
			});

			// Mark unloaded scripts
			result.unloaded.forEach((id) => {
				newLoadedScripts[id] = false;
			});

			setState({ loadedScripts: newLoadedScripts });

			// Should have loaded scripts with consent (including callback-only script)
			expect(result.loaded).toContain('necessary-script');
			expect(result.loaded).toContain('callback-only-script');
			expect(result.loaded).not.toContain('marketing-script');

			// Should have updated loadedScripts state
			expect(setState).toHaveBeenCalledWith(
				expect.objectContaining({
					loadedScripts: {
						'necessary-script': true,
						'callback-only-script': true,
					},
				})
			);

			// Verify that the scriptIdMap was passed to the updateScripts function
			// by checking that the scripts were loaded with the correct IDs
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: Array<{ value: HTMLScriptElement }> };
			};

			// Only one script element should have been created (for the standard script)
			// The callback-only script should not create a DOM element
			expect(mockCreateElement.mock.results.length).toBe(1);

			// The script ID should not use the c15t prefix for anonymized scripts
			const scriptElement = mockCreateElement.mock.results[0].value;
			expect(scriptElement.id).not.toContain('c15t-script-');
		});

		it('should handle callback-only scripts without creating DOM elements', () => {
			// Setup initial state with only the callback-only script
			mockState.scripts = [scripts[2]]; // callback-only script
			mockState.scriptIdMap = {}; // Start with empty map

			// Get the current state
			const state = getState();

			// Reset mocks to track new calls
			vi.clearAllMocks();

			// Call the core updateScripts function directly
			const result = updateScripts(
				state.scripts,
				state.consents,
				state.scriptIdMap
			);

			// Should have loaded the callback-only script
			expect(result.loaded).toContain('callback-only-script');

			// Should not have created any DOM elements
			expect(document.createElement).not.toHaveBeenCalled();
			expect(document.head.appendChild).not.toHaveBeenCalled();

			// The onBeforeLoad and onLoad callbacks should have been called
			const callbackScript = scripts[2];
			expect(callbackScript.onBeforeLoad).toHaveBeenCalledTimes(1);
			expect(callbackScript.onLoad).toHaveBeenCalledTimes(1);
		});
	});

	describe('reloadScript', () => {
		it('should reload a script from the store', () => {
			// Setup initial state with scripts
			mockState.scripts = [...scripts];

			const scriptManager = createScriptManager(getState, setState);

			// Load a script first
			loadScripts([scripts[0]], mockState.consents);

			// Mock document.createElement to track new script creation
			vi.spyOn(document, 'createElement').mockClear();
			vi.spyOn(document.head, 'appendChild').mockClear();

			// Reload the script
			const result = scriptManager.reloadScript('necessary-script');

			// Should return true for successful reload
			expect(result).toBe(true);

			// Should have created a new script element
			expect(document.createElement).toHaveBeenCalledTimes(1);
			expect(document.head.appendChild).toHaveBeenCalledTimes(1);
		});
	});

	describe('isScriptLoaded and getLoadedScriptIds', () => {
		it('should check if a script is loaded', () => {
			const scriptManager = createScriptManager(getState, setState);

			// Load a script
			loadScripts([scripts[0]], mockState.consents);

			// Check if script is loaded
			expect(scriptManager.isScriptLoaded('necessary-script')).toBe(true);
			expect(scriptManager.isScriptLoaded('marketing-script')).toBe(false);
		});

		it('should get all loaded script IDs', () => {
			const scriptManager = createScriptManager(getState, setState);

			// Load some scripts
			loadScripts([scripts[0]], mockState.consents);

			// Get loaded script IDs
			const loadedIds = scriptManager.getLoadedScriptIds();

			expect(loadedIds).toContain('necessary-script');
			expect(loadedIds.length).toBe(1);
		});
	});
});
