/**
 * @fileoverview Unit tests for DestinationRegistry class.
 * Tests plugin registration, retrieval, and management functionality.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type {
	ConsentPurpose,
	DestinationFactory,
} from '../handlers/analytics/core-types';
import {
	destinationPlugins,
	getDestinationFactory,
	getDestinationPluginCount,
	getRegisteredDestinations,
	getRegisteredDestinationTypes,
	hasDestinationPlugin,
	registerDestination,
} from './destination-registry';

/**
 * Mock destination plugin for testing.
 */
class MockDestinationPlugin {
	readonly type: string;
	readonly version: string;
	readonly name: string;
	readonly description: string;
	readonly category:
		| 'analytics'
		| 'marketing'
		| 'crm'
		| 'error-tracking'
		| 'consent-management'
		| 'other';
	readonly gdprCompliant: boolean;
	readonly settingsSchema: any;
	readonly requiredConsent: readonly ConsentPurpose[];

	constructor(type: string, version = '1.0.0') {
		this.type = type;
		this.version = version;
		this.name = `Mock ${type} Plugin`;
		this.description = `A mock plugin for testing ${type}`;
		this.category = 'analytics';
		this.gdprCompliant = true;
		this.settingsSchema = {};
		this.requiredConsent = [];
	}

	async initialize(): Promise<void> {
		// Mock implementation
	}

	async testConnection(): Promise<boolean> {
		return true;
	}
}

/**
 * Helper to create mock destination factory.
 */
const createMockFactory = (type: string): DestinationFactory => {
	return async () => new MockDestinationPlugin(type);
};

describe('DestinationRegistry', () => {
	beforeEach(() => {
		// Clear the registry before each test
		destinationPlugins.clear();
	});

	describe('registerDestination', () => {
		it('should register a destination plugin', () => {
			const factory = createMockFactory('test');

			registerDestination('test', factory);

			expect(hasDestinationPlugin('test')).toBe(true);
		});

		it('should throw error when registering duplicate destination', () => {
			const factory1 = createMockFactory('test');
			const factory2 = createMockFactory('test');

			registerDestination('test', factory1);

			expect(() => {
				registerDestination('test', factory2);
			}).toThrow("Destination type 'test' is already registered");
		});

		it('should register multiple different destinations', () => {
			const factory1 = createMockFactory('test1');
			const factory2 = createMockFactory('test2');

			registerDestination('test1', factory1);
			registerDestination('test2', factory2);

			expect(hasDestinationPlugin('test1')).toBe(true);
			expect(hasDestinationPlugin('test2')).toBe(true);
			expect(getDestinationPluginCount()).toBe(2);
		});
	});

	describe('getDestinationFactory', () => {
		it('should return registered factory', () => {
			const factory = createMockFactory('test');
			registerDestination('test', factory);

			const retrievedFactory = getDestinationFactory('test');
			expect(retrievedFactory).toBe(factory);
		});

		it('should return undefined for non-existent destination', () => {
			const factory = getDestinationFactory('nonexistent');
			expect(factory).toBeUndefined();
		});
	});

	describe('getRegisteredDestinations', () => {
		it('should return all registered destinations', () => {
			const factory1 = createMockFactory('test1');
			const factory2 = createMockFactory('test2');

			registerDestination('test1', factory1);
			registerDestination('test2', factory2);

			const destinations = getRegisteredDestinations();
			expect(destinations.size).toBe(2);
			expect(destinations.has('test1')).toBe(true);
			expect(destinations.has('test2')).toBe(true);
		});

		it('should return empty map when no destinations registered', () => {
			const destinations = getRegisteredDestinations();
			expect(destinations.size).toBe(0);
		});

		it('should return a copy of the registry', () => {
			const factory = createMockFactory('test');
			registerDestination('test', factory);

			const destinations1 = getRegisteredDestinations();
			const destinations2 = getRegisteredDestinations();

			// Should be different instances
			expect(destinations1).not.toBe(destinations2);
			// But should have same content
			expect(destinations1.size).toBe(destinations2.size);
		});
	});

	describe('hasDestinationPlugin', () => {
		it('should return true for registered destination', () => {
			const factory = createMockFactory('test');
			registerDestination('test', factory);

			expect(hasDestinationPlugin('test')).toBe(true);
		});

		it('should return false for non-registered destination', () => {
			expect(hasDestinationPlugin('nonexistent')).toBe(false);
		});
	});

	describe('getRegisteredDestinationTypes', () => {
		it('should return array of registered destination types', () => {
			const factory1 = createMockFactory('test1');
			const factory2 = createMockFactory('test2');

			registerDestination('test1', factory1);
			registerDestination('test2', factory2);

			const types = getRegisteredDestinationTypes();
			expect(types).toHaveLength(2);
			expect(types).toContain('test1');
			expect(types).toContain('test2');
		});

		it('should return empty array when no destinations registered', () => {
			const types = getRegisteredDestinationTypes();
			expect(types).toHaveLength(0);
		});
	});

	describe('getDestinationPluginCount', () => {
		it('should return correct count of registered destinations', () => {
			expect(getDestinationPluginCount()).toBe(0);

			const factory1 = createMockFactory('test1');
			registerDestination('test1', factory1);
			expect(getDestinationPluginCount()).toBe(1);

			const factory2 = createMockFactory('test2');
			registerDestination('test2', factory2);
			expect(getDestinationPluginCount()).toBe(2);
		});
	});

	describe('destinationPlugins.clear', () => {
		it('should clear all registered destinations', () => {
			const factory1 = createMockFactory('test1');
			const factory2 = createMockFactory('test2');

			registerDestination('test1', factory1);
			registerDestination('test2', factory2);

			expect(getDestinationPluginCount()).toBe(2);

			destinationPlugins.clear();

			expect(getDestinationPluginCount()).toBe(0);
			expect(hasDestinationPlugin('test1')).toBe(false);
			expect(hasDestinationPlugin('test2')).toBe(false);
		});
	});

	describe('integration tests', () => {
		it('should work with real destination factory', async () => {
			const factory: DestinationFactory = async (
				_settings: Record<string, unknown>
			) => {
				const plugin = new MockDestinationPlugin('real-test');
				await plugin.initialize();
				return plugin;
			};

			registerDestination('real-test', factory);

			const retrievedFactory = getDestinationFactory('real-test');
			expect(retrievedFactory).toBe(factory);

			// Test that the factory actually works
			if (retrievedFactory) {
				const plugin = await retrievedFactory({});
				expect(plugin.type).toBe('real-test');
				expect(plugin.version).toBe('1.0.0');
			}
		});

		it('should handle concurrent registrations', () => {
			const factory1 = createMockFactory('concurrent1');
			const factory2 = createMockFactory('concurrent2');

			// Simulate concurrent registration
			registerDestination('concurrent1', factory1);
			registerDestination('concurrent2', factory2);

			expect(getDestinationPluginCount()).toBe(2);
			expect(hasDestinationPlugin('concurrent1')).toBe(true);
			expect(hasDestinationPlugin('concurrent2')).toBe(true);
		});
	});
});
