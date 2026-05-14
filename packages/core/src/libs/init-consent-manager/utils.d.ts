/**
 * Utility functions for consent manager initialization.
 *
 * @packageDocumentation
 */
import type { StoreAccess } from './types';
/**
 * Checks if localStorage is available and accessible.
 *
 * @param set - Store setter to update state if storage is unavailable
 * @returns True if localStorage is accessible, false otherwise
 */
export declare function checkLocalStorageAccess(
	set: StoreAccess['set']
): boolean;
