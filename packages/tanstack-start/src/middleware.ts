import type { StorageConfig } from '@c15t/core';
import { resolveRequestSubject } from '@c15t/core/server';
import { extractConsentRequestInputs } from '@c15t/schema/types';
import type { ConsentRequestHeaderInputs as ConsentRequestInputs } from '@c15t/schema/types';
import { createMiddleware } from '@tanstack/react-start';

import { isPrerendering } from './libs/prerendering';
import {
	rememberConsentInputs,
	rememberSubjectCookieHeader,
} from './libs/request-inputs';

/** Options for {@link consentRequestMiddleware}. */
export interface ConsentRequestMiddlewareOptions {
	/**
	 * Override the detected country (ISO 3166-1 alpha-2). Useful for local
	 * development, where no CDN geo header exists.
	 */
	country?: string;

	/**
	 * Override the detected region code.
	 */
	region?: string;

	/**
	 * Override the negotiated language. Written back onto the request as
	 * `accept-language` when header normalization is on, so readers that
	 * only look at headers (`resolveConsent`, the init route) see the same
	 * value as `context.consent.language`.
	 */
	language?: string;

	/**
	 * Write the normalized `x-c15t-country`, `x-c15t-region`, and `sec-gpc`
	 * headers back onto the incoming request so every downstream reader
	 * (server routes, server functions, `resolveConsent`) sees one
	 * canonical set regardless of which CDN populated them.
	 *
	 * @default true
	 */
	normalizeHeaders?: boolean;

	/**
	 * The client's `storageConfig`, so the subject cookie this sets matches
	 * the one the browser would: `storageKey` names it (`<storageKey>-sid`),
	 * and `defaultDomain`, `crossSubdomain` and `defaultExpiryDays` set its
	 * domain and lifetime. Set it only if you changed those client-side.
	 */
	storage?: Pick<
		StorageConfig,
		'crossSubdomain' | 'defaultDomain' | 'defaultExpiryDays' | 'storageKey'
	>;

	/**
	 * Read the request's scheme and host from `forwarded` and
	 * `x-forwarded-*` headers when deciding the subject cookie's `Secure`
	 * flag and cross-subdomain domain. Any client can send those headers, so
	 * set this only behind a proxy that sets them and drops incoming ones.
	 *
	 * @default false
	 */
	trustForwardedHeaders?: boolean;

	/**
	 * Set `false` when `ConsentRoot` runs with `persistence={false}`, so
	 * no `c15t-sid` cookie is set and each page load gets a new subject ID,
	 * as it does without storage.
	 *
	 * @default true
	 */
	subjectCookie?: boolean;
}

/** Request context contributed by {@link consentRequestMiddleware}. */
export interface ConsentRequestContext {
	/** Normalized geo, language, and GPC inputs for this request. */
	consent: ConsentRequestInputs;
}

const writeNormalizedHeaders = function writeNormalizedHeaders(
	headers: Headers,
	inputs: ConsentRequestInputs,
	language: string | undefined
): void {
	try {
		if (language) {
			headers.set('accept-language', language);
		}
		if (inputs.country) {
			headers.set('x-c15t-country', inputs.country);
		}
		if (inputs.region) {
			headers.set('x-c15t-region', inputs.region);
		}
		if (inputs.gpc !== undefined) {
			headers.set('sec-gpc', inputs.gpc ? '1' : '0');
		}
	} catch {
		// Some runtimes hand middleware an immutable Request. The inputs are
		// also remembered per request (see `rememberConsentInputs`), which is
		// what the package's own header readers consult first, so overrides
		// survive even when the headers cannot be rewritten.
	}
};

/**
 * `result` with `header` added to its response's `Set-Cookie` headers. The
 * handler's response can have immutable headers, so the cookie goes on a
 * copy.
 */
const withSetCookie = function withSetCookie<
	Result extends { response: Response },
>(result: Result, header: string | undefined): Result {
	if (!header) {
		return result;
	}
	const response = new Response(result.response.body, result.response);
	response.headers.append('set-cookie', header);
	return { ...result, response };
};

/**
 * Request middleware that normalizes consent inputs for the whole request.
 *
 * It reads the CDN geo headers (Cloudflare, Vercel, CloudFront, generic
 * proxies), `accept-language`, and `sec-gpc` through the shared extractor,
 * rewrites them onto the canonical `x-c15t-country`, `x-c15t-region`, and
 * `sec-gpc` request headers, and exposes the same values as
 * `context.consent` for server routes and server functions.
 *
 * A visitor with no subject ID gets one in a `c15t-sid` cookie on the
 * response, and `resolveConsent` in the same request reads it, so the server
 * render and the browser start with the same ID. Prerenders and prefetches
 * get none.
 *
 * Register it once for every request in `src/start.ts`:
 *
 * @example
 * ```ts
 * // src/start.ts
 * import { createStart } from '@tanstack/react-start';
 * import { consentRequestMiddleware } from '@c15t/tanstack-start/middleware';
 *
 * export const startInstance = createStart(() => ({
 *   requestMiddleware: [consentRequestMiddleware()],
 * }));
 * ```
 *
 * Or attach it to a single server route:
 *
 * @example
 * ```ts
 * export const Route = createFileRoute('/api/c15t/$')({
 *   server: {
 *     middleware: [consentRequestMiddleware()],
 *     handlers: createConsentRoute(),
 *   },
 * });
 * ```
 *
 * @param options - Overrides and header-normalization behavior.
 * @returns A TanStack Start request middleware.
 */
export const consentRequestMiddleware = function consentRequestMiddleware(
	options: ConsentRequestMiddlewareOptions = {}
) {
	return createMiddleware().server(async ({ next, request }) => {
		const inputs: ConsentRequestInputs = extractConsentRequestInputs(
			request.headers,
			{
				country: options.country,
				language: options.language,
				region: options.region,
			}
		);
		rememberConsentInputs(request, inputs);
		if (options.normalizeHeaders !== false) {
			writeNormalizedHeaders(request.headers, inputs, options.language);
		}
		const subject =
			options.subjectCookie === false
				? null
				: resolveRequestSubject({
						request: { headers: request.headers, url: request.url },
						shared: isPrerendering(),
						storage: options.storage,
						trustForwardedHeaders: options.trustForwardedHeaders,
					});
		if (subject?.setCookie) {
			rememberSubjectCookieHeader(request, subject.cookie);
		}
		return withSetCookie(
			await next({
				context: { consent: inputs } satisfies ConsentRequestContext,
			}),
			subject?.setCookie?.header
		);
	});
};
