import type { StorageConfig } from '@c15t/core';
import {
	DEFAULT_CONSENT_ROUTE_PREFIX,
	resolveRequestSubject,
} from '@c15t/core/server';
import { extractConsentRequestInputs } from '@c15t/schema/types';
import type { ConsentRequestHeaderInputs as ConsentRequestInputs } from '@c15t/schema/types';
import { createMiddleware } from '@tanstack/react-start';

import { isPrerendering } from './libs/prerendering';
import {
	rememberConsentInputs,
	rememberSubjectCookieHeader,
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
	 * Set `false` when `ConsentRoot` runs with `persistence={false}` or a
	 * `consentSource`, so no `c15t-sid` cookie is set. A subject ID or
	 * choice the visitor's cookies already hold is still read.
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
 * Whether `pathname` is the consent route at `prefix` or a path under it.
 * The consent route renders no page, and its manifest is public data a
 * shared cache keeps, so it gets no subject cookie.
 */
const isConsentRoute = function isConsentRoute(
	pathname: string,
	prefix: string
): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
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
 * `result` ready to send with the subject cookie `header`.
 *
 * A shared cache may store any response without an unqualified `private`
 * or `no-store` (RFC 9111, section 3). A CDN reads a cache field targeted
 * at it in place of `Cache-Control`, and falls back to `Cache-Control`
 * without one (RFC 9213). Therefore:
 * - a response whose `resolveConsent` read the visitor's cookies holds that
 *   visitor's consent state and subject ID. It is made `private`, and its
 *   targeted fields are removed so every CDN reads that;
 * - a response with no such render that some shared cache may store, by
 *   stating caching in `Cache-Control` (`public`, `s-maxage`, `max-age`,
 *   `no-cache` or `Expires`) or in a targeted field, is a shared resource
 *   and gets no cookie;
 * - any other response gets the cookie and is made `private`.
 *
 * A response the consent route served, at whatever path it is mounted, is
 * sent as it is: its manifest is public data and init is private, and
 * neither is a page.
 *
 * The handler's response can have immutable headers, so changes go on a
 * copy.
 */
const withSetCookie = function withSetCookie<
	Result extends { response: Response },
>(result: Result, header: string | undefined, request: Request): Result {
	if (servedByConsentRoute(request)) {
		return result;
	}
	const { headers } = result.response;
	const directives = cacheDirectives(headers.get('cache-control'));
	const guarded = keepsOutOfSharedCaches(directives);
	const personal = renderedForVisitor(request);
	const targeted = targetedCacheFields(result.response);
	const statesCaching =
		directives.has('public') ||
		directives.has('s-maxage') ||
		directives.has('max-age') ||
		directives.has('no-cache') ||
		headers.has('expires');
	// RFC 9213 fields take `private` and `no-store` as `Cache-Control`
	// does. Fastly documents only freshness directives in
	// `Surrogate-Control`, so any of it may let the CDN store the response.
	const cdnMayStore = targeted.some(
		(name) =>
			name === 'surrogate-control' ||
			!keepsOutOfSharedCaches(cacheDirectives(headers.get(name)))
	);
	if (!personal && (cdnMayStore || (!guarded && statesCaching))) {
		return result;
	}
	const unchanged = guarded ? !header : !(header || personal);
	if (unchanged && !(personal && targeted.length > 0)) {
		return result;
	}
	const response = new Response(result.response.body, result.response);
	if (!guarded) {
		response.headers.set('cache-control', privateCacheControl(directives));
	}
	if (personal) {
		for (const name of targeted) {
			response.headers.delete(name);
		}
	}
	if (header) {
		response.headers.append('set-cookie', header);
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
			options.subjectCookie === false ||
			isConsentRoute(
				new URL(request.url).pathname,
				DEFAULT_CONSENT_ROUTE_PREFIX
			)
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
			subject?.setCookie?.header,
			request
		);
	});
};
