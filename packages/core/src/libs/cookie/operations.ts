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
 * Finds one cookie's raw value inside a `Cookie` header or
 * `document.cookie` string.
 *
 * @param cookieHeader - Raw `Cookie` header value, or `document.cookie`.
 * @param name - Cookie name to find
 * @returns The raw value exactly as stored, or `undefined` when the cookie
 * is absent. No decoding or parsing happens here.
 *
 * @internal
 */
export const readCookieValueFromHeader = function readCookieValueFromHeader(
	cookieHeader: string | undefined,
	name: string
): string | undefined {
	if (!cookieHeader) {
		return undefined;
	}

	const nameEQ = `${name}=`;
	for (const cookie of cookieHeader.split(';')) {
		const trimmed = cookie.trim();
		if (trimmed.startsWith(nameEQ)) {
			return trimmed.substring(nameEQ.length);
		}
	}

	return undefined;
};

/**
 * Outcome of one attempt to store a cookie.
 *
 * `attempted` is true when the `document.cookie` assignment ran without
 * throwing. `verified` is true when the value read back immediately
 * afterwards equals what was written. A browser can accept the
 * assignment and still drop the cookie (size, policy, blocked storage),
 * which shows up as `attempted: true, verified: false`. A thrown
 * assignment is `attempted: false` with the error attached.
 *
 * @internal
 */
export interface CookieWriteReport {
	attempted: boolean;
	verified: boolean;
	error?: unknown;
}

const serializeCookieValue = function serializeCookieValue(
	value: unknown
): string {
	if (typeof value === 'string') {
		return value;
	}
	// 1. Flatten the nested object
	const flattened = flattenObject(value as Record<string, unknown>);
	// 2. Shorten keys for compression
	const shortened = shortenFlatKeys(flattened);
	// 3. Convert to compact string format
	return flatToString(shortened);
};

/**
 * Writes a cookie and reports what happened instead of swallowing it.
 *
 * Shared by {@link setCookie}, which keeps its void, warn-on-failure
 * contract, and by the v3 record writer, which must not report a cookie
 * as stored when the assignment threw or the browser dropped it.
 *
 * @internal
 */
export const writeCookie = function writeCookie(
	name: string,
	value: unknown,
	options?: CookieOptions,
	config?: StorageConfig
): CookieWriteReport {
	if (typeof document === 'undefined') {
		return { attempted: false, verified: false };
	}

	const opts = { ...getDefaultCookieOptions(config), ...options };

	// Handle crossSubdomain flag: convert to domain if not explicitly set
	if (opts.crossSubdomain && !options?.domain) {
		opts.domain = getRootDomain();
	}

	let cookieValue: string;
	try {
		cookieValue = serializeCookieValue(value);

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
		return { attempted: false, error, verified: false };
	}

	let readBack: string | undefined;
	try {
		readBack = readCookieValueFromHeader(document.cookie, name);
	} catch {
		readBack = undefined;
	}
	return { attempted: true, verified: readBack === cookieValue };
};

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
export const setCookie = function setCookie(
	name: string,
	value: unknown,
	options?: CookieOptions,
	config?: StorageConfig
): void {
	const report = writeCookie(name, value, options, config);
	if (!report.attempted && report.error !== undefined) {
		console.warn(`Failed to set cookie "${name}":`, report.error);
	}
};

/**
 * Parses a stored c15t cookie value using the same compact format that
 * `setCookie` writes. This is safe for server adapters that already have the
 * raw cookie value from a request header and cannot read `document.cookie`.
 *
 * @internal
 */
export const parseCookieValue = function parseCookieValue<ReturnType = unknown>(
	cookieValue: string
): ReturnType | null {
	try {
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
	} catch (error) {
		console.warn('Failed to parse cookie value:', error);
		return null;
	}
};

/**
 * Reads one cookie's raw value from `document.cookie` without parsing it.
 *
 * @param name - Cookie name to read
 * @returns The raw value, or `null` outside the browser, when the cookie
 * is absent, or when `document.cookie` cannot be read.
 *
 * @remarks
 * Read-only. Callers that need to tell the v2 compact format apart from
 * a versioned v3 envelope must see the bytes before any parser guesses.
 *
 * @internal
 */
export const getRawCookieValue = function getRawCookieValue(
	name: string
): string | null {
	if (typeof document === 'undefined') {
		return null;
	}

	try {
		return readCookieValueFromHeader(document.cookie, name) ?? null;
	} catch (error) {
		console.warn(`Failed to get cookie "${name}":`, error);
		return null;
	}
};

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
export const getCookie = function getCookie<ReturnType = unknown>(
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
				return parseCookieValue<ReturnType>(cookieValue);
			}
		}

		return null;
	} catch (error) {
		console.warn(`Failed to get cookie "${name}":`, error);
		return null;
	}
};

/**
 * Deletes a cookie by name.
 *
 * @param name - Cookie name to delete
 * @param options - Cookie configuration options (domain and path should match the original cookie)
 * @param config - Storage configuration
 *
 * @internal
 */
export const deleteCookie = function deleteCookie(
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

		document.cookie = parts.join('; ');
	} catch (error) {
		console.warn(`Failed to delete cookie "${name}":`, error);
	}
};
