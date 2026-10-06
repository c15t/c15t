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
import { PREFETCH_WINDOW_KEY } from './window-key';

const WINDOW_PROMISES_KEY = PREFETCH_WINDOW_KEY;

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

const compareHeaderKeys = function compareHeaderKeys(
	left: string,
	right: string
): number {
	if (left < right) {
		return -1;
	}
	return left > right ? 1 : 0;
};

const buildPrefetchCacheKey = function buildPrefetchCacheKey(options: {
	url: string;
	credentials: RequestCredentials;
	headers: Record<string, string>;
	gpc: boolean;
}): string {
	// Code-point order: header names are ASCII, and the inline script below
	// must build the same key without a collator or an import.
	const sortedHeaders = Object.entries(options.headers)
		.sort(([leftKey], [rightKey]) => compareHeaderKeys(leftKey, rightKey))
		.map(([key, value]) => `${key}:${value}`)
		.join('|');

	return `${options.url}|${options.credentials}|gpc:${options.gpc}|${sortedHeaders}`;
};

const buildPrefetchConfig = function buildPrefetchConfig(
	options: PrefetchOptions
): PrefetchConfig {
	const requestContext = createBrowserRequestContext({
		...options,
		gpc: options.overrides?.gpc,
	});
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
		// An explicit override wins over the browser signal, and travels on
		// `x-c15t-gpc` inside `headers`; `null` means detect at runtime.
		gpc: options.overrides?.gpc ?? null,
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

	// Hand-minified: this text ships in the HTML of every page that starts
	// `/init` early. It builds the same cache key and request context as
	// `primePrefetchedInitialData`; the prefetch tests run it.
	//
	// Server bundlers rewrite `typeof window` as text, inside strings too
	// (Nitro's replace plugin turns it into `"undefined"`), which would make
	// this script return at once. It reads `globalThis.window` instead.
	return `(()=>{var w=globalThis.window;if(w===void 0)return;var p=${json},t=v=>v!=="/"&&v.endsWith("/")?v.slice(0,-1):v,b;try{b=t(p.backendURL);b=/^https?:\\/\\//.test(b)?t(new URL(b)+""):b.startsWith("/")?t(new URL(b,w.location.origin)+""):void 0}catch{}if(!b)return;var g=p.gpc;if(g===null)try{g=w.navigator.globalPrivacyControl===true}catch{g=false}var h=p.headers,c=p.credentials,r=p.requestContext;h["sec-gpc"]=g?"1":"0";var x={backendURL:b,country:r.country,region:r.region,language:r.language,gpc:g,credentials:c},u=b+"/init",k=u+"|"+c+"|gpc:"+g+"|"+Object.entries(h).sort(([l],[n])=>l<n?-1:l>n?1:0).map(([l,v])=>l+":"+v).join("|"),m=w["${WINDOW_PROMISES_KEY}"]=w["${WINDOW_PROMISES_KEY}"]||{};if(m[k])return;m[k]={promise:fetch(u,{method:"GET",credentials:c,headers:h}).then(async s=>{if(!s.ok)return;var i=await s.json();return i?{init:i,gvl:i.gvl,producerPolicyContract:s.headers.get("x-c15t-policy-contract"),metadata:{requestContext:x}}:void 0}).catch(()=>{}),requestContext:x}})();`;
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
