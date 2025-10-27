/**
 * @packageDocumentation
 * Serialization utilities for cookie storage.
 *
 * @remarks
 * This module handles flattening/unflattening of nested objects and
 * conversion to/from compact string format for cookie storage.
 */

/**
 * Flattens a nested object into a single-level object with dot-notation keys.
 * Converts all values to strings for cookie storage.
 * Booleans are converted to '1'/'0' for compression.
 *
 * @param obj - Object to flatten
 * @param prefix - Key prefix for recursion
 * @returns Flattened object with dot-notation keys
 *
 * @internal
 *
 * @example
 * ```typescript
 * flattenObject({ c: { necessary: true, analytics: false }, i: { t: 123 } })
 * // Returns: { 'c.necessary': '1', 'c.analytics': '0', 'i.t': '123' }
 * ```
 */
export function flattenObject(
	obj: Record<string, unknown>,
	prefix = ''
): Record<string, string> {
	const flattened: Record<string, string> = {};

	for (const [key, value] of Object.entries(obj)) {
		const newKey = prefix ? `${prefix}.${key}` : key;

		if (value === null || value === undefined) {
			flattened[newKey] = '';
		} else if (typeof value === 'boolean') {
			flattened[newKey] = value ? '1' : '0';
		} else if (typeof value === 'object' && !Array.isArray(value)) {
			// Recursively flatten nested objects
			Object.assign(
				flattened,
				flattenObject(value as Record<string, unknown>, newKey)
			);
		} else {
			flattened[newKey] = String(value);
		}
	}

	return flattened;
}

/**
 * Reconstructs a nested object from a flattened dot-notation object.
 * Converts string values back to appropriate types.
 *
 * @param flattened - Flattened object with dot-notation keys
 * @returns Reconstructed nested object
 *
 * @internal
 *
 * @example
 * ```typescript
 * unflattenObject({ 'c.necessary': '1', 'c.analytics': '0', 'i.t': '123' })
 * // Returns: { c: { necessary: true, analytics: false }, i: { t: '123' } }
 * ```
 */
export function unflattenObject(
	flattened: Record<string, string>
): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(flattened)) {
		const keys = key.split('.');

		if (keys.length === 0) {
			continue;
		}

		let current: Record<string, unknown> = result;

		for (let i = 0; i < keys.length - 1; i++) {
			const k = keys[i];
			if (k === undefined) {
				continue;
			}
			if (!current[k]) {
				current[k] = {};
			}
			current = current[k] as Record<string, unknown>;
		}

		const lastKey = keys[keys.length - 1];

		if (lastKey === undefined) {
			continue;
		}

		// Convert back to appropriate types
		if (value === '1') {
			current[lastKey] = true;
		} else if (value === '0') {
			current[lastKey] = false;
		} else if (value === '') {
			current[lastKey] = null;
		} else if (!Number.isNaN(Number(value)) && value !== '') {
			// Try to convert to number if it looks like one
			current[lastKey] = Number(value);
		} else {
			current[lastKey] = value;
		}
	}

	return result;
}

/**
 * Converts a flattened object to a compact string format.
 * Format: "key1:value1,key2:value2,key3:value3"
 *
 * @param flattened - Flattened object
 * @returns Compact string representation
 *
 * @internal
 *
 * @example
 * ```typescript
 * flatToString({ 'c.necessary': '1', 'c.analytics': '0' })
 * // Returns: "c.necessary:1,c.analytics:0"
 * ```
 */
export function flatToString(flattened: Record<string, string>): string {
	return Object.entries(flattened)
		.map(([key, value]) => `${key}:${value}`)
		.join(',');
}

/**
 * Parses a compact string format back to a flattened object.
 * Format: "key1:value1,key2:value2,key3:value3"
 *
 * @param str - Compact string representation
 * @returns Flattened object
 *
 * @internal
 *
 * @example
 * ```typescript
 * stringToFlat("c.necessary:1,c.analytics:0")
 * // Returns: { 'c.necessary': '1', 'c.analytics': '0' }
 * ```
 */
export function stringToFlat(str: string): Record<string, string> {
	if (!str) {
		return {};
	}

	const result: Record<string, string> = {};
	const pairs = str.split(',');

	for (const pair of pairs) {
		const colonIndex = pair.indexOf(':');
		if (colonIndex === -1) {
			continue;
		}

		const key = pair.substring(0, colonIndex);
		const value = pair.substring(colonIndex + 1);
		result[key] = value;
	}

	return result;
}
