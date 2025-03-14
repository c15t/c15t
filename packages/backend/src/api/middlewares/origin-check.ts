import { createAuthMiddleware } from '~/pkgs/api-router/call';
import { BASE_ERROR_CODES, C15TError } from '~/pkgs/errors';
import type { GenericEndpointContext } from '~/pkgs/types';
import { getHost, getOrigin, getProtocol } from '~/utils/url';
import { wildcardMatch } from '~/utils/wildcard';

/**
 * Regular expression for validating relative URLs
 * Ensures URLs don't contain path traversal attacks and have a valid structure
 *
 * @internal
 */
const VALID_RELATIVE_URL_REGEX =
	/^\/(?!\/|\\|%2f|%5c)[\w\-./]*(?:\?[\w\-./=&%]*)?$/;

/**
 * Middleware that validates request origins and callback URLs against trusted origins
 *
 * This middleware performs security checks to prevent cross-site request forgery (CSRF)
 * and open redirect vulnerabilities by validating various URLs in the request against
 * a list of trusted origins configured in the C15T context.
 *
 * @remarks
 * The middleware checks the following URLs from request body and headers:
 * - Origin/Referer header (when cookies are used and CSRF checks are enabled)
 * - callbackURL
 * - redirectTo
 * - errorCallbackURL
 * - newSubjectCallbackURL
 *
 * URLs are validated using exact matching for origins and wildcard pattern matching
 * for hostnames. Relative URLs are allowed for callback URLs but must match a safe
 * URL pattern.
 *
 * @throws {C15TError} Throws a FORBIDDEN error if any URL fails validation
 *
 * @example
 * ```typescript
 * import { c15tInstance } from '@c15t/backend';
 * // This middleware is typically used in router configuration
 * const router = createRouter(endpoints, {
 *   routerMiddleware: [
 *     {
 *       path: '/**',
 *       middleware: originCheckMiddleware
 *     }
 *   ]
 * });
 *
 * // To configure trusted origins in your C15T options:
 * const c15t = c15tInstance({
 *   // Static list of trusted origins
 *   trustedOrigins: [
 *     'https://example.com',
 *     'https://*.example.org'
 *   ]
 *
 *   // Or a function to dynamically determine trusted origins
 *   trustedOrigins: (request) => {
 *     const host = new URL(request.url).host;
 *     return [`https://${host}`, `http://${host}`];
 *   }
 * });
 * ```
 */
export const originCheckMiddleware = createAuthMiddleware(async (ctx) => {
	if (ctx.request?.method !== 'POST' || !ctx.request) {
		return;
	}
	const { body, query, context } = ctx;
	const originHeader =
		ctx.headers?.get('origin') || ctx.headers?.get('referer') || '';
	const callbackURL = body?.callbackURL || query?.callbackURL;
	const redirectURL = body?.redirectTo;
	const errorCallbackURL = body?.errorCallbackURL;
	const newSubjectCallbackURL = body?.newSubjectCallbackURL;
	const trustedOrigins: string[] = Array.isArray(context.options.trustedOrigins)
		? context.trustedOrigins
		: [
				...context.trustedOrigins,
				...(context.options.trustedOrigins?.(ctx.request) || []),
			];
	const usesCookies = ctx.headers?.has('cookie');

	/**
	 * Determines if a URL matches a trusted origin pattern
	 *
	 * @internal
	 * @param url - The URL to check
	 * @param pattern - The trusted origin pattern to match against
	 * @returns Whether the URL matches the pattern
	 */
	const matchesPattern = (url: string, pattern: string): boolean => {
		if (url.startsWith('/')) {
			return false;
		}
		if (pattern.includes('*')) {
			return wildcardMatch(pattern)(getHost(url));
		}

		const protocol = getProtocol(url);
		return protocol === 'http:' || protocol === 'https:' || !protocol
			? pattern === getOrigin(url)
			: url.startsWith(pattern);
	};

	/**
	 * Validates a URL against trusted origins
	 *
	 * @internal
	 * @param url - The URL to validate
	 * @param label - A label describing what type of URL is being validated
	 * @throws {C15TError} If the URL is not from a trusted origin
	 */
	const validateURL = (url: string | undefined, label: string) => {
		if (!url) {
			return;
		}
		const isTrustedOrigin = trustedOrigins.some(
			(origin) =>
				matchesPattern(url, origin) ||
				(url?.startsWith('/') &&
					label !== 'origin' &&
					VALID_RELATIVE_URL_REGEX.test(url))
		);
		if (!isTrustedOrigin) {
			ctx.context.logger.error(`Invalid ${label}: ${url}`);
			ctx.context.logger.info(
				`If it's a valid URL, please add ${url} to trustedOrigins in your auth config\n`,
				`Current list of trustedOrigins: ${trustedOrigins}`
			);
			throw new C15TError(
				'The URL provided is not from a trusted origin. Please ensure the URL is correctly configured in the trusted origins list.',
				{
					code: BASE_ERROR_CODES.FORBIDDEN,
					status: 403,
					data: {
						url,
						label,
						trustedOrigins,
					},
				}
			);
		}
	};
	if (usesCookies && !ctx.context.options.advanced?.disableCSRFCheck) {
		validateURL(originHeader, 'origin');
	}
	callbackURL && validateURL(callbackURL, 'callbackURL');
	redirectURL && validateURL(redirectURL, 'redirectURL');
	errorCallbackURL && validateURL(errorCallbackURL, 'errorCallbackURL');
	newSubjectCallbackURL &&
		validateURL(newSubjectCallbackURL, 'newSubjectCallbackURL');
});

