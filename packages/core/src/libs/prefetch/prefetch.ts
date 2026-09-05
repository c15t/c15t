import type { InitOutput } from '@c15t/schema/types';

import type { SSRInitialData } from '../../options/ssr';
import { c15tProtocolHeaders } from '../../transports/version-header';
import {
	buildRequestContextHeaders,
	createBrowserRequestContext,
	createRuntimeRequestContextMatcher,
	matchesStoredRequestContext,
} from '../request-context';
import type { PrefetchOptions } from './types';

const WINDOW_PROMISES_KEY = '__c15tInitialDataPromises';

/** Raw init response and producer declaration retained until transport initialization. */
export interface PrefetchedInitialData extends SSRInitialData {
	producerPolicyContract?: string | null;
}
type PrefetchPromise = Promise<PrefetchedInitialData | undefined>;
interface PrefetchEntry {
	promise: PrefetchPromise;
	requestContext: NonNullable<SSRInitialData['metadata']>['requestContext'];
}

type BrowserWindow = Window & {
	[WINDOW_PROMISES_KEY]?: Record<string, PrefetchEntry>;
};

const buildInitURL = function buildInitURL(backendURL: string): string {
	return `${backendURL}/init`;
};

interface PrefetchConfig {
	url: string;
	credentials: RequestCredentials;
	headers: Record<string, string>;
	requestContext: NonNullable<SSRInitialData['metadata']>['requestContext'];
	cacheKey: string;
}

const buildPrefetchCacheKey = function buildPrefetchCacheKey(options: {
	url: string;
	credentials: RequestCredentials;
	headers: Record<string, string>;
	gpc: boolean;
}): string {
	const sortedHeaders = Object.entries(options.headers)
		.sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
		.map(([key, value]) => `${key}:${value}`)
		.join('|');

	return `${options.url}|${options.credentials}|gpc:${options.gpc}|${sortedHeaders}`;
};

const buildPrefetchConfig = function buildPrefetchConfig(
	options: PrefetchOptions
): PrefetchConfig {
	const requestContext = createBrowserRequestContext(options);
	if (!requestContext) {
		throw new Error(`Invalid backend URL: ${options.backendURL}`);
	}

	const url = buildInitURL(requestContext.backendURL);
	const credentials = requestContext.credentials ?? 'include';
	const headers = {
		...c15tProtocolHeaders,
		...buildRequestContextHeaders(options.overrides),
		'sec-gpc': requestContext.gpc ? '1' : '0',
	};

	return {
		cacheKey: buildPrefetchCacheKey({
			credentials,
			gpc: requestContext.gpc,
			headers,
			url,
		}),
		credentials,
		headers,
		requestContext,
		url,
	};
};

const toInitialData = function toInitialData(
	config: Pick<PrefetchConfig, 'requestContext'>,
	init: InitOutput | undefined,
	producerPolicyContract?: string | null
): PrefetchedInitialData | undefined {
	if (!init) {
		return undefined;
	}

	return {
		gvl: init.gvl,
		init,
		metadata: {
			requestContext: config.requestContext,
		},
		producerPolicyContract,
	};
};

const getBrowserWindow = function getBrowserWindow():
	| BrowserWindow
	| undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}

	return window as BrowserWindow;
};

const getPromiseMap = function getPromiseMap(
	browserWindow: BrowserWindow
): Record<string, PrefetchEntry> {
	if (!browserWindow[WINDOW_PROMISES_KEY]) {
		browserWindow[WINDOW_PROMISES_KEY] = {};
	}

	return browserWindow[WINDOW_PROMISES_KEY];
};

const createPrefetchEntry = function createPrefetchEntry(
	config: PrefetchConfig
): PrefetchEntry {
	const promise = (async () => {
		try {
			const response = await fetch(config.url, {
				credentials: config.credentials,
				headers: config.headers,
				method: 'GET',
			});
			const init = response.ok
				? ((await response.json()) as InitOutput)
				: undefined;
			return toInitialData(
				config,
				init,
				response.headers.get('x-c15t-policy-contract')
			);
		} catch {
			return undefined;
		}
	})();

	return {
		promise,
		requestContext: config.requestContext,
	};
};

const getMatchingPrefetchEntry = function getMatchingPrefetchEntry(options: {
	backendURL: string;
	overrides?: PrefetchOptions['overrides'];
	credentials?: RequestCredentials;
}): PrefetchEntry | undefined {
	const browserWindow = getBrowserWindow();
	if (!browserWindow) {
		return undefined;
	}

	const matcher = createRuntimeRequestContextMatcher({
		backendURL: options.backendURL,
		credentials: options.credentials,
		overrides: options.overrides,
	});
	if (!matcher) {
		return undefined;
	}

	const entries = Object.values(browserWindow[WINDOW_PROMISES_KEY] ?? {});
	const matches = entries.filter((entry) => {
		const { requestContext } = entry;
		// An omitted browser override is a request input, not a wildcard for
		// a prefetched response resolved with an explicit override.
		return (
			!!requestContext &&
			matchesStoredRequestContext(requestContext, matcher) &&
			requestContext.country === (matcher.country ?? null) &&
			requestContext.region === (matcher.region ?? null) &&
			requestContext.language === (matcher.language ?? null)
		);
	});

	return matches.length === 1 ? matches[0] : undefined;
};

