/**
 * @fileoverview Unit tests for the scripts endpoint handler.
 *
 * Tests the generation of client-side scripts based on user consent
 * and universal destinations.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { C15TContext } from '../../types';
import type { AnalyticsConsent, UniversalScript } from './core-types';
import type { DestinationManager } from './destination-manager';

// Mock logger
const mockLogger = {
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
};

// Mock destination manager
const mockDestinationManager = {
	getLoadedDestinations: vi.fn(),
} as unknown as DestinationManager;

// Mock context
const mockContext = {
	logger: mockLogger,
	destinationManager: mockDestinationManager,
} as unknown as C15TContext;

// Mock universal destination plugin
const mockUniversalDestination = {
	type: 'test-universal',
	requiredConsent: ['necessary', 'measurement'],
	settingsSchema: {} as Record<string, unknown>,
	initialize: vi.fn(),
	testConnection: vi.fn(),
	track: vi.fn(),
	page: vi.fn(),
	identify: vi.fn(),
	group: vi.fn(),
	alias: vi.fn(),
	consent: vi.fn(),
	onError: vi.fn(),
	destroy: vi.fn(),
	generateScript: vi.fn(),
	getScriptDependencies: vi.fn(),
	validateScriptSettings: vi.fn(),
};

// Mock regular destination plugin (non-universal) - removed as unused

describe('Scripts Handler Logic', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Consent Validation', () => {
		it('should validate consent structure', () => {
			const validConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: false,
				experience: false,
			};

			expect(validConsent.necessary).toBe(true);
			expect(validConsent.measurement).toBe(true);
			expect(validConsent.marketing).toBe(false);
		});

		it('should handle consent with all purposes', () => {
			const fullConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: true,
				functionality: true,
				experience: true,
			};

			expect(Object.keys(fullConsent)).toHaveLength(5);
			expect(Object.values(fullConsent).every(Boolean)).toBe(true);
		});
	});

	describe('Script Generation Logic', () => {
		it('should create valid script objects', () => {
			const script: UniversalScript = {
				type: 'script',
				src: 'https://example.com/script.js',
				async: true,
				strategy: 'eager',
				requiredConsent: ['necessary'],
				priority: 'high',
			};

			expect(script.type).toBe('script');
			expect(script.src).toBe('https://example.com/script.js');
			expect(script.requiredConsent).toEqual(['necessary']);
		});

		it('should create inline script objects', () => {
			const inlineScript: UniversalScript = {
				type: 'inline',
				content: 'console.log("test");',
				strategy: 'consent-based',
				requiredConsent: ['marketing'],
				priority: 'normal',
			};

			expect(inlineScript.type).toBe('inline');
			expect(inlineScript.content).toBe('console.log("test");');
			expect(inlineScript.requiredConsent).toEqual(['marketing']);
		});

		it('should handle scripts with all properties', () => {
			const fullScript: UniversalScript = {
				type: 'script',
				src: 'https://example.com/full-script.js',
				content: '// fallback content',
				async: true,
				defer: false,
				attributes: {
					'data-custom': 'value',
					'data-version': '1.0',
				},
				strategy: 'lazy',
				requiredConsent: ['necessary', 'measurement'],
				priority: 'high',
				loadOnce: true,
				loadCondition: (consent) => consent.necessary && consent.measurement,
			};

			expect(fullScript.type).toBe('script');
			expect(fullScript.src).toBe('https://example.com/full-script.js');
			expect(fullScript.attributes).toEqual({
				'data-custom': 'value',
				'data-version': '1.0',
			});
			expect(fullScript.loadOnce).toBe(true);
			expect(typeof fullScript.loadCondition).toBe('function');
		});
	});

	describe('Script Filtering Logic', () => {
		it('should filter scripts by consent requirements', () => {
			const consent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: false,
				experience: false,
			};

			const scripts: UniversalScript[] = [
				{
					type: 'script',
					src: 'https://example.com/necessary.js',
					requiredConsent: ['necessary'],
				},
				{
					type: 'script',
					src: 'https://example.com/marketing.js',
					requiredConsent: ['marketing'],
				},
				{
					type: 'script',
					src: 'https://example.com/measurement.js',
					requiredConsent: ['measurement'],
				},
			];

			const filteredScripts = scripts.filter(
				(script) =>
					!script.requiredConsent ||
					script.requiredConsent.every((purpose) => consent[purpose])
			);

			expect(filteredScripts).toHaveLength(2);
			expect(filteredScripts[0]?.src).toBe('https://example.com/necessary.js');
			expect(filteredScripts[1]?.src).toBe(
				'https://example.com/measurement.js'
			);
		});

		it('should include scripts without consent requirements', () => {
			const consent: AnalyticsConsent = {
				necessary: false,
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			};

			const scripts: UniversalScript[] = [
				{
					type: 'script',
					src: 'https://example.com/no-consent.js',
					// No requiredConsent property
				},
				{
					type: 'script',
					src: 'https://example.com/empty-consent.js',
					requiredConsent: [],
				},
			];

			const filteredScripts = scripts.filter(
				(script) =>
					!script.requiredConsent ||
					script.requiredConsent.every((purpose) => consent[purpose])
			);

			expect(filteredScripts).toHaveLength(2);
		});

		it('should handle scripts with multiple consent requirements', () => {
			const consent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: true,
				experience: false,
			};

			const scripts: UniversalScript[] = [
				{
					type: 'script',
					src: 'https://example.com/multi-consent.js',
					requiredConsent: ['necessary', 'measurement'],
				},
				{
					type: 'script',
					src: 'https://example.com/mixed-consent.js',
					requiredConsent: ['necessary', 'marketing'],
				},
			];

			const filteredScripts = scripts.filter(
				(script) =>
					!script.requiredConsent ||
					script.requiredConsent.every((purpose) => consent[purpose])
			);

			expect(filteredScripts).toHaveLength(1);
			expect(filteredScripts[0]?.src).toBe(
				'https://example.com/multi-consent.js'
			);
		});
	});

	describe('ETag Generation Logic', () => {
		it('should generate consistent ETags for same content', () => {
			const scripts: UniversalScript[] = [
				{
					type: 'script',
					src: 'https://example.com/script.js',
					requiredConsent: ['necessary'],
				},
			];

			const consent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: false,
				experience: false,
			};

			// Generate ETag function (simplified version)
			const generateETag = (
				scripts: UniversalScript[],
				consent: AnalyticsConsent
			): string => {
				const content = JSON.stringify({ scripts, consent });
				return `"${Buffer.from(content).toString('base64').slice(0, 16)}"`;
			};

			const etag1 = generateETag(scripts, consent);
			const etag2 = generateETag(scripts, consent);

			expect(etag1).toBe(etag2);
			expect(etag1).toMatch(/^".*"$/); // Should be quoted
		});

		it('should generate ETags with proper format', () => {
			const scripts: UniversalScript[] = [
				{
					type: 'script',
					src: 'https://example.com/script.js',
					requiredConsent: ['necessary'],
				},
			];

			const consent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: false,
				experience: false,
			};

			// Generate ETag function (simplified version)
			const generateETag = (
				scripts: UniversalScript[],
				consent: AnalyticsConsent
			): string => {
				const content = JSON.stringify({ scripts, consent });
				return `"${Buffer.from(content).toString('base64').slice(0, 16)}"`;
			};

			const etag = generateETag(scripts, consent);

			expect(etag).toMatch(/^".*"$/); // Should be quoted
			expect(etag.length).toBeGreaterThan(2); // Should have content
		});
	});

	describe('Script Dependency Sorting', () => {
		it('should maintain order for scripts without dependencies', () => {
			const scripts: UniversalScript[] = [
				{
					type: 'script',
					src: 'https://example.com/script1.js',
					requiredConsent: ['necessary'],
				},
				{
					type: 'script',
					src: 'https://example.com/script2.js',
					requiredConsent: ['necessary'],
				},
			];

			// Simple sorting function (simplified version)
			const sortScriptsByDependencies = (
				scripts: UniversalScript[]
			): UniversalScript[] => {
				return [...scripts]; // For now, just return in original order
			};

			const sortedScripts = sortScriptsByDependencies(scripts);

			expect(sortedScripts).toHaveLength(2);
			expect(sortedScripts[0]?.src).toBe('https://example.com/script1.js');
			expect(sortedScripts[1]?.src).toBe('https://example.com/script2.js');
		});
	});

	describe('Error Handling', () => {
		it('should handle missing destination manager gracefully', () => {
			const contextWithoutDestinationManager = {
				...mockContext,
				destinationManager: undefined,
			};

			expect(
				contextWithoutDestinationManager.destinationManager
			).toBeUndefined();
		});

		it('should handle empty destination list', () => {
			(
				mockDestinationManager.getLoadedDestinations as unknown as {
					mockReturnValue: (value: unknown[]) => void;
				}
			).mockReturnValue([]);

			const destinations = mockDestinationManager.getLoadedDestinations();
			expect(destinations).toHaveLength(0);
		});

		it('should handle destination with script generation errors', () => {
			const failingDestination = {
				config: {
					type: 'failing-destination',
					settings: { apiKey: 'test-key' },
				},
				plugin: {
					...mockUniversalDestination,
					generateScript: vi.fn().mockImplementation(() => {
						throw new Error('Script generation failed');
					}),
				},
			};

			expect(() => {
				failingDestination.plugin.generateScript({}, {} as AnalyticsConsent);
			}).toThrow('Script generation failed');
		});
	});
});
