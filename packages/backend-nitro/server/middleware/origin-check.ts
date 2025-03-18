import { createError, defineEventHandler, getHeader, getRequestURL } from 'h3';

/**
 * Middleware to check request origin for CSRF protection
 *
 * Can be controlled via environment variables:
 * - ORIGIN_CHECK_ENABLED=false    Disable origin check globally
 * - ALLOWED_DOMAINS=domain1,domain2    Additional allowed domains
 * - ORIGIN_CHECK_SKIP_PATHS=/_docs,/static    Paths to skip origin check
 *
 * Or via routeRules in nitro.config.ts:
 * routeRules: {
 *   '/path/**': { cors: true }  // Disable origin check
 *   '/api/**': { cors: false }  // Enable origin check
 * }
 */
export default defineEventHandler((event) => {
	const config = useRuntimeConfig();
	const originConfig = config.c15t.originCheck;

	// Skip if origin check is globally disabled
	if (!originConfig.enabled) {
		return;
	}

	const url = getRequestURL(event);

	// Skip origin check for configured paths
	if (
		originConfig.skipPaths.some((path: string) => url.pathname.startsWith(path))
	) {
		return;
	}

	// Check origin
	const origin = getHeader(event, 'origin');
	const referer = getHeader(event, 'referer');

	// Allow requests with no origin (like curl requests)
	if (!origin && !referer) {
		return;
	}

	// Check if origin or referer is allowed
	const checkUrl = origin || referer;
	const hostname = url.hostname;

	// Safe check: same origin, localhost or explicitly allowed domains
	const allowedDomains = [
		hostname,
		'localhost',
		'127.0.0.1',
		...originConfig.allowedDomains,
	];

	if (checkUrl) {
		try {
			const parsedUrl = new URL(checkUrl);
			if (allowedDomains.includes(parsedUrl.hostname)) {
				return;
			}
		} catch (e) {
			// Failed to parse URL
		}
	}

	// Reject the request if origin check fails
	throw createError({
		statusCode: 403,
		message: 'Cross-origin request not allowed',
	});
});
