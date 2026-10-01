import {
	CONSENT_EXPERIMENT_HEADER,
	formatExperimentHeader,
} from '@c15t/schema/types';

import { buildRequestContextHeaders } from '../libs/request-context-headers';
import type { InitContext } from '../types';
import { trimSlash } from './hosted-records';
import { c15tProtocolHeaders } from './version-header';

/** The `GET /init` request the hosted transport sends. */
export interface HostedInitRequest {
	/** `initURL`, or `${backendURL}/init`. */
	url: string;
	/** Allowed caller headers plus the override headers. */
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
 * @param options - Backend URL, optional `initURL`, credentials mode, the
 *   already-allowlisted caller headers, and the init overrides.
 * @returns The URL, the request headers and the fetch options.
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
	}): HostedInitRequest {
		const requestHeaders = {
			...options.headers,
			...buildRequestContextHeaders(options.overrides),
		};
		return {
			init: {
				credentials: options.credentials ?? 'include',
				headers: {
					accept: 'application/json',
					...c15tProtocolHeaders,
					...requestHeaders,
					...(options.experiment && {
						[CONSENT_EXPERIMENT_HEADER]: formatExperimentHeader(
							options.experiment
						),
					}),
				},
				method: 'GET',
			},
			requestHeaders,
			url: options.initURL ?? `${trimSlash(options.backendURL)}/init`,
		};
	};