export const getMatchingPrefetchedInitialData =
	function getMatchingPrefetchedInitialData(options: {
		backendURL: string;
		overrides?: PrefetchOptions['overrides'];
		credentials?: RequestCredentials;
	}): PrefetchPromise | undefined {
		return getMatchingPrefetchEntry(options)?.promise;
	};

/**
 * Take one matching browser prefetch during initialization, never rendering.
 * @param options - Request identity that must match the early fetch.
 * @returns Its pending response, or undefined when no unambiguous match exists.
 */
export const consumePrefetchedInitialData = (
	options: Parameters<typeof getMatchingPrefetchedInitialData>[0]
): PrefetchPromise | undefined => {
	const entry = getMatchingPrefetchEntry(options);
	const browser = getBrowserWindow();
	if (!entry || !browser) {
		return undefined;
	}
	const entries = browser[WINDOW_PROMISES_KEY];
	for (const [key, candidate] of Object.entries(entries ?? {})) {
		if (candidate === entry && entries) {
			Reflect.deleteProperty(entries, key);
		}
	}
	return entry.promise;
};

/**
 * Generates a self-contained inline script that starts the `/init`
 * prefetch before framework hydration.
 *
 * @remarks
 * The returned string is safe for inline `<script>` injection — all
 * `<` characters are escaped to `\u003c` to prevent XSS via
 * `</script>` breakout.
 *
 * Framework adapters should inject this script as early as possible
 * (e.g. `beforeInteractive` in Next.js, `<script>` in `<head>` for
 * vanilla HTML).
 */
export const buildPrefetchScript = function buildPrefetchScript(
	options: PrefetchOptions
): string {
	const payload = {
		backendURL: options.backendURL,
		credentials: options.credentials ?? 'include',
		headers: {
			...c15tProtocolHeaders,
			...buildRequestContextHeaders(options.overrides),
		},
		requestContext: {
			country: options.overrides?.country ?? null,
			language: options.overrides?.language ?? null,
			region: options.overrides?.region ?? null,
		},
	};

	const json = JSON.stringify(payload).replace(/</gu, '\\u003c');

	return `(() => {
  const mapKey = '${WINDOW_PROMISES_KEY}';
  if (typeof window === 'undefined') {
    return;
  }
  const payload = ${json};
  const trimTrailingSlash = (value) => {
    if (value === '/') {
      return value;
    }
    return value.endsWith('/') ? value.slice(0, -1) : value;
  };
  const canonicalizeBackendURL = (backendURL) => {
    try {
      const normalizedBackendURL = trimTrailingSlash(backendURL);
      if (/^https?:\\/\\//.test(normalizedBackendURL)) {
        return trimTrailingSlash(new URL(normalizedBackendURL).toString());
      }
      if (!normalizedBackendURL.startsWith('/')) {
        return undefined;
      }
      return trimTrailingSlash(
        new URL(normalizedBackendURL, window.location.origin).toString()
      );
    } catch {
      return undefined;
    }
  };
  const buildCacheKey = (url, credentials, headers, gpc) => {
    const sortedHeaders = Object.entries(headers)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, value]) => key + ':' + value)
      .join('|');
    return url + '|' + credentials + '|gpc:' + String(gpc) + '|' + sortedHeaders;
  };
  const detectGpc = () => {
    try {
      const value = window.navigator.globalPrivacyControl;
      return value === true;
    } catch {
      return false;
    }
  };
  const backendURL = canonicalizeBackendURL(payload.backendURL);
  if (!backendURL) {
    return;
  }
  const gpc = detectGpc();
  payload.headers['sec-gpc'] = gpc ? '1' : '0';
  const requestContext = {
    backendURL,
    country: payload.requestContext.country,
    region: payload.requestContext.region,
    language: payload.requestContext.language,
    gpc,
    credentials: payload.credentials
  };
  const url = backendURL + '/init';
  const cacheKey = buildCacheKey(url, payload.credentials, payload.headers, gpc);
  const promises = (window[mapKey] = window[mapKey] || {});
  if (promises[cacheKey]) {
    return;
  }
  const promise = fetch(url, {
    method: 'GET',
    credentials: payload.credentials,
    headers: payload.headers
  })
    .then(async (response) => {
      if (!response.ok) return undefined;
      const init = await response.json();
      return init ? {
        init,
        gvl: init.gvl,
        producerPolicyContract: response.headers.get('x-c15t-policy-contract'),
        metadata: { requestContext }
      } : undefined;
    })
    .catch(() => undefined);
  promises[cacheKey] = {
    promise,
    requestContext
  };
})();`;
};

export const primePrefetchedInitialData = function primePrefetchedInitialData(
	options: PrefetchOptions
): PrefetchPromise | undefined {
	const browserWindow = getBrowserWindow();
	if (!browserWindow) {
		return undefined;
	}

	const config = buildPrefetchConfig(options);
	const promises = getPromiseMap(browserWindow);

	if (!promises[config.cacheKey]) {
		promises[config.cacheKey] = createPrefetchEntry(config);
	}

	return promises[config.cacheKey]?.promise;
};
