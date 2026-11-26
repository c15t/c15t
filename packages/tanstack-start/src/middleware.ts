import type { StorageConfig } from '@c15t/core';
import { extractConsentRequestInputs } from '@c15t/schema/types';
import type { ConsentRequestHeaderInputs as ConsentRequestInputs } from '@c15t/schema/types';
import { createMiddleware } from '@tanstack/react-start';

import {
	rememberConsentInputs,
	renderedForVisitor,
	servedByConsentRoute,
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
	 * @deprecated c15t no longer sets a subject cookie, so the middleware
	 * reads nothing from this. Removed in v4.
	 */
	storage?: Pick<
		StorageConfig,
		'crossSubdomain' | 'defaultDomain' | 'defaultExpiryDays' | 'storageKey'
	>;

	/**
	 * @deprecated c15t no longer sets a subject cookie, so the middleware
	 * reads nothing from this. Removed in v4.
	 */
	trustForwardedHeaders?: boolean;

	/**
	 * @deprecated c15t no longer sets a subject cookie, so this does
	 * nothing. Removed in v4.
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
 * The directives of a `Cache-Control`-style field, by lowercase name. A
 * quoted value can hold commas, as in `private="Set-Cookie, X-Id"`.
 */
const cacheDirectives = function cacheDirectives(
	field: string | null
): Map<string, string> {
	const directives = new Map<string, string>();
	const parts = (field ?? '').match(/(?:[^,"]|"[^"]*")+/gu) ?? [];
	for (const part of parts) {
		const [name = '', ...value] = part.split('=');
		if (name.trim()) {
			directives.set(name.trim().toLowerCase(), value.join('=').trim());
		}
	}
	return directives;
};

/**
 * Whether `directives` keep a response out of every cache that reads them.
 * A qualified `private="Set-Cookie"` only keeps the listed fields out of
 * the shared copy (RFC 9111, section 5.2.2.7).
 */
const keepsOutOfSharedCaches = function keepsOutOfSharedCaches(
	directives: Map<string, string>
): boolean {
	return directives.get('private') === '' || directives.has('no-store');
};

/**
 * The cache fields on `response` that a CDN reads in place of
 * `Cache-Control`: `CDN-Cache-Control` and the fields targeted at one CDN
 * by the same naming, such as `Vercel-CDN-Cache-Control` and
 * `Cloudflare-CDN-Cache-Control` (RFC 9213), and `Surrogate-Control`. A
 * name that only follows the convention is matched too: removing it, or
 * treating the response as shared, only keeps more out of shared caches.
 */
const targetedCacheFields = function targetedCacheFields(
	response: Response
): string[] {
	return [...response.headers.keys()].filter(
		(name) =>
			name === 'cdn-cache-control' ||
			name.endsWith('-cdn-cache-control') ||
			name === 'surrogate-control'
	);
};

/** Directives that only grant or govern storage in shared caches. */
const SHARED_ONLY_DIRECTIVES = new Set([
	'public',
	's-maxage',
	'proxy-revalidate',
]);

/**
 * `cache-control` for a response that holds one visitor's data: `private`,
 * so no shared cache may store it, with the response's own browser
 * directives (`max-age`, `no-cache`, `must-revalidate`, ...) kept.
 */
const privateCacheControl = function privateCacheControl(
	directives: Map<string, string>
): string {
	const kept = [...directives]
		.filter(([name]) => name !== 'private' && !SHARED_ONLY_DIRECTIVES.has(name))
		.map(([name, value]) => (value ? `${name}=${value}` : name));
	return ['private', ...kept].join(', ');
};

/**
 * `result` kept out of shared caches when its render read the visitor's
 * cookies, so the HTML holds that visitor's consent state.
 *
 * A shared cache may store any response without an unqualified `private`
 * or `no-store` (RFC 9111, section 3). A CDN reads a cache field targeted
 * at it in place of `Cache-Control`, and falls back to `Cache-Control`
 * without one (RFC 9213). So such a response is made `private`, and its
 * targeted fields are removed so every CDN reads that. Any other response,
 * and one the consent route served at whatever path it is mounted, is sent
 * as it is.
 *
 * The handler's response can have immutable headers, so changes go on a
 * copy.
 */
const keepVisitorRenderPrivate = function keepVisitorRenderPrivate<
	Result extends { response: Response },
>(result: Result, request: Request): Result {
	if (servedByConsentRoute(request) || !renderedForVisitor(request)) {
		return result;
	}
	const { headers } = result.response;
	const directives = cacheDirectives(headers.get('cache-control'));
	const guarded = keepsOutOfSharedCaches(directives);
	const targeted = targetedCacheFields(result.response);
	if (guarded && targeted.length === 0) {
		return result;
	}
	const response = new Response(result.response.body, result.response);
	if (!guarded) {
		response.headers.set('cache-control', privateCacheControl(directives));
	}
	for (const name of targeted) {
		response.headers.delete(name);
	}
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
 * A page whose `resolveConsent` read the visitor's cookies holds that
 * visitor's consent state, so its response is sent `private`, without the
 * cache fields a CDN reads in place of `Cache-Control`.
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
		return keepVisitorRenderPrivate(
			await next({
				context: { consent: inputs } satisfies ConsentRequestContext,
			}),
			request
		);
	});
};
