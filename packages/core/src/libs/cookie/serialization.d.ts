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
 * Boolean true values are converted to '1', false values are omitted for compression.
 *
 * @param obj - Object to flatten
 * @param prefix - Key prefix for recursion
 * @returns Flattened object with dot-notation keys
 *
 * @remarks
 * Optimization: False boolean values are not stored in the cookie.
 * When reading back, missing boolean values should be treated as false.
 * This significantly reduces cookie size for consent data where most values are typically false.
 *
 * @internal
 *
 * @example
 * ```typescript
 * flattenObject({ c: { necessary: true, analytics: false }, i: { t: 123 } })
 * // Returns: { 'c.necessary': '1', 'i.t': '123' }
 * // Note: analytics: false is omitted
 * ```
 */
export declare function flattenObject(
	obj: Record<string, unknown>,
	prefix?: string
): Record<string, string>;
/**
 * Reconstructs a nested object from a flattened dot-notation object.
 * Converts string values back to appropriate types.
 *
 * @param flattened - Flattened object with dot-notation keys
 * @returns Reconstructed nested object
 *
 * @remarks
 * Backward compatibility: Still handles '0' values from legacy cookies.
 * Missing boolean keys are not added to the result - the application
 * should treat undefined/missing boolean values as false.
 *
 * @internal
 *
 * @example
 * ```typescript
 * // New format (optimized) - false values are omitted
 * unflattenObject({ 'c.necessary': '1', 'i.t': '123' })
 * // Returns: { c: { necessary: true }, i: { t: 123 } }
 *
 * // Legacy format - still supported for backward compatibility
 * unflattenObject({ 'c.necessary': '1', 'c.analytics': '0', 'i.t': '123' })
 * // Returns: { c: { necessary: true, analytics: false }, i: { t: 123 } }
 * ```
 */
export declare function unflattenObject(
	flattened: Record<string, string>
): Record<string, unknown>;
/**
 * Converts a flattened object to a compact string format.
 * Format: "key1:value1,key2:value2,key3:value3"
 *
 * @param flattened - Flattened object
 * @returns Compact string representation
 *
 * @remarks
 * Works with the optimized format where false boolean values are omitted.
 * Only processes the keys that are present in the flattened object.
 *
 * @internal
 *
 * @example
 * ```typescript
 * // Optimized format (false values already omitted by flattenObject)
 * flatToString({ 'c.necessary': '1', 'i.t': '123' })
 * // Returns: "c.necessary:1,i.t:123"
 *
 * // Legacy format (still works for backward compatibility)
 * flatToString({ 'c.necessary': '1', 'c.analytics': '0' })
 * // Returns: "c.necessary:1,c.analytics:0"
 * ```
 */
export declare function flatToString(flattened: Record<string, string>): string;
/**
 * Parses a compact string format back to a flattened object.
 * Format: "key1:value1,key2:value2,key3:value3"
 *
 * @param str - Compact string representation
 * @returns Flattened object
 *
 * @remarks
 * Handles both optimized format (without false values) and legacy format.
 * Missing keys from the optimized format will not be present in the result.
 *
 * @internal
 *
 * @example
 * ```typescript
 * // Optimized format (false values omitted)
 * stringToFlat("c.necessary:1,i.t:123")
 * // Returns: { 'c.necessary': '1', 'i.t': '123' }
 *
 * // Legacy format (with explicit false values)
 * stringToFlat("c.necessary:1,c.analytics:0")
 * // Returns: { 'c.necessary': '1', 'c.analytics': '0' }
 * ```
 */
export declare function stringToFlat(str: string): Record<string, string>;
