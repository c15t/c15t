/**
 * CORS middleware utility for c15t that handles origin validation and CORS headers
 *
 * @packageDocumentation
 */

import { getAppScheme, splitAppSchemeOrigin } from './app-scheme';
import { matchesWildcard } from './matches-wildcard';

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

/** Regular expression to match a protocol prefix in URLs */
const PROTOCOL_REGEX = /^https?:\/\//;

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
	'x-c15t-version',
	'x-c15t-country',
	'x-c15t-region',
	'accept-language',
] as const;

/**
 * Normalizes an origin string by removing protocol and www prefix
 *
 * App-scheme origins (e.g. `capacitor://localhost`) keep their scheme, because
 * the scheme is what distinguishes them from the same host served over
 * `http(s)`. Prefixing them with `http://` — as the generic path below does for
 * bare hosts — would parse the scheme itself as the hostname and collapse every
 * `capacitor://*` origin onto the single host `capacitor`.
 *
 * @param origin - The origin URL to normalize
 * @returns Normalized origin string without protocol and www prefix, or
 * `scheme://authority` for app-scheme origins
 */
function normalizeOrigin(origin: string): string {
	const appScheme = getAppScheme(origin);
	if (appScheme) {
		const split = splitAppSchemeOrigin(origin, appScheme);
		return split ? `${split.scheme}//${split.authority}` : origin.toLowerCase();
	}

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
		// Return without protocol to match both http and https. The `www.` prefix
		// is preserved: stripping it here turned `www.example.com` into the apex
		// `example.com`, which `*.example.com` deliberately excludes. Equivalence
		// is applied to the trusted list instead, in `expandWithWWW`.
		return `${url.hostname}${url.port ? `:${url.port}` : ''}`;
	} catch {
		// Fallback: remove the protocol manually
		return origin.replace(PROTOCOL_REGEX, '').toLowerCase();
	}
}

/**
 * Expands a list of origins to include www variants
 *
 * Both forms are added regardless of which one was configured, so a
 * `www.example.com` entry accepts the apex and vice versa.
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
		// App-scheme origins are native WebView hosts, never www-prefixed domains
		if (getAppScheme(normalized)) {
			continue;
		}
		// Wildcards already cover every subdomain, `www` included, and a
		// `www.*.example.com` entry could never match anything.
		if (normalized.startsWith('*.')) {
			continue;
		}
		const apex = normalized.replace(WWW_REGEX, '');
		expanded.add(apex);
		expanded.add(`www.${apex}`);
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
				if (normalizedTrusted.startsWith('*.')) {
					return matchesWildcard(normalizedOrigin, normalizedTrusted);
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
