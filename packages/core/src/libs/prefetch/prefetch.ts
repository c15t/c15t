import type { InitOutput } from '@c15t/schema/types';
import { C15T_VERSION_HEADERS } from '../../client/headers';
import type { SSRInitialData } from '../../store/type';
import { createConsentVisitId } from '../consent-visit';
import {
	buildRequestContextHeaders,
	createBrowserRequestContext,
	createRuntimeRequestContextMatcher,
	matchesStoredRequestContext,
} from '../request-context';
import type { PrefetchOptions } from './types';

const WINDOW_PROMISES_KEY = '__c15tInitialDataPromises';

type PrefetchPromise = Promise<SSRInitialData | undefined>;
type PrefetchEntry = {
	promise: PrefetchPromise;
	requestContext: NonNullable<SSRInitialData['metadata']>['requestContext'];
};

type BrowserWindow = Window & {
	[WINDOW_PROMISES_KEY]?: Record<string, PrefetchEntry>;
};

function buildInitURL(backendURL: string): string {
	return `${backendURL}/init`;
}

interface PrefetchConfig {
	url: string;
	credentials: RequestCredentials;
	headers: Record<string, string>;
	requestContext: NonNullable<SSRInitialData['metadata']>['requestContext'];
	cacheKey: string;
}

function buildPrefetchCacheKey(options: {
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
}

function buildPrefetchConfig(options: PrefetchOptions): PrefetchConfig {
	const requestContext = createBrowserRequestContext(options);
	if (!requestContext) {
		throw new Error(`Invalid backend URL: ${options.backendURL}`);
	}

	const url = buildInitURL(requestContext.backendURL);
	const credentials = requestContext.credentials ?? 'include';
	const headers = {
		...C15T_VERSION_HEADERS,
		...buildRequestContextHeaders(options.overrides),
	};

	return {
		url,
		credentials,
		headers,
		requestContext,
		cacheKey: buildPrefetchCacheKey({
			url,
			credentials,
			headers,
			gpc: requestContext.gpc,
		}),
	};
}

function toInitialData(
	config: Pick<PrefetchConfig, 'requestContext'>,
	init: InitOutput | undefined,
	visitId?: string
): SSRInitialData | undefined {
	if (!init) {
		return undefined;
	}

	return {
		init,
		gvl: init.gvl,
		metadata: {
			requestContext: config.requestContext,
			...(visitId && {
				visitTracking: { source: 'browser' as const, visitId },
			}),
		},
	};
}

function getBrowserWindow(): BrowserWindow | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}

	return window as BrowserWindow;
}

function getPromiseMap(
	browserWindow: BrowserWindow
): Record<string, PrefetchEntry> {
	if (!browserWindow[WINDOW_PROMISES_KEY]) {
		browserWindow[WINDOW_PROMISES_KEY] = {};
	}

	return browserWindow[WINDOW_PROMISES_KEY];
}

function createPrefetchEntry(config: PrefetchConfig): PrefetchEntry {
	const visitId = createConsentVisitId();
	const url = new URL(config.url);
	if (visitId) {
		url.searchParams.set('c15tVisitId', visitId);
		url.searchParams.set('c15tVisitSource', 'browser');
	}
	const promise = fetch(url.toString(), {
		method: 'GET',
		credentials: config.credentials,
		...(visitId && { cache: 'no-store' as const }),
		headers: config.headers,
	})
		.then((response) =>
			response.ok ? (response.json() as Promise<InitOutput>) : undefined
		)
		.then((init) => toInitialData(config, init, visitId))
		.catch(() => undefined);

	return {
		promise,
		requestContext: config.requestContext,
	};
}

function getMatchingPrefetchEntry(options: {
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
		overrides: options.overrides,
		credentials: options.credentials,
	});
	if (!matcher) {
		return undefined;
	}

	const entries = Object.values(browserWindow[WINDOW_PROMISES_KEY] ?? {});
	const matches = entries.filter((entry) => {
		const requestContext = entry.requestContext;
		return requestContext
			? matchesStoredRequestContext(requestContext, matcher)
			: false;
	});

	return matches.length === 1 ? matches[0] : undefined;
}

export function getMatchingPrefetchedInitialData(options: {
	backendURL: string;
	overrides?: PrefetchOptions['overrides'];
	credentials?: RequestCredentials;
}): PrefetchPromise | undefined {
	return getMatchingPrefetchEntry(options)?.promise;
}

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
export function buildPrefetchScript(options: PrefetchOptions): string {
	const payload = {
		backendURL: options.backendURL,
		credentials: options.credentials ?? 'include',
		headers: {
			...C15T_VERSION_HEADERS,
			...buildRequestContextHeaders(options.overrides),
		},
		requestContext: {
			country: options.overrides?.country ?? null,
			region: options.overrides?.region ?? null,
			language: options.overrides?.language ?? null,
		},
	};

	const json = JSON.stringify(payload).replace(/</g, '\\u003c');

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
      return value === true || value === '1';
    } catch {
      return false;
    }
  };
  const backendURL = canonicalizeBackendURL(payload.backendURL);
  if (!backendURL) {
    return;
  }
  const gpc = detectGpc();
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
  let visitId;
  try {
    visitId = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : undefined;
  } catch {}
  const requestURL = new URL(url);
  if (visitId) {
    requestURL.searchParams.set('c15tVisitId', visitId);
    requestURL.searchParams.set('c15tVisitSource', 'browser');
  }
  const promise = fetch(requestURL.toString(), {
    method: 'GET',
    credentials: payload.credentials,
    headers: payload.headers,
    ...(visitId ? { cache: 'no-store' } : {})
  })
    .then((response) => (response.ok ? response.json() : undefined))
    .then((init) => (init
      ? {
          init,
          gvl: init.gvl,
          metadata: {
            requestContext,
            ...(visitId ? { visitTracking: { source: 'browser', visitId } } : {})
          }
        }
      : undefined))
    .catch(() => undefined);
  promises[cacheKey] = {
    promise,
    requestContext
  };
})();`;
}

export function primePrefetchedInitialData(
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
}
