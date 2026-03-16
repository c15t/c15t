import type { InitOutput, SSRInitialData } from 'c15t';
import { extractRelevantHeaders } from './headers';
import { normalizeBackendURL } from './normalize-url';
import type { FetchSSRDataOptions } from './types';

/**
 * Performs the init fetch request.
 * All async work (header resolution) should be done before calling this.
 */
function performInitFetch(
	normalizedURL: string,
	relevantHeaders: Record<string, string>,
	debug?: boolean
): Promise<InitOutput | undefined> {
	const startTime = debug ? performance.now() : 0;

	return fetch(`${normalizedURL}/init`, {
		method: 'GET',
		headers: relevantHeaders,
	})
		.then((response) => {
			if (response.ok) {
				return response.json() as Promise<InitOutput>;
			}
			if (debug) {
				console.log(
					`[c15t/server] SSR fetch failed with status: ${response.status}`
				);
			}
			return undefined;
		})
		.then((result) => {
			if (debug && result) {
				const elapsed = Math.round(performance.now() - startTime);
				console.log(`[c15t/server] SSR fetch succeeded in ${elapsed}ms`);
			}
			return result;
		})
		.catch((error) => {
			if (debug) {
				console.log(
					`[c15t/server] SSR fetch error: ${error?.message || 'Unknown error'}`
				);
			}
			return undefined;
		});
}

/**
 * Fetches initial consent data on the server for SSR hydration.
 *
 * @remarks
 * This is the framework-agnostic SSR data fetching function. It accepts
 * a standard Web API Headers object and performs the fetch to the c15t backend.
 *
 * @example
 * ```ts
 * import { fetchSSRData } from '@c15t/svelte/server';
 *
 * // In your SvelteKit server load function
 * export async function load({ request }) {
 *   const data = await fetchSSRData({
 *     backendURL: '/api/consent',
 *     headers: request.headers,
 *     debug: true
 *   });
 *   return { consent: data };
 * }
 * ```
 *
 * @param options - Configuration options including backendURL, headers, overrides, and debug
 * @returns The SSR initial data or undefined if the fetch fails
 *
 * @public
 */
export async function fetchSSRData(
	options: FetchSSRDataOptions
): Promise<SSRInitialData | undefined> {
	const { backendURL, headers, overrides, debug } = options;

	if (debug) {
		console.log('[c15t/server] SSR fetch starting...');
	}

	const relevantHeaders = extractRelevantHeaders(headers);

	if (debug) {
		const headerKeys = Object.keys(relevantHeaders);
		console.log(`[c15t/server] Detected headers: [${headerKeys.join(', ')}]`);

		const cfCountry = relevantHeaders['cf-ipcountry'];
		const xCountry = relevantHeaders['x-vercel-ip-country'];
		if (cfCountry) {
			console.log(`[c15t/server] Country from cf-ipcountry: ${cfCountry}`);
		} else if (xCountry) {
			console.log(
				`[c15t/server] Country from x-vercel-ip-country: ${xCountry}`
			);
		}
	}

	if (Object.keys(relevantHeaders).length === 0) {
		if (debug) {
			console.log(
				'[c15t/server] No relevant headers found, skipping SSR fetch'
			);
		}
		return undefined;
	}

	const normalizedURL = normalizeBackendURL(backendURL, headers);
	if (!normalizedURL) {
		if (debug) {
			console.log('[c15t/server] Failed to normalize URL, skipping SSR fetch');
		}
		return undefined;
	}

	if (debug) {
		console.log(`[c15t/server] Fetching from: ${normalizedURL}/init`);
	}

	const initHeaders = { ...relevantHeaders };
	if (overrides?.country) {
		initHeaders['x-c15t-country'] = overrides.country;
		if (debug) {
			console.log(`[c15t/server] Country override: ${overrides.country}`);
		}
	}
	if (overrides?.region) {
		initHeaders['x-c15t-region'] = overrides.region;
		if (debug) {
			console.log(`[c15t/server] Region override: ${overrides.region}`);
		}
	}
	if (overrides?.language) {
		initHeaders['accept-language'] = overrides.language;
		if (debug) {
			console.log(`[c15t/server] Language override: ${overrides.language}`);
		}
	}

	const init = await performInitFetch(normalizedURL, initHeaders, debug);

	if (!init) {
		if (debug) {
			console.log('[c15t/server] SSR fetch returned no data');
		}
		return undefined;
	}

	return { init, gvl: init.gvl };
}
