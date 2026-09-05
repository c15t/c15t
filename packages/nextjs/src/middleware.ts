import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

import { extractConsentRequestInputs } from './headers';

export interface C15tMiddlewareOptions {
	/**
	 * Also persist normalized geo into cookies for runtimes that do not keep
	 * middleware request headers visible to RSC.
	 */
	cookie?: boolean | { countryName?: string; regionName?: string };
}

const DEFAULT_COUNTRY_COOKIE = 'c15t-country';
const DEFAULT_REGION_COOKIE = 'c15t-region';

/**
 * Creates a `NextResponse.next()` that forwards normalized consent headers.
 *
 * Use from `middleware.ts` when the deployment platform exposes geo to
 * middleware but strips it before Server Components or Route Handlers.
 *
 * @param request - The incoming Next.js request.
 * @param options - Header and cookie forwarding options.
 * @returns A response that forwards normalized consent headers.
 */
export const c15tMiddleware = function c15tMiddleware(
	request: NextRequest,
	options: C15tMiddlewareOptions = {}
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

	return response;
};