/**
 * Creates a middleware that validates a specific URL against trusted origins
 *
 * This factory function creates a middleware for validating a single URL extracted
 * from the request context against the list of trusted origins.
 *
 * @param getValue - A function that extracts the URL to validate from the endpoint context
 * @returns A middleware that validates the extracted URL
 * @throws {C15TError} Throws a FORBIDDEN error if the URL fails validation
 *
 * @remarks
 * Unlike the more comprehensive originCheckMiddleware, this factory allows creating
 * targeted middleware for specific URL fields or custom extraction logic.
 *
 * @example
 * ```typescript
 * // Create a middleware that validates the 'returnUrl' from request body
 * const validateReturnUrl = originCheck(ctx => ctx.body?.returnUrl);
 *
 * // Use the middleware in a specific route
 * router.post('/api/subscribe', validateReturnUrl, subscribeHandler);
 *
 * // Create a middleware that validates a URL from a custom header
 * const validateHeaderUrl = originCheck(ctx =>
 *   ctx.headers?.get('x-callback-url')
 * );
 * ```
 */
export const originCheck = (
	getValue: (ctx: GenericEndpointContext) => string
) =>
	createAuthMiddleware(async (ctx) => {
		if (!ctx.request) {
			return;
		}
		const { context } = ctx;
		const callbackURL = getValue(ctx);
		const trustedOrigins: string[] = Array.isArray(
			context.options.trustedOrigins
		)
			? context.trustedOrigins
			: [
					...context.trustedOrigins,
					...(context.options.trustedOrigins?.(ctx.request) || []),
				];

		/**
		 * Determines if a URL matches a trusted origin pattern
		 *
		 * @internal
		 * @param url - The URL to check
		 * @param pattern - The trusted origin pattern to match against
		 * @returns Whether the URL matches the pattern
		 */
		const matchesPattern = (url: string, pattern: string): boolean => {
			if (url.startsWith('/')) {
				return false;
			}
			if (pattern.includes('*')) {
				return wildcardMatch(pattern)(getHost(url));
			}
			return url.startsWith(pattern);
		};

		/**
		 * Validates a URL against trusted origins
		 *
		 * @internal
		 * @param url - The URL to validate
		 * @param label - A label describing what type of URL is being validated
		 * @throws {C15TError} If the URL is not from a trusted origin
		 */
		const validateURL = (url: string | undefined, label: string) => {
			if (!url) {
				return;
			}
			const isTrustedOrigin = trustedOrigins.some(
				(origin) =>
					matchesPattern(url, origin) ||
					(url?.startsWith('/') &&
						label !== 'origin' &&
						VALID_RELATIVE_URL_REGEX.test(url))
			);
			if (!isTrustedOrigin) {
				ctx.context.logger.error(`Invalid ${label}: ${url}`);
				ctx.context.logger.info(
					`If it's a valid URL, please add ${url} to trustedOrigins in your auth config\n`,
					`Current list of trustedOrigins: ${trustedOrigins}`
				);
				throw new C15TError(
					'The URL provided is not from a trusted origin. Please ensure the URL is correctly configured in the trusted origins list.',
					{
						code: BASE_ERROR_CODES.FORBIDDEN,
						status: 403,
						data: {
							url,
							label,
							trustedOrigins,
						},
					}
				);
			}
		};
		callbackURL && validateURL(callbackURL, 'callbackURL');
	});
