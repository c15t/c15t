/**
 * CORS middleware utility for c15t that handles origin validation and CORS headers
 *
 * @packageDocumentation
 */

/** Regular expression to match www prefix in domain names */
const WWW_REGEX = /^www\./;

/** Regular expression to match protocol and www prefix in URLs */
const PROTOCOL_WWW_REGEX = /^https?:\/\/(www\.)?/;

/**
 * Supported HTTP methods for CORS
 */
const SUPPORTED_METHODS = [
	'GET',
	'POST',
	'PUT',
	'DELETE',
	'PATCH',
	'OPTIONS',
] as const;

/**
 * Supported headers for CORS requests
 */
const SUPPORTED_HEADERS = ['Content-Type', 'Authorization'] as const;

/**
 * CORS configuration options type
 */
export interface CORSConfig {
	/** Origin validation function */
	origin: (origin: string) => string | boolean;
	/** Whether to allow credentials */
	credentials: boolean;
	/** Allowed headers */
	allowHeaders: readonly string[];
	/** Max age for preflight requests */
	maxAge: number;
	/** Allowed HTTP methods */
	methods: readonly string[];
}

/**
 * Default CORS configuration for unrestricted access
 */
const DEFAULT_CORS_CONFIG: CORSConfig = {
	origin: () => '*',
	credentials: false,
	allowHeaders: SUPPORTED_HEADERS,
	maxAge: 600,
	methods: SUPPORTED_METHODS,
} as const;

/**
 * Creates CORS options configuration for the c15t middleware
 *
 * @param trustedOrigins - Array of allowed origin patterns. Can include wildcards ('*').
 * If undefined, defaults to allowing all origins without credentials.
 *
 * @returns CORS configuration object with origin validation function and header settings
 *
 * @example
 * ```ts
 * const corsOptions = createCORSOptions(['http://localhost:3000', 'https://example.com']);
 * ```
 *
 * @throws {TypeError} When URL parsing fails in origin validation
 */
export function createCORSOptions(trustedOrigins?: string[]): CORSConfig {
	if (!trustedOrigins) {
		return DEFAULT_CORS_CONFIG;
	}

	/**
	 * Normalizes an origin string by removing protocol and www prefix
	 *
	 * @param origin - The origin URL to normalize
	 * @returns Normalized origin string without protocol and www prefix
	 *
	 * @internal
	 */
	function normalizeOrigin(origin: string): string {
		try {
			// Handle bare domains like 'localhost' or 'example.com'
			if (!origin.includes('://')) {
				return origin.toLowerCase();
			}
			// Add protocol if missing
			const originWithProtocol = origin.startsWith('http')
				? origin
				: `http://${origin}`;
			const url = new URL(originWithProtocol);
			const hostname = url.hostname.replace(WWW_REGEX, '');
			// Return without protocol to match both http and https
			return `${hostname}${url.port ? `:${url.port}` : ''}`;
		} catch {
			// Fallback: remove www manually and protocol
			return origin.replace(PROTOCOL_WWW_REGEX, '').replace(WWW_REGEX, '');
		}
	}

	/**
	 * Expands a list of origins to include www variants
	 *
	 * @param origins - Array of origin strings to expand
	 * @returns Array of origins including www variants
	 *
	 * @internal
	 */
	function expandWithWWW(origins: string[]): string[] {
		const expanded = new Set<string>();
		for (const origin of origins) {
			if (origin === '*') {
				expanded.add('*');
				continue;
			}
			const normalized = normalizeOrigin(origin);
			expanded.add(normalized);
			// Add www version if not already present
			if (!normalized.includes('www.')) {
				expanded.add(`www.${normalized}`);
			}
		}
		return Array.from(expanded);
	}

	const expandedTrusted = expandWithWWW(trustedOrigins);

	return {
		origin: (origin: string) => {
			if (!origin) {
				return '*';
			}
			const normalizedOrigin = normalizeOrigin(origin);
			if (expandedTrusted.includes('*')) {
				return origin;
			}
			// Check if the origin matches any trusted origin
			const isTrusted = expandedTrusted.some((trusted) => {
				const normalizedTrusted = normalizeOrigin(trusted);
				// For localhost, match both with and without port
				if (normalizedTrusted === 'localhost') {
					return (
						normalizedOrigin === 'localhost' ||
						normalizedOrigin.startsWith('localhost:')
					);
				}
				return normalizedTrusted === normalizedOrigin;
			});
			return isTrusted ? origin : false;
		},
		credentials: true,
		allowHeaders: SUPPORTED_HEADERS,
		maxAge: 600,
		methods: SUPPORTED_METHODS,
	};
}
