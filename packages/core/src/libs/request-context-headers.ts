import type { InitRequestParams } from '@c15t/schema/types';

import type { Overrides } from '../options/overrides';

/**
 * Credentials mode for `GET /init` when the caller sets none.
 *
 * `/init` reads no cookie and sets none: its answer depends only on the
 * request's geo, language, GPC and declared contract. `same-origin` keeps
 * cookies on a same-origin init route (an app may gate `/api/c15t` behind
 * its own session), and leaves them off a cross-origin backend, which can
 * then answer with `Access-Control-Allow-Origin: *`. Saves keep
 * `include`.
 */
export const DEFAULT_INIT_CREDENTIALS: RequestCredentials = 'same-origin';

/**
 * The caller's init overrides in their request-header form.
 *
 * A browser's `GET /init` does not send most of these: country, region and
 * GPC travel as query parameters ({@link buildRequestContextParams}) so the
 * request needs no CORS preflight. This record is what the response is read
 * against (the GPC override, prefetch matching) and what server-side
 * callers forward.
 *
 * In its own module so code that only builds the init request does not pull
 * in the rest of `request-context` (URL canonicalization, prefetch
 * matching, GPC detection).
 *
 * @param overrides - Country, region, language and GPC overrides.
 * @returns Header record of the overrides.
 */
export const buildRequestContextHeaders = function buildRequestContextHeaders(
	overrides?: Pick<Overrides, 'country' | 'region' | 'language' | 'gpc'>
): Record<string, string> {
	const headers: Record<string, string> = {};

	if (overrides?.gpc !== undefined) {
		// `Sec-*` request headers are forbidden to scripts, so the override
		// travels on the adapter header the shared extractor reads first.
		headers['x-c15t-gpc'] = overrides.gpc ? '1' : '0';
	}

	if (overrides?.country) {
		headers['x-c15t-country'] = overrides.country;
	}

	if (overrides?.region) {
		headers['x-c15t-region'] = overrides.region;
	}

	if (overrides?.language) {
		headers['accept-language'] = overrides.language;
	}

	return headers;
};

/**
 * The init overrides a browser's `GET /init` sends as query parameters:
 * country, region and GPC. Language stays on `Accept-Language`, which is
 * CORS-safelisted (see {@link buildRequestContextSentHeaders}).
 *
 * @param overrides - Country, region and GPC overrides.
 * @returns The parameters for `appendInitParams`.
 */
export const buildRequestContextParams = function buildRequestContextParams(
	overrides?: Pick<Overrides, 'country' | 'region' | 'gpc'>
): Pick<InitRequestParams, 'country' | 'region' | 'gpc'> {
	return {
		...(overrides?.country && { country: overrides.country }),
		...(overrides?.region && { region: overrides.region }),
		...(overrides?.gpc !== undefined && { gpc: overrides.gpc }),
	};
};

/**
 * The override headers a browser's `GET /init` actually sends: only
 * `Accept-Language`, which is CORS-safelisted and which every backend
 * already reads.
 *
 * @param overrides - The language override.
 * @returns Header record to spread into the init request.
 */
export const buildRequestContextSentHeaders =
	function buildRequestContextSentHeaders(
		overrides?: Pick<Overrides, 'language'>
	): Record<string, string> {
		return overrides?.language ? { 'accept-language': overrides.language } : {};
	};
