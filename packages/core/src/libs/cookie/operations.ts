/**
 * @packageDocumentation
 * Low-level cookie operations.
 *
 * @remarks
 * This module provides basic cookie CRUD operations (create, read, delete).
 */

import { getDefaultCookieOptions, getRootDomain } from './domain-utils';
import { expandFlatKeys, shortenFlatKeys } from './key-mapping';
import {
	flatToString,
	flattenObject,
	stringToFlat,
	unflattenObject,
} from './serialization';
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
export function setCookie(
	name: string,
	value: unknown,
	options?: CookieOptions,
	config?: StorageConfig
): void {
	if (typeof document === 'undefined') {
		return;
	}

	const opts = { ...getDefaultCookieOptions(config), ...options };

	// Handle crossSubdomain flag: convert to domain if not explicitly set
	if (opts.crossSubdomain && !options?.domain) {
		opts.domain = getRootDomain();
	}

	try {
		let cookieValue: string;

		if (typeof value === 'string') {
			cookieValue = value;
		} else {
			// 1. Flatten the nested object
			const flattened = flattenObject(value as Record<string, unknown>);
			// 2. Shorten keys for compression
			const shortened = shortenFlatKeys(flattened);
			// 3. Convert to compact string format
			cookieValue = flatToString(shortened);
		}

		// Calculate expiry date
		const date = new Date();
		date.setTime(date.getTime() + opts.expiryDays * 24 * 60 * 60 * 1000);
		const expires = `expires=${date.toUTCString()}`;

		// Build cookie string
		const parts = [`${name}=${cookieValue}`, expires, `path=${opts.path}`];

		if (opts.domain) {
			parts.push(`domain=${opts.domain}`);
		}

		if (opts.secure) {
			parts.push('secure');
		}

		if (opts.sameSite) {
			parts.push(`SameSite=${opts.sameSite}`);
		}

		document.cookie = parts.join('; ');
	} catch (error) {
		console.warn(`Failed to set cookie "${name}":`, error);
	}
}

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
export function getCookie<ReturnType = unknown>(
	name: string
): ReturnType | null {
	if (typeof document === 'undefined') {
		return null;
	}

	try {
		const nameEQ = `${name}=`;
		const cookies = document.cookie.split(';');

		for (const cookie of cookies) {
			let c = cookie;
			while (c.charAt(0) === ' ') {
				c = c.substring(1);
			}

			if (c.indexOf(nameEQ) === 0) {
				const cookieValue = c.substring(nameEQ.length);

				// Check if it's the flat format (contains colons)
				if (cookieValue.includes(':')) {
					// 1. Parse flat string to object
					const shortened = stringToFlat(cookieValue);
					// 2. Expand shortened keys back to full keys
					const expanded = expandFlatKeys(shortened);
					// 3. Unflatten to nested object
					const nested = unflattenObject(expanded);
					return nested as ReturnType;
				}

				// Plain string value
				return cookieValue as ReturnType;
			}
		}

		return null;
	} catch (error) {
		console.warn(`Failed to get cookie "${name}":`, error);
		return null;
	}
}

/**
 * Deletes a cookie by name.
 *
 * @param name - Cookie name to delete
 * @param options - Optional cookie configuration options (if provided, must match the original cookie's attributes)
 * @param config - Optional storage configuration
 *
 * @remarks
 * Browsers require matching attributes (path, domain, secure, sameSite) to delete cookies.
 * This function uses sensible defaults that match how cookies are set via setCookie().
 * If a cookie was set with custom options, pass matching options here.
 *
 * @internal
 */
export function deleteCookie(
	name: string,
	options?: CookieOptions,
	config?: StorageConfig
): void {
	if (typeof document === 'undefined') {
		return;
	}

	const opts = { ...getDefaultCookieOptions(config), ...options };

	// Handle crossSubdomain flag
	if (opts.crossSubdomain && !options?.domain) {
		opts.domain = getRootDomain();
	}

	try {
		const parts = [
			`${name}=`,
			'expires=Thu, 01 Jan 1970 00:00:00 GMT',
			`path=${opts.path}`,
		];

		if (opts.domain) {
			parts.push(`domain=${opts.domain}`);
		}

		if (opts.secure) {
			parts.push('secure');
		}

		if (opts.sameSite) {
			parts.push(`SameSite=${opts.sameSite}`);
		}

		document.cookie = parts.join('; ');
	} catch (error) {
		console.warn(`Failed to delete cookie "${name}":`, error);
	}
}
