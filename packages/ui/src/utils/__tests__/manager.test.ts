import { describe, expect, test } from 'vitest';
import { generateCacheKey, ManagerRegistry } from '../manager';

describe('generateCacheKey', () => {
	test('generates key with default values', () => {
		const key = generateCacheKey({
			mode: 'c15t',
			backendURL: undefined,
			endpointHandlers: undefined,
			storageConfig: undefined,
			defaultLanguage: undefined,
			enabled: undefined,
		});
		expect(key).toBe('c15t:default:none:default:default:enabled');
	});

	test('generates key with custom backendURL', () => {
		const key = generateCacheKey({
			mode: 'c15t',
			backendURL: 'https://api.example.com',
			endpointHandlers: undefined,
			storageConfig: undefined,
			defaultLanguage: undefined,
			enabled: undefined,
		});
		expect(key).toBe(
			'c15t:https://api.example.com:none:default:default:enabled'
		);
	});

	test('generates key with custom endpoint handlers', () => {
		const key = generateCacheKey({
			mode: 'custom',
			backendURL: undefined,
			endpointHandlers: { getConsent: () => {} },
			storageConfig: undefined,
			defaultLanguage: undefined,
			enabled: undefined,
		});
		expect(key).toBe('custom:default:custom:default:default:enabled');
	});

	test('generates key with storage config', () => {
		const key = generateCacheKey({
			mode: 'c15t',
			backendURL: undefined,
			endpointHandlers: undefined,
			storageConfig: { storageKey: 'my-consent' },
			defaultLanguage: undefined,
			enabled: undefined,
		});
		expect(key).toBe('c15t:default:none:my-consent:default:enabled');
	});

	test('generates key with default language', () => {
		const key = generateCacheKey({
			mode: 'c15t',
			backendURL: undefined,
			endpointHandlers: undefined,
			storageConfig: undefined,
			defaultLanguage: 'de',
			enabled: undefined,
		});
		expect(key).toBe('c15t:default:none:default:de:enabled');
	});

	test('generates key with enabled false', () => {
		const key = generateCacheKey({
			mode: 'c15t',
			backendURL: undefined,
			endpointHandlers: undefined,
			storageConfig: undefined,
			defaultLanguage: undefined,
			enabled: false,
		});
		expect(key).toBe('c15t:default:none:default:default:disabled');
	});

	test('generates key with all custom values', () => {
		const key = generateCacheKey({
			mode: 'offline',
			backendURL: 'https://api.example.com',
			endpointHandlers: { getConsent: () => {} },
			storageConfig: { storageKey: 'custom-key' },
			defaultLanguage: 'fr',
			enabled: true,
		});
		expect(key).toBe(
			'offline:https://api.example.com:custom:custom-key:fr:enabled'
		);
	});
});

describe('ManagerRegistry', () => {
	test('stores and retrieves values', () => {
		const registry = new ManagerRegistry<string>();
		registry.set('key1', 'value1');
		expect(registry.get('key1')).toBe('value1');
	});

	test('returns undefined for non-existent keys', () => {
		const registry = new ManagerRegistry<string>();
		expect(registry.get('nonexistent')).toBeUndefined();
	});

	test('overwrites existing values', () => {
		const registry = new ManagerRegistry<string>();
		registry.set('key1', 'value1');
		registry.set('key1', 'value2');
		expect(registry.get('key1')).toBe('value2');
	});

	test('clears all values', () => {
		const registry = new ManagerRegistry<string>();
		registry.set('key1', 'value1');
		registry.set('key2', 'value2');
		registry.clear();
		expect(registry.get('key1')).toBeUndefined();
		expect(registry.get('key2')).toBeUndefined();
	});

	test('handles multiple keys independently', () => {
		const registry = new ManagerRegistry<number>();
		registry.set('a', 1);
		registry.set('b', 2);
		registry.set('c', 3);
		expect(registry.get('a')).toBe(1);
		expect(registry.get('b')).toBe(2);
		expect(registry.get('c')).toBe(3);
	});

	test('handles complex object values', () => {
		const registry = new ManagerRegistry<{ name: string; count: number }>();
		const obj = { name: 'test', count: 42 };
		registry.set('complex', obj);
		expect(registry.get('complex')).toEqual({ name: 'test', count: 42 });
		expect(registry.get('complex')).toBe(obj); // Same reference
	});
});
