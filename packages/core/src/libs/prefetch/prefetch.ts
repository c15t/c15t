import type { InitOutput } from '@c15t/schema/types';
import type { SSRInitialData } from '../../store/type';
import type { PrefetchOptions } from './types';

const WINDOW_PROMISE_KEY = '__c15tInitialDataPromise';
const WINDOW_PROMISES_KEY = '__c15tInitialDataPromises';

type PrefetchPromise = Promise<SSRInitialData | undefined>;

type BrowserWindow = Window & {
	[WINDOW_PROMISE_KEY]?: PrefetchPromise;
	[WINDOW_PROMISES_KEY]?: Record<string, PrefetchPromise>;
};

function buildInitURL(backendURL: string): string {
	const normalizedBackendURL = backendURL.endsWith('/')
		? backendURL.slice(0, -1)
		: backendURL;

	return `${normalizedBackendURL}/init`;
}

function buildInitHeaders(options: PrefetchOptions): Record<string, string> {
	const headers: Record<string, string> = {};
	const { overrides } = options;

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
}

interface PrefetchConfig {
	url: string;
	credentials: RequestCredentials;
	headers: Record<string, string>;
	cacheKey: string;
}

function buildPrefetchCacheKey(options: {
	url: string;
	credentials: RequestCredentials;
	headers: Record<string, string>;
}): string {
	const sortedHeaders = Object.entries(options.headers)
		.sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
		.map(([key, value]) => `${key}:${value}`)
		.join('|');

	return `${options.url}|${options.credentials}|${sortedHeaders}`;
}

function buildPrefetchConfig(options: PrefetchOptions): PrefetchConfig {
	const url = buildInitURL(options.backendURL);
	const credentials = options.credentials ?? 'include';
	const headers = buildInitHeaders(options);

	return {
		url,
		credentials,
		headers,
		cacheKey: buildPrefetchCacheKey({ url, credentials, headers }),
	};
}

function toInitialData(
	init: InitOutput | undefined
): SSRInitialData | undefined {
	if (!init) {
		return undefined;
	}

	return { init, gvl: init.gvl };
}

function getBrowserWindow(): BrowserWindow | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}

	return window as BrowserWindow;
}

function getPromiseMap(
	browserWindow: BrowserWindow
): Record<string, PrefetchPromise> {
	if (!browserWindow[WINDOW_PROMISES_KEY]) {
		browserWindow[WINDOW_PROMISES_KEY] = {};
	}

	return browserWindow[WINDOW_PROMISES_KEY];
}

function createPrefetchPromise(config: PrefetchConfig): PrefetchPromise {
	return fetch(config.url, {
		method: 'GET',
		credentials: config.credentials,
		headers: config.headers,
	})
		.then((response) =>
			response.ok ? (response.json() as Promise<InitOutput>) : undefined
		)
		.then((init) => toInitialData(init))
		.catch(() => undefined);
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
	const payload = buildPrefetchConfig(options);

	const json = JSON.stringify(payload).replace(/</g, '\\u003c');

	return `(() => {
  const legacyKey = '${WINDOW_PROMISE_KEY}';
  const mapKey = '${WINDOW_PROMISES_KEY}';
  if (typeof window === 'undefined') {
    return;
  }
  const config = ${json};
  const promises = (window[mapKey] = window[mapKey] || {});
  if (promises[config.cacheKey]) {
    if (!window[legacyKey]) {
      window[legacyKey] = promises[config.cacheKey];
    }
    return;
  }
  const promise = fetch(config.url, {
    method: 'GET',
    credentials: config.credentials,
    headers: config.headers
  })
    .then((response) => (response.ok ? response.json() : undefined))
    .then((init) => (init ? { init, gvl: init.gvl } : undefined))
    .catch(() => undefined);
  promises[config.cacheKey] = promise;
  if (!window[legacyKey]) {
    window[legacyKey] = promise;
  }
})();`;
}

/**
 * Reads the browser-prefetched initial data Promise, if it exists.
 *
 * @param options - Optional prefetch options. Provide the same options used
 * with the prefetch script or `ensurePrefetchedInitialData` to resolve the
 * matching entry.
 * @returns The existing prefetch Promise or `undefined` when not available.
 */
export function getPrefetchedInitialData(): PrefetchPromise | undefined;
export function getPrefetchedInitialData(
	options: PrefetchOptions
): PrefetchPromise | undefined;
export function getPrefetchedInitialData(
	options?: PrefetchOptions
): PrefetchPromise | undefined {
	const browserWindow = getBrowserWindow();
	if (!browserWindow) {
		return undefined;
	}

	if (options) {
		return browserWindow[WINDOW_PROMISES_KEY]?.[
			buildPrefetchConfig(options).cacheKey
		];
	}

	return browserWindow[WINDOW_PROMISE_KEY];
}

/**
 * Gets the existing browser-prefetched initial data Promise or creates one.
 *
 * @remarks
 * Useful in static apps where you want SSR-like hydration behavior
 * without server-side data fetching. The first call creates the fetch
 * Promise; subsequent calls return the same Promise.
 *
 * @returns A shared Promise that resolves to the same shape as server-side
 * `fetchSSRData()`.
 */
export function ensurePrefetchedInitialData(
	options: PrefetchOptions
): PrefetchPromise | undefined {
	const browserWindow = getBrowserWindow();
	if (!browserWindow) {
		return undefined;
	}

	const config = buildPrefetchConfig(options);
	const promises = getPromiseMap(browserWindow);

	if (!promises[config.cacheKey]) {
		promises[config.cacheKey] = createPrefetchPromise(config);
	}

	if (!browserWindow[WINDOW_PROMISE_KEY]) {
		browserWindow[WINDOW_PROMISE_KEY] = promises[config.cacheKey];
	}

	return promises[config.cacheKey];
}
