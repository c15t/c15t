/**
 * @packageDocumentation
 * Low-level cookie operations.
 *
 * @remarks
 * This module provides basic cookie CRUD operations (create, read, delete).
 */
import type { CookieOptions, StorageConfig } from './types';
/**
 * Sets a cookie with the specified name, value, and options.
 *
 * @param name - Cookie name
 * @param value - Cookie value (will be flattened to compact string format)
 * @param options - Cookie configuration options
 * @param config - Storage configuration
 *
 * @throws {Error} When cookie cannot be set
 *
 * @remarks
 * Uses a flat key:value,key:value format without JSON special characters.
 * This avoids issues with curly braces, quotes, and simplifies encoding.
 * Only colons and commas are used as delimiters.
 *
 * @internal
 */
export declare function setCookie(
	name: string,
	value: unknown,
	options?: CookieOptions,
	config?: StorageConfig
): void;
/**
 * Retrieves a cookie value by name.
 *
 * @typeParam ReturnType - The expected type of the parsed cookie value
 *
 * @param name - Cookie name to retrieve
 * @returns Parsed cookie value or null if not found
 *
 * @remarks
 * Parses flat key:value format and reconstructs nested objects.
 *
 * @internal
 */
export declare function getCookie<ReturnType = unknown>(
	name: string
): ReturnType | null;
/**
 * Deletes a cookie by name.
 *
 * @param name - Cookie name to delete
 * @param options - Cookie configuration options (domain and path should match the original cookie)
 * @param config - Storage configuration
 *
 * @internal
 */
export declare function deleteCookie(
	name: string,
	options?: CookieOptions,
	config?: StorageConfig
): void;
