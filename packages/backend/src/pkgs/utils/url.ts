import { BASE_ERROR_CODES, C15TError } from '~/pkgs/errors';
import { env } from './env';

/**
 * Regular expression to match trailing slashes in URLs
 *
 * @internal
 */
const TRAILING_SLASHES_REGEX = /\/+$/;

/**
 * Checks if a URL contains a path component other than root
 *
 * @param url - The URL to check for path components
 * @returns Boolean indicating whether the URL has a non-root path
 *
 * @throws {C15TError} When the provided URL is invalid
 *
 * @internal
 */
function checkHasPath(url: string): boolean {
	try {
		const parsedUrl = new URL(url);
		return parsedUrl.pathname !== '/';
	} catch {
		throw new C15TError(
			`Invalid base URL: ${url}. Please provide a valid base URL.`,
			{
				code: BASE_ERROR_CODES.BAD_REQUEST,
				status: 400,
				data: {
					url,
				},
			}
		);
	}
}

/**
 * Appends a path to a URL if it doesn't already have one
 *
 * This function ensures a URL has a path component by adding the
 * specified path if the URL only has a root path.
 *
 * @param url - The base URL to potentially add a path to
 * @param path - The path to append if needed (defaults to '/api/auth')
 * @returns The URL with the path component
 *
 * @throws {C15TError} When the provided URL is invalid
 *
 * @internal
 */
function withPath(url: string, path = '/api/auth') {
	const hasPath = checkHasPath(url);
	if (hasPath) {
		return url;
	}
	const pathWithSlash = path.startsWith('/') ? path : `/${path}`;
	return `${url.replace(TRAILING_SLASHES_REGEX, '')}${pathWithSlash}`;
}

/**
 * Determines the base URL for API requests
 *
 * Attempts to derive a base URL from multiple sources in the following order:
 * 1. The provided URL parameter
 * 2. Various environment variables
 * 3. Current window location (if in browser)
 *
 * @param url - Optional explicit URL to use
 * @param path - Optional path to append to the URL if it doesn't have one
 * @returns The determined base URL or undefined if unable to determine
 *
 * @throws {C15TError} When the provided URL is invalid
 *
 * @example
 * ```ts
 * // Get the base URL with default path ('/api/auth')
 * const baseUrl = getBaseURL();
 *
 * // Get the base URL with custom path
 * const apiUrl = getBaseURL(undefined, '/api/v2');
 *
 * // Use an explicit URL
 * const customUrl = getBaseURL('https://example.com');
 * ```
 */
export function getBaseURL(url?: string, path?: string) {
	if (url) {
		return withPath(url, path);
	}
	const fromEnv =
		env.C15T_URL ||
		env.NEXT_PUBLIC_C15T_URL ||
		env.PUBLIC_C15T_URL ||
		env.NUXT_PUBLIC_C15T_URL ||
		env.NUXT_PUBLIC_AUTH_URL ||
		(env.BASE_URL !== '/' ? env.BASE_URL : undefined);

	if (fromEnv) {
		return withPath(fromEnv, path);
	}

	if (typeof window !== 'undefined' && window.location) {
		return withPath(window.location.origin, path);
	}
	return undefined;
}

/**
 * Extracts the origin component from a URL
 *
 * @param url - The URL to extract the origin from
 * @returns The origin of the URL or null if invalid
 *
 * @example
 * ```ts
 * getOrigin('https://example.com/path'); // 'https://example.com'
 * getOrigin('invalid-url'); // null
 * ```
 */
export function getOrigin(url: string) {
	try {
		const parsedUrl = new URL(url);
		return parsedUrl.origin;
	} catch {
		return null;
	}
}

/**
 * Extracts the protocol component from a URL
 *
 * @param url - The URL to extract the protocol from
 * @returns The protocol of the URL (including colon) or null if invalid
 *
 * @example
 * ```ts
 * getProtocol('https://example.com'); // 'https:'
 * getProtocol('http://example.com'); // 'http:'
 * getProtocol('invalid-url'); // null
 * ```
 */
export function getProtocol(url: string) {
	try {
		const parsedUrl = new URL(url);
		return parsedUrl.protocol;
	} catch {
		return null;
	}
}

/**
 * Checks if a string is a valid URL with a protocol
 *
 * Determines if the URL includes a protocol component (e.g., 'http://', 'https://'),
 * which indicates it's a fully qualified URL rather than a relative path.
 *
 * @param url - The URL string to check
 * @returns Boolean indicating whether the URL includes a protocol
 *
 * @example
 * ```ts
 * checkURLValidity('https://example.com'); // true
 * checkURLValidity('example.com'); // false (no protocol)
 * ```
 */
export const checkURLValidity = (url: string) => {
	const urlPattern = url.includes('://');
	return urlPattern;
};

/**
 * Extracts the host component from a URL
 *
 * If the URL is a fully qualified URL with a protocol, it parses the host correctly.
 * If not, it assumes the entire string is the host.
 *
 * @param url - The URL to extract the host from
 * @returns The host component of the URL
 *
 * @example
 * ```ts
 * getHost('https://example.com/path'); // 'example.com'
 * getHost('example.com'); // 'example.com'
 * ```
 */
export function getHost(url: string) {
	if (url.includes('://')) {
		const parsedUrl = new URL(url);
		return parsedUrl.host;
	}
	return url;
}
