import type { InitOutput, SSRInitialData } from 'c15t';
import { extractRelevantHeaders } from './headers';
import { normalizeBackendURL } from './normalize-url';
import type { FetchSSRDataOptions } from './types';

interface SSRFetchResult {
	init?: InitOutput;
	metadata?: SSRInitialData['metadata'];
}

function buildRequestContext(options: {
	backendURL: string;
	headers: Record<string, string>;
	overrides?: FetchSSRDataOptions['overrides'];
}): NonNullable<SSRInitialData['metadata']>['requestContext'] {
	return {
		backendURL: options.backendURL,
		country:
			options.overrides?.country ?? options.headers['x-c15t-country'] ?? null,
		region:
			options.overrides?.region ?? options.headers['x-c15t-region'] ?? null,
		language:
			options.overrides?.language ?? options.headers['accept-language'] ?? null,
		gpc: options.headers['sec-gpc'] === '1',
	};
}

/**
 * Performs the init fetch request.
 * All async work (header resolution) should be done before calling this.
 * GVL is now included in the init response when server has it configured.
 */
function performInitFetch(
	normalizedURL: string,
	relevantHeaders: Record<string, string>,
	requestContext: NonNullable<SSRInitialData['metadata']>['requestContext'],
	debug?: boolean
): Promise<SSRFetchResult> {
	const startTime = getNowMs();

	return fetch(`${normalizedURL}/init`, {
		method: 'GET',
		headers: relevantHeaders,
	})
		.then((response) => {
			const requestDurationMs = Math.max(0, Math.round(getNowMs() - startTime));
			const cache = inspectCacheHeaders(response.headers);
			const metadata: SSRInitialData['metadata'] = {
				requestContext,
				requestDurationMs,
				cache,
			};

			if (response.ok) {
				return response.json().then((init) => ({
					init: init as InitOutput,
					metadata,
				}));
			}
			if (debug) {
				console.log(
					`[c15t/server] SSR fetch failed with status: ${response.status}`
				);
				if (cache.detail) {
					console.log(`[c15t/server] SSR cache status: ${cache.detail}`);
				}
			}
			return { metadata };
		})
		.then((result: SSRFetchResult) => {
			if (debug && result.init) {
				console.log(
					`[c15t/server] SSR fetch succeeded in ${result.metadata?.requestDurationMs ?? 0}ms`
				);
				if (result.metadata?.cache?.detail) {
					console.log(
						`[c15t/server] SSR cache status: ${result.metadata.cache.detail}`
					);
				}
			}
			return result;
		})
		.catch((error) => {
			if (debug) {
				const message =
					error instanceof Error ? error.message : 'Unknown error';
				console.log(`[c15t/server] SSR fetch error: ${message}`);
			}
			return {};
		});
}

function getNowMs(): number {
	if (
		typeof performance !== 'undefined' &&
		typeof performance.now === 'function'
	) {
		return performance.now();
	}
	return Date.now();
}

function inspectCacheHeaders(headers: Headers): {
	isHit: boolean;
	detail: string | null;
} {
	const cacheHeaders = [
		'x-vercel-cache',
		'cf-cache-status',
		'x-cache',
		'cache-status',
	] as const;

	let headerDetail: string | null = null;
	let headerIndicatesHit = false;

	for (const headerName of cacheHeaders) {
		const headerValue = headers.get(headerName);
		if (!headerValue) {
			continue;
		}

		headerDetail = `${headerName}=${headerValue}`;
		headerIndicatesHit = /\b(hit|stale|revalidated|updating)\b/i.test(
			headerValue
		);
		break;
	}

	const ageHeader = headers.get('age');
	const ageValue = ageHeader ? Number.parseInt(ageHeader, 10) : Number.NaN;
	const ageIndicatesCache = Number.isFinite(ageValue) && ageValue > 0;
	const ageDetail = ageIndicatesCache ? `age=${ageValue}` : null;
	const detail =
		headerDetail && ageDetail
			? `${headerDetail}, ${ageDetail}`
			: (headerDetail ?? ageDetail);

	return {
		isHit: headerIndicatesHit || ageIndicatesCache,
		detail,
	};
}

/**
 * Fetches initial consent data on the server for SSR hydration.
 *
 * @remarks
 * This is the framework-agnostic SSR data fetching function. It accepts
 * a standard Web API Headers object and performs the fetch to the c15t backend.
 *
 * Framework-specific packages (like @c15t/nextjs) wrap this function
 * with their own header resolution logic.
 *
 * **Usage in Framework Wrappers:**
 * ```ts
 * // @c15t/nextjs
 * import { headers } from 'next/headers';
 * import { fetchSSRData } from '@c15t/react/server';
 *
 * export async function fetchInitialData(options) {
 *   const nextHeaders = await headers();
 *   return fetchSSRData({ ...options, headers: nextHeaders });
 * }
 * ```
 *
 * **Direct Usage (advanced):**
 * ```ts
 * // In any framework with access to request headers
 * import { fetchSSRData } from '@c15t/react/server';
 *
 * const data = await fetchSSRData({
 *   backendURL: '/api/consent',
 *   headers: request.headers,
 *   debug: true
 * });
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

	// Extract relevant headers from the request
	const relevantHeaders = extractRelevantHeaders(headers);

	if (debug) {
		const headerKeys = Object.keys(relevantHeaders);
		console.log(`[c15t/server] Detected headers: [${headerKeys.join(', ')}]`);

		// Log geo source if available
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

	// We can't fetch from the server if the headers are not present
	if (Object.keys(relevantHeaders).length === 0) {
		if (debug) {
			console.log(
				'[c15t/server] No relevant headers found, skipping SSR fetch'
			);
		}
		return undefined;
	}

	// Normalize URL synchronously
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

	// Apply overrides to headers
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

	// Fetch init data (GVL is included in response when server has it configured)
	const initResult = await performInitFetch(
		normalizedURL,
		initHeaders,
		buildRequestContext({
			backendURL: normalizedURL,
			headers: initHeaders,
			overrides,
		}),
		debug
	);
	const init = initResult.init;

	if (!init) {
		if (debug) {
			console.log('[c15t/server] SSR fetch returned no data');
		}
		return undefined;
	}

	// GVL is now part of the init response
	return { init, gvl: init.gvl, metadata: initResult.metadata };
}
