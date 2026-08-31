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
			experience: false,
			functionality: true,
			marketing: false,
			measurement: true,
			necessary: true,
		};

		it('should handle AND conditions correctly', () => {
			const scripts: Script[] = [
				{
					category: { and: ['necessary', 'functionality'] },
					id: 'and-script',
					src: 'https://example.com/and.js',
				},
				{
					category: { and: ['necessary', 'marketing'] },
					id: 'and-script-fail',
					src: 'https://example.com/and-fail.js',
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
					category: { or: ['necessary', 'marketing'] },
					id: 'or-script-pass1',
					src: 'https://example.com/or1.js',
				},
				{
					category: { or: ['marketing', 'measurement'] },
					id: 'or-script-pass2',
					src: 'https://example.com/or2.js',
				},
				{
					category: { or: ['marketing', 'experience'] },
					id: 'or-script-fail',
					src: 'https://example.com/or-fail.js',
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
					category: { not: 'marketing' },
					id: 'not-script-pass',
					src: 'https://example.com/not-pass.js',
				},
				{
					category: { not: 'necessary' },
					id: 'not-script-fail',
					src: 'https://example.com/not-fail.js',
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
					category: {
						and: [
							'necessary',
							{ or: ['functionality', 'experience'] },
							{ not: 'marketing' },
						],
					},
					id: 'complex-pass',
					src: 'https://example.com/complex-pass.js',
				},
				{
					category: {
						and: [
							'necessary',
							{ or: ['marketing', 'experience'] },
							'measurement',
						],
					},
					id: 'complex-fail',
					src: 'https://example.com/complex-fail.js',
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
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			};

			const loadedIds = loadScripts([], consents);
			expect(loadedIds).toEqual([]);
		});

		it('should handle anonymized IDs with updateScripts function', () => {
			const consents: ConsentState = {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			};

			// Mock the generateRandomScriptId function to return predictable values
			mockRandomForTesting();

			const scripts: Script[] = [
				{
					category: 'necessary',
					id: 'anon-script-1',
					src: 'https://example.com/anon1.js',
				},
				{
					category: 'marketing',
					id: 'anon-script-2',
					src: 'https://example.com/anon2.js',
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

		it('should only load scripts with granted consent', () => {
			// Create a complete consent state to avoid errors
			const consents: ConsentState = {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			};

			const scripts: Script[] = [
				{
					category: 'necessary',
					id: 'necessary-script',
					src: 'https://example.com/necessary.js',
				},
				{
					category: 'functionality',
					id: 'functionality-script',
					src: 'https://example.com/functionality.js',
				},
				{
					category: 'marketing',
					id: 'marketing-script',
					src: 'https://example.com/marketing.js',
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
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			};

			const scripts: Script[] = [
				{
					category: 'necessary',
					id: 'duplicate-script',
					src: 'https://example.com/duplicate.js',
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
				experience: false,
				functionality: true,
				marketing: false,
				measurement: false,
				necessary: true,
			};

			const scripts: Script[] = [
				{
					category: 'functionality',
					id: 'lifecycle-script',
					src: 'https://example.com/lifecycle.js',
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
				experience: false,
				functionality: true,
				marketing: false,
				measurement: false,
				necessary: true,
			};

			// Mock the generateRandomScriptId function to return predictable values
			mockRandomForTesting();

			const scripts: Script[] = [
				{
					category: 'necessary',
					// Default anonymizeId (true)

					id: 'anonymized-script',
					src: 'https://example.com/anonymized.js',
				},
				{
					anonymizeId: false,
					category: 'functionality',
					id: 'non-anonymized-script',
					src: 'https://example.com/non-anonymized.js',
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
				mock: { results: { value: HTMLScriptElement }[] };
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
				experience: false,
				functionality: true,
				marketing: false,
				measurement: true,
				necessary: true,
			};

			const scripts: Script[] = [
				{
					category: 'necessary',
					id: 'necessary-script',
					src: 'https://example.com/necessary.js',
				},
				{
					category: 'functionality',
					id: 'functionality-script',
					src: 'https://example.com/functionality.js',
				},
				{
					category: 'measurement',
					id: 'measurement-script',
					src: 'https://example.com/measurement.js',
				},
				{
					category: 'marketing',
					id: 'marketing-script',
					src: 'https://example.com/marketing.js',
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
				experience: false,
				functionality: false,
				marketing: true,
				measurement: false,
				necessary: true,
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
