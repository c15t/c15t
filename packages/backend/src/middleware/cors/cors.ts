/**
 * CORS middleware utility for c15t that handles origin validation and CORS headers
 *
 * @packageDocumentation
 */

/**
 * CORS configuration options compatible with Hono's cors middleware
 */
export interface CorsOptions {
	origin: string | string[] | ((origin: string) => string | null);
	methods?: string[];
	allowMethods?: string[];
	allowHeaders?: string[];
	maxAge?: number;
	credentials?: boolean;
	exposeHeaders?: string[];
}

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
const SUPPORTED_HEADERS = [
	'Content-Type',
	'Authorization',
	'x-request-id',
	'x-c15t-country',
	'x-c15t-region',
	'accept-language',
] as const;

/**
 * Normalizes an origin string by removing protocol and www prefix
 *
 * @param origin - The origin URL to normalize
 * @returns Normalized origin string without protocol and www prefix
 */
function normalizeOrigin(origin: string): string {
	try {
		// Handle bare domains like 'localhost' or 'example.com'
		if (
			!origin.includes('://') &&
			!origin.includes(':') &&
			!origin.includes('/')
		) {
			return origin.toLowerCase();
		}
		// Add protocol if missing
		const originWithProtocol =
			origin.startsWith('http://') ||
			origin.startsWith('https://') ||
			origin.startsWith('ws://') ||
			origin.startsWith('wss://')
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

/**
 * Creates CORS options configuration for Hono's cors middleware
 *
 * @param trustedOrigins - Array of allowed origin patterns or single string. Can include wildcards ('*').
 * If undefined, defaults to allowing all origins without credentials.
 *
 * @returns Hono CORS configuration object
 *
 * @example
 * ```ts
 * const corsOptions = createCORSOptions(['http://localhost:3000', 'https://example.com']);
 * app.use('*', cors(corsOptions));
 * ```
 */
export function createCORSOptions(
	trustedOrigins?: string[] | string
): CorsOptions {
	// If trustedOrigins is undefined or empty, return default config that allows all origins
	if (!trustedOrigins) {
		return {
			origin: '*',
			credentials: true,
			allowHeaders: [...SUPPORTED_HEADERS],
			maxAge: 600,
			allowMethods: [...SUPPORTED_METHODS],
			methods: [...SUPPORTED_METHODS],
		};
	}

	// Convert string to array if needed
	const origins = Array.isArray(trustedOrigins)
		? trustedOrigins
		: [trustedOrigins];
	if (origins.length === 0) {
		return {
			origin: '*',
			credentials: true,
			allowHeaders: [...SUPPORTED_HEADERS],
			maxAge: 600,
			allowMethods: [...SUPPORTED_METHODS],
			methods: [...SUPPORTED_METHODS],
		};
	}

	const expandedTrusted = expandWithWWW(origins);

	return {
		origin: (origin) => {
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
						normalizedOrigin.startsWith('localhost:') ||
						normalizedOrigin === '127.0.0.1' ||
						normalizedOrigin.startsWith('127.0.0.1:') ||
						normalizedOrigin === '[::1]' ||
						normalizedOrigin.startsWith('[::1]:')
					);
				}
				return normalizedTrusted === normalizedOrigin;
			});
			return isTrusted ? origin : null;
		},
		credentials: true,
		allowHeaders: [...SUPPORTED_HEADERS],
		maxAge: 600,
		allowMethods: [...SUPPORTED_METHODS],
		methods: [...SUPPORTED_METHODS],
	};
}
