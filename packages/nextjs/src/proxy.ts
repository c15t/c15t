import type { StorageConfig } from '@c15t/core';
import { resolveRequestSubject } from '@c15t/core/server';
import { extractConsentRequestInputs } from '@c15t/schema/types';
import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

export interface C15tProxyOptions {
	/**
	 * Also persist normalized geo into cookies for runtimes that do not keep
	 * middleware request headers visible to RSC.
	 */
	cookie?: boolean | { countryName?: string; regionName?: string };

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
}

const DEFAULT_COUNTRY_COOKIE = 'c15t-country';
const DEFAULT_REGION_COOKIE = 'c15t-region';

/**
 * Creates a `NextResponse.next()` that forwards normalized consent headers
 * and gives a new visitor a subject ID.
 *
 * Use from `proxy.ts` (Next 16) or `middleware.ts` (Next 15). It forwards
 * geo the deployment platform exposes to the proxy but strips before Server
 * Components or Route Handlers. A visitor with no subject ID gets one in a
 * `c15t-sid` cookie on this response, and the render in the same request
 * reads it, so the server render and the browser start with the same ID.
 * Prefetches get none. `@c15t/nextjs/middleware` exports the same function
 * as `c15tMiddleware`.
 *
 * @example
 * ```ts
 * // proxy.ts
 * import { c15tProxy } from '@c15t/nextjs/proxy';
 * import type { NextRequest } from 'next/server';
 *
 * export const proxy = (request: NextRequest) => c15tProxy(request);
 * ```
 *
 * @param request - The incoming Next.js request.
 * @param options - Header and cookie forwarding options.
 * @returns A response that forwards normalized consent headers.
 */
export const c15tProxy = function c15tProxy(
	request: NextRequest,
	options: C15tProxyOptions = {}
): NextResponse {
	const requestHeaders = new Headers(request.headers);
	const inputs = extractConsentRequestInputs(request.headers);

	if (inputs.country) {
		requestHeaders.set('x-c15t-country', inputs.country);
	}
	if (inputs.region) {
		requestHeaders.set('x-c15t-region', inputs.region);
	}
	if (inputs.gpc !== undefined) {
		requestHeaders.set('sec-gpc', inputs.gpc ? '1' : '0');
	}
	const subject = resolveRequestSubject({
		request: { headers: request.headers, url: request.url },
		storage: options.storage,
		trustForwardedHeaders: options.trustForwardedHeaders,
	});
	if (subject?.setCookie) {
		requestHeaders.set('cookie', subject.cookie);
	}

	const response = NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});

	if (options.cookie && inputs.country) {
		const countryName =
			typeof options.cookie === 'object'
				? (options.cookie.countryName ?? DEFAULT_COUNTRY_COOKIE)
				: DEFAULT_COUNTRY_COOKIE;
		response.cookies.set(countryName, inputs.country, {
			httpOnly: true,
			path: '/',
			sameSite: 'lax',
		});
	}
	if (options.cookie && inputs.region) {
		const regionName =
			typeof options.cookie === 'object'
				? (options.cookie.regionName ?? DEFAULT_REGION_COOKIE)
				: DEFAULT_REGION_COOKIE;
		response.cookies.set(regionName, inputs.region, {
			httpOnly: true,
			path: '/',
			sameSite: 'lax',
		});
	}

	if (subject?.setCookie) {
		const { header: _header, name, value, ...attributes } = subject.setCookie;
		response.cookies.set(name, value, attributes);
	}

	return response;
};
