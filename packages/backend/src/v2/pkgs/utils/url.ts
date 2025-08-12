import { ORPCError } from '@orpc/server';
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
 * @throws {ORPCError} When the provided URL is invalid
 *
 * @internal
 */
function checkHasPath(url: string): boolean {
	try {
		const parsedUrl = new URL(url);
		return parsedUrl.pathname !== '/';
	} catch {
		throw new ORPCError('INPUT_VALIDATION_FAILED', {
			message: `Invalid base URL: ${url}. Please provide a valid base URL.`,
			status: 400,
			data: { url },
		});
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
 * @throws {ORPCError} When the provided URL is invalid
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
 * @throws {ORPCError} When the provided URL is invalid
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

	return undefined;
}
