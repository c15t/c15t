/**
 * Query parameters that carry the `GET /init` request inputs.
 *
 * A browser on another origin can send `/init` as a CORS simple request,
 * with no `OPTIONS` preflight, only while every request header is
 * CORS-safelisted. The protocol version, the policy contract, the init
 * overrides and the experiment arm used to travel on `x-c15t-*` headers,
 * which cost every first visit an extra round trip before the banner could
 * show. They now travel in the query string, next to the journey
 * parameters.
 *
 * Each parameter replaces one legacy request header with the same value and
 * meaning. A backend reads the parameter first and falls back to the header,
 * so clients that still send headers keep working.
 * {@link applyInitParamsToHeaders} folds the parameters onto their header
 * names, so the code that reads those headers needs no second path.
 */

import { POLICY_CONTRACT_HEADER } from './policy-resolution-wire';
import { appendSearchParams } from './search-params';
import {
	CONSENT_EXPERIMENT_HEADER,
	formatExperimentHeader,
} from './session-report';
import type { SessionExperiment } from './session-report';

/** Client package version, as the `x-c15t-version` header carried it. */
export const INIT_VERSION_PARAM = 'c15tVersion';

/** Policy wire contract the client reads (`x-c15t-policy-contract`). */
export const INIT_POLICY_CONTRACT_PARAM = 'c15tPolicyContract';

/** Country override, an ISO 3166-1 alpha-2 code (`x-c15t-country`). */
export const INIT_COUNTRY_PARAM = 'c15tCountry';

/** Region override, an ISO 3166-2 subdivision code (`x-c15t-region`). */
export const INIT_REGION_PARAM = 'c15tRegion';

/** GPC override, `1` or `0` (`x-c15t-gpc`). Any other value is ignored. */
export const INIT_GPC_PARAM = 'c15tGpc';

/**
 * Banner-experiment arm as `<id>=<arm>`, both parts URI-encoded
 * (`x-c15t-experiment`). Sent only while the visitor has no stored choice.
 */
export const INIT_EXPERIMENT_PARAM = 'c15tExperiment';

/** Each init query parameter and the legacy header it replaces. */
export const INIT_PARAM_HEADERS: readonly (readonly [string, string])[] = [
	[INIT_VERSION_PARAM, 'x-c15t-version'],
	[INIT_POLICY_CONTRACT_PARAM, POLICY_CONTRACT_HEADER],
	[INIT_COUNTRY_PARAM, 'x-c15t-country'],
	[INIT_REGION_PARAM, 'x-c15t-region'],
	[INIT_GPC_PARAM, 'x-c15t-gpc'],
	[INIT_EXPERIMENT_PARAM, CONSENT_EXPERIMENT_HEADER],
];

/** The `GET /init` inputs that travel in the query string. */
export interface InitRequestParams {
	/** Client package version. */
	version?: string;
	/** Policy wire contract the client reads. */
	policyContract?: number;
	/** Country override. */
	country?: string;
	/** Region override. */
	region?: string;
	/** GPC override. */
	gpc?: boolean;
	/** Experiment arm, while the visitor has no stored choice. */
	experiment?: SessionExperiment;
}

/**
 * Append the init inputs to a `GET /init` URL.
 *
 * Parameters are written in a fixed order, so two callers with the same
 * inputs build the same URL and a cache keyed on it sees one entry.
 *
 * @param url - The init URL, absolute or relative, or `''` for just the query.
 * @param params - The inputs. Absent fields are left out.
 * @returns The URL with the parameters.
 */
export const appendInitParams = function appendInitParams(
	url: string,
	params: InitRequestParams
): string {
	const search = new URLSearchParams();
	if (params.version) {
		search.set(INIT_VERSION_PARAM, params.version);
	}
	if (params.policyContract !== undefined) {
		search.set(INIT_POLICY_CONTRACT_PARAM, String(params.policyContract));
	}
	if (params.country) {
		search.set(INIT_COUNTRY_PARAM, params.country);
	}
	if (params.region) {
		search.set(INIT_REGION_PARAM, params.region);
	}
	if (params.gpc !== undefined) {
		search.set(INIT_GPC_PARAM, params.gpc ? '1' : '0');
	}
	if (params.experiment) {
		search.set(
			INIT_EXPERIMENT_PARAM,
			formatExperimentHeader(params.experiment)
		);
	}
	return appendSearchParams(url, search);
};

const toSearchParams = function toSearchParams(
	source: string | URL
): URLSearchParams {
	if (source instanceof URL) {
		return source.searchParams;
	}
	const query = source.indexOf('?');
	if (query === -1) {
		return new URLSearchParams();
	}
	const hash = source.indexOf('#', query);
	return new URLSearchParams(
		source.slice(query + 1, hash === -1 ? undefined : hash)
	);
};

/**
 * The request headers with the init query parameters folded onto their
 * legacy header names.
 *
 * A parameter wins over a header with the same meaning: a client that sends
 * the parameter is newer than any header a proxy might add. An empty
 * parameter is ignored, and so is a `c15tGpc` other than `1` or `0`, so a
 * malformed value never hides a browser's `Sec-GPC`.
 *
 * @param url - The request URL, absolute or relative.
 * @param headers - The request headers. Left unchanged.
 * @returns A copy of the headers with the parameters applied.
 */
export const applyInitParamsToHeaders = function applyInitParamsToHeaders(
	url: string | URL,
	headers: Headers
): Headers {
	const params = toSearchParams(url);
	const merged = new Headers(headers);
	for (const [param, header] of INIT_PARAM_HEADERS) {
		const value = params.get(param);
		if (!value) {
			continue;
		}
		if (param === INIT_GPC_PARAM && value !== '1' && value !== '0') {
			continue;
		}
		merged.set(header, value);
	}
	return merged;
};
