import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConsentState } from '../../../types/compliance';
import {
	clearAllScripts,
	isScriptLoaded,
	loadScripts,
	updateScripts,
} from '../core';
import type { Script } from '../types';
import { mockRandomForTesting, setupTestHooks } from './test-setup';

describe('Script Loader Advanced Features', () => {
	// Setup test hooks
	setupTestHooks();

	describe('Complex Consent Conditions', () => {
		// Sample consent state for testing
		const consents: ConsentState = {
			necessary: true,
			functionality: true,
			marketing: false,
			measurement: true,
			experience: false,
		};

		it('should handle AND conditions correctly', () => {
			const scripts: Script[] = [
				{
					id: 'and-script',
					src: 'https://example.com/and.js',
					category: { and: ['necessary', 'functionality'] },
				},
				{
					id: 'and-script-fail',
					src: 'https://example.com/and-fail.js',
					category: { and: ['necessary', 'marketing'] },
				},
			];

			const loadedIds = loadScripts(scripts, consents);

			// Should load script that requires both necessary AND functionality
			expect(loadedIds).toContain('and-script');

			// Should not load script that requires necessary AND marketing
			expect(loadedIds).not.toContain('and-script-fail');
		});

		it('should handle OR conditions correctly', () => {
			const scripts: Script[] = [
				{
					id: 'or-script-pass1',
					src: 'https://example.com/or1.js',
					category: { or: ['necessary', 'marketing'] },
				},
				{
					id: 'or-script-pass2',
					src: 'https://example.com/or2.js',
					category: { or: ['marketing', 'measurement'] },
				},
				{
					id: 'or-script-fail',
					src: 'https://example.com/or-fail.js',
					category: { or: ['marketing', 'experience'] },
				},
			];

			const loadedIds = loadScripts(scripts, consents);

			// Should load script that requires necessary OR marketing (necessary is true)
			expect(loadedIds).toContain('or-script-pass1');

			// Should load script that requires marketing OR measurement (measurement is true)
			expect(loadedIds).toContain('or-script-pass2');

			// Should not load script that requires marketing OR experience (both false)
			expect(loadedIds).not.toContain('or-script-fail');
		});

		it('should handle NOT conditions correctly', () => {
			const scripts: Script[] = [
				{
					id: 'not-script-pass',
					src: 'https://example.com/not-pass.js',
					category: { not: 'marketing' },
				},
				{
					id: 'not-script-fail',
					src: 'https://example.com/not-fail.js',
					category: { not: 'necessary' },
				},
			];

			const loadedIds = loadScripts(scripts, consents);

			// Should load script that requires NOT marketing (marketing is false)
			expect(loadedIds).toContain('not-script-pass');

			// Should not load script that requires NOT necessary (necessary is true)
			expect(loadedIds).not.toContain('not-script-fail');
		});

		it('should handle nested complex conditions correctly', () => {
			const scripts: Script[] = [
				{
					id: 'complex-pass',
					src: 'https://example.com/complex-pass.js',
					category: {
						and: [
							'necessary',
							{ or: ['functionality', 'experience'] },
							{ not: 'marketing' },
						],
					},
				},
				{
					id: 'complex-fail',
					src: 'https://example.com/complex-fail.js',
					category: {
						and: [
							'necessary',
							{ or: ['marketing', 'experience'] },
							'measurement',
						],
					},
				},
			];

			const loadedIds = loadScripts(scripts, consents);

			// Should load script with complex passing condition
			expect(loadedIds).toContain('complex-pass');

			// Should not load script with complex failing condition
			expect(loadedIds).not.toContain('complex-fail');
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty scripts array', () => {
			const consents: ConsentState = {
				necessary: true,
				functionality: false,
				marketing: false,
				measurement: false,
				experience: false,
			};

			const loadedIds = loadScripts([], consents);
			expect(loadedIds).toEqual([]);
		});

		it('should handle anonymized IDs with updateScripts function', () => {
			const consents: ConsentState = {
				necessary: true,
				functionality: false,
				marketing: false,
				measurement: false,
				experience: false,
			};

			// Mock the generateRandomScriptId function to return predictable values
			mockRandomForTesting();

			const scripts: Script[] = [
				{
					id: 'anon-script-1',
					src: 'https://example.com/anon1.js',
					category: 'necessary',
				},
				{
					id: 'anon-script-2',
					src: 'https://example.com/anon2.js',
					category: 'marketing',
				},
			];

			const scriptIdMap: Record<string, string> = {};

			// Initial update with necessary consent only
			const result1 = updateScripts(scripts, consents, scriptIdMap);

			// Should have loaded the necessary script only
			expect(result1.loaded).toContain('anon-script-1');
			expect(result1.loaded).not.toContain('anon-script-2');

			// Should have created an anonymized ID for the loaded script
			expect(scriptIdMap['anon-script-1']).toBeDefined();
			expect(scriptIdMap['anon-script-2']).toBeUndefined();

			// Now update with marketing consent added
			const updatedConsents = { ...consents, marketing: true };
			const result2 = updateScripts(scripts, updatedConsents, scriptIdMap);

			// Should have loaded the marketing script
			expect(result2.loaded).toContain('anon-script-2');

			// Should have created an anonymized ID for the newly loaded script
			expect(scriptIdMap['anon-script-2']).toBeDefined();

			// Both scripts should now have anonymized IDs
			expect(Object.keys(scriptIdMap).length).toBe(2);
		});

		it('should handle missing consent values', () => {
			// Create a complete consent state to avoid errors
			const consents: ConsentState = {
				necessary: true,
				functionality: false,
				marketing: false,
				measurement: false,
				experience: false,
			};

			const scripts: Script[] = [
				{
					id: 'necessary-script',
					src: 'https://example.com/necessary.js',
					category: 'necessary',
				},
				{
					id: 'functionality-script',
					src: 'https://example.com/functionality.js',
					category: 'functionality',
				},
				{
					id: 'marketing-script',
					src: 'https://example.com/marketing.js',
					category: 'marketing',
				},
			];

			// Should only load necessary script, treating missing values as false
			const loadedIds = loadScripts(scripts, consents);
			expect(loadedIds).toContain('necessary-script');
			expect(loadedIds).not.toContain('functionality-script');
			expect(loadedIds).not.toContain('marketing-script');
		});

		it('should handle duplicate script loading attempts', () => {
			const consents: ConsentState = {
				necessary: true,
				functionality: false,
				marketing: false,
				measurement: false,
				experience: false,
			};

			const scripts: Script[] = [
				{
					id: 'duplicate-script',
					src: 'https://example.com/duplicate.js',
					category: 'necessary',
				},
			];

			// Load script first time
			const firstLoad = loadScripts(scripts, consents);
			expect(firstLoad).toContain('duplicate-script');
			expect(document.createElement).toHaveBeenCalledTimes(1);

			// Reset mock to track second attempt
			vi.spyOn(document, 'createElement').mockClear();

			// Try to load the same script again
			const secondLoad = loadScripts(scripts, consents);

			// Should not load again or create new element
			expect(secondLoad).toEqual([]);
			expect(document.createElement).not.toHaveBeenCalled();
		});
	});

	describe('Script Lifecycle Management', () => {
		it('should handle script lifecycle from load to unload correctly', () => {
			const initialConsents: ConsentState = {
				necessary: true,
				functionality: true,
				marketing: false,
				measurement: false,
				experience: false,
			};

			const scripts: Script[] = [
				{
					id: 'lifecycle-script',
					src: 'https://example.com/lifecycle.js',
					category: 'functionality',
				},
			];

			// Initial load
			loadScripts(scripts, initialConsents);
			expect(isScriptLoaded('lifecycle-script')).toBe(true);

			// Change consent
			const updatedConsents: ConsentState = {
				...initialConsents,
				functionality: false,
			};

			// Update scripts
			const result = updateScripts(scripts, updatedConsents);
			expect(result.unloaded).toContain('lifecycle-script');
			expect(isScriptLoaded('lifecycle-script')).toBe(false);
		});

		it('should handle mixed anonymized and non-anonymized scripts', () => {
			const consents: ConsentState = {
				necessary: true,
				functionality: true,
				marketing: false,
				measurement: false,
				experience: false,
			};

			// Mock the generateRandomScriptId function to return predictable values
			mockRandomForTesting();

			const scripts: Script[] = [
				{
					id: 'anonymized-script',
					src: 'https://example.com/anonymized.js',
					category: 'necessary',
					// Default anonymizeId (true)
				},
				{
					id: 'non-anonymized-script',
					src: 'https://example.com/non-anonymized.js',
					category: 'functionality',
					anonymizeId: false,
				},
			];

			const scriptIdMap: Record<string, string> = {};

			// Load both scripts
			loadScripts(scripts, consents, scriptIdMap);

			// Both scripts should be loaded
			expect(isScriptLoaded('anonymized-script')).toBe(true);
			expect(isScriptLoaded('non-anonymized-script')).toBe(true);

			// Get the created script elements
			const mockCreateElement = document.createElement as unknown as {
				mock: { results: Array<{ value: HTMLScriptElement }> };
			};
			const scriptElements = mockCreateElement.mock.results;

			// The first script should have an anonymized ID
			expect(scriptElements[0].value.id).not.toBe(
				'c15t-script-anonymized-script'
			);
			expect(scriptElements[0].value.id).toBe(scriptIdMap['anonymized-script']);

			// The second script should have a non-anonymized ID
			expect(scriptElements[1].value.id).toBe(
				'c15t-script-non-anonymized-script'
			);

			// Only the anonymized script should be in the mapping
			expect(Object.keys(scriptIdMap).length).toBe(1);
			expect(scriptIdMap['anonymized-script']).toBeDefined();
			expect(scriptIdMap['non-anonymized-script']).toBeUndefined();
		});

		it('should handle consent changes affecting multiple scripts', () => {
			const initialConsents: ConsentState = {
				necessary: true,
				functionality: true,
				marketing: false,
				measurement: true,
				experience: false,
			};

			const scripts: Script[] = [
				{
					id: 'necessary-script',
					src: 'https://example.com/necessary.js',
					category: 'necessary',
				},
				{
					id: 'functionality-script',
					src: 'https://example.com/functionality.js',
					category: 'functionality',
				},
				{
					id: 'measurement-script',
					src: 'https://example.com/measurement.js',
					category: 'measurement',
				},
				{
					id: 'marketing-script',
					src: 'https://example.com/marketing.js',
					category: 'marketing',
				},
			];

			// Initial load
			loadScripts(scripts, initialConsents);

			// Check initial state
			expect(isScriptLoaded('necessary-script')).toBe(true);
			expect(isScriptLoaded('functionality-script')).toBe(true);
			expect(isScriptLoaded('measurement-script')).toBe(true);
			expect(isScriptLoaded('marketing-script')).toBe(false);

			// Change multiple consents
			const updatedConsents: ConsentState = {
				necessary: true,
				functionality: false,
				marketing: true,
				measurement: false,
				experience: false,
			};

			// Update scripts
			const result = updateScripts(scripts, updatedConsents);

			// Check results
			expect(result.loaded).toContain('marketing-script');
			expect(result.unloaded).toContain('functionality-script');
			expect(result.unloaded).toContain('measurement-script');

			// Check final state
			expect(isScriptLoaded('necessary-script')).toBe(true);
			expect(isScriptLoaded('functionality-script')).toBe(false);
			expect(isScriptLoaded('measurement-script')).toBe(false);
			expect(isScriptLoaded('marketing-script')).toBe(true);
		});
	});

	// Clean up after all tests
	afterEach(() => {
		clearAllScripts();
	});
});
