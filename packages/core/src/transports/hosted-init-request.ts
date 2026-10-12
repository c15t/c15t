import {
	appendInitParams,
	appendJourneyParams,
	applyInitParamsToHeaders,
} from '@c15t/schema/types';

import {
	buildRequestContextHeaders,
	buildRequestContextParams,
	buildRequestContextSentHeaders,
	DEFAULT_INIT_CREDENTIALS,
} from '../libs/request-context-headers';
import type { InitContext } from '../types';
import { trimSlash } from './hosted-records';
import { c15tProtocolParams } from './version-header';

/** The `GET /init` request the hosted transport sends. */
export interface HostedInitRequest {
	/** `initURL`, or `${backendURL}/init`, with the init query parameters. */
	url: string;
	/**
	 * The request inputs in their header form: the allowed caller headers
	 * plus the overrides and any init parameters `initURL` already carried.
	 * The overrides travel in the query string; this record is what the
	 * response is read against.
	 */
	requestHeaders: Record<string, string>;
	/** Fetch options for the request. */
	init: RequestInit & { headers: Record<string, string> };
}

/**
 * Builds the hosted transport's `GET /init` request.
 *
 * The hosted transport and a caller that sends init before the transport
 * has loaded both build it here, so they send the same request.
 *
 * The request is a CORS simple request: a `GET` whose only headers are
 * `Accept` and, with a language override, `Accept-Language`. The version,
 * policy contract, country, region and GPC overrides, experiment arm and
 * journey all go in the query string, so a cross-origin backend answers
 * without an `OPTIONS` preflight. Allowed caller `headers` are still sent
 * as headers, so passing any outside the CORS safelist brings the
 * preflight back.
 *
 * @param options - Backend URL, optional `initURL`, credentials mode, the
 *   already-allowlisted caller headers, the init overrides, and the
 *   experiment arm and consent journey the request carries.
 * @returns The URL, the request inputs as headers and the fetch options.
 * @internal
 */
export const createHostedInitRequest =
	function createHostedInitRequest(options: {
		backendURL: string;
		initURL?: string;
		credentials?: RequestCredentials;
		headers?: Record<string, string>;
		overrides: InitContext['overrides'];
		experiment?: InitContext['experiment'];
		journey?: InitContext['journey'];
	}): HostedInitRequest {
		const base = options.initURL ?? `${trimSlash(options.backendURL)}/init`;
		const params = appendInitParams(base, {
			...c15tProtocolParams,
			...buildRequestContextParams(options.overrides),
			experiment: options.experiment,
		});
		const url = options.journey
			? appendJourneyParams(params, {
					id: options.journey.id,
					scope: options.journey.scope,
					storedChoice: options.journey.storedChoice,
				})
			: params;
		// An `initURL` parameter c15t does not replace, such as `?gpc=1`,
		// reaches the backend, so the response is read against it too.
		const requestHeaders = Object.fromEntries(
			applyInitParamsToHeaders(
				url,
				new Headers({
					...options.headers,
					...buildRequestContextHeaders(options.overrides),
				})
			)
		);
		return {
			init: {
				credentials: options.credentials ?? DEFAULT_INIT_CREDENTIALS,
				headers: {
					accept: 'application/json',
					...options.headers,
					...buildRequestContextSentHeaders(options.overrides),
				},
				method: 'GET',
			},
			requestHeaders,
			url,
		};
	};
