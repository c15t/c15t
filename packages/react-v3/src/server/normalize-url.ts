const ABSOLUTE_URL_REGEX = /^https?:\/\//;

function trimTrailingSlash(url: string): string {
	// Don't trim if it's just the root path "/"
	if (url === '/') {
		return url;
	}

	// Remove trailing slash if present
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

/**
 * Validates and normalizes a backend URL.
 *
 * @param backendURL - The URL to validate (absolute or relative)
 * @returns An object with isAbsolute flag and the normalized URL
 * @throws {Error} If the URL format is invalid
 *
 * @example
 * ```ts
 * validateBackendURL('https://api.example.com/');
 * // Returns: { isAbsolute: true, normalizedURL: 'https://api.example.com' }
 *
 * validateBackendURL('/api/consent/');
 * // Returns: { isAbsolute: false, normalizedURL: '/api/consent' }
 * ```
 *
 * @public
 */
export function validateBackendURL(backendURL: string): {
	isAbsolute: boolean;
	normalizedURL: string;
} {
	// Check if URL is absolute (starts with protocol)
	const isAbsolute = ABSOLUTE_URL_REGEX.test(backendURL);

	if (isAbsolute) {
		// Validate that the URL is valid
		new URL(backendURL);

		return {
			isAbsolute: true,
			normalizedURL: trimTrailingSlash(backendURL),
		};
	}

	if (backendURL.startsWith('/')) {
		return {
			isAbsolute: false,
			normalizedURL: trimTrailingSlash(backendURL),
		};
	}

	throw new Error(
		`Invalid URL format: ${backendURL}. URL must be absolute (https://...) or relative starting with (/)`
	);
}

/**
 * Normalizes a backend URL, resolving relative URLs using request headers.
 *
 * @remarks
 * For absolute URLs, returns the URL as-is (with trailing slash trimmed).
 * For relative URLs, attempts to construct the full URL using:
 * 1. x-forwarded-proto + x-forwarded-host/host headers
 * 2. Referer header as fallback
 *
 * @param backendURL - The backend URL (absolute or relative)
 * @param headersList - The Headers object from the incoming request
 * @returns The normalized absolute URL, or null if it cannot be determined
 *
 * @example
 * ```ts
 * import { normalizeBackendURL } from '@c15t/react/server';
 *
 * // Absolute URL - returns as-is
 * normalizeBackendURL('https://api.example.com/', headers);
 * // Returns: 'https://api.example.com'
 *
 * // Relative URL - resolved from headers
 * normalizeBackendURL('/api/consent', headers);
 * // Returns: 'https://example.com/api/consent' (based on headers)
 * ```
 *
 * @public
 */
export function normalizeBackendURL(
	backendURL: string,
	headersList: Headers
): string | null {
	try {
		const { normalizedURL: validated, isAbsolute } =
			validateBackendURL(backendURL);

		if (isAbsolute) {
			return validated;
		}

		const referer = headersList.get('referer');
		const protocol = headersList.get('x-forwarded-proto') || 'https';
		const host = headersList.get('x-forwarded-host') || headersList.get('host');

		if (host) {
			return trimTrailingSlash(`${protocol}://${host}${validated}`);
		}

		if (referer) {
			const refererUrl = new URL(referer);
			return trimTrailingSlash(
				`${refererUrl.protocol}//${refererUrl.host}${validated}`
			);
		}

		return null;
	} catch {
		return null;
	}
}
