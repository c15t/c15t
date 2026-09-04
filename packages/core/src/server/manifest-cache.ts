/**
 * Shared server-side manifest fetch + in-process cache.
 *
 * Every host framework that installs a same-origin `/manifest` route needs
 * the same three things: resolve the upstream manifest URL, fetch it while
 * collapsing concurrent requests, and forward the backend's cache headers
 * verbatim so the edge — not this process — does the real caching. Keeping
 * one implementation here is the same rule the geo-header module states for
 * request inputs: framework packages obtain the request natively, then call
 * shared code to interpret it.
 *
 * The cache is deliberately per-process and keyed by the resolved manifest
 * URL (query included). It is a dedupe layer, never a CDN substitute.
 */
import type { ConsentManifest } from '@c15t/schema/types';

import { c15tVersionHeaders } from '../transports/version-header';

/**
 * Just the call signature the manifest routes need.
 *
 * Deliberately narrower than `typeof globalThis.fetch`, which carries static
 * members (`fetch.preconnect` under recent `@types/node`) that no sensible
 * custom implementation provides — a framework's server-local fetch included.
 */
export type ManifestFetch = (
	input: string | URL | Request,
	init?: RequestInit
) => Promise<Response>;

/**
 * Response headers safe to forward from the backend's `/manifest` to the
 * host's same-origin route.
 *
 * `vary` is deliberately NOT forwarded. The route sends no request headers
 * upstream and returns no CORS headers downstream, so the body is a pure
 * function of the request URL. The backend's `Vary: Origin` would only
 * fragment the edge cache for no benefit.
 */
export const MANIFEST_PASSTHROUGH_HEADERS = [
	'cache-control',
	'etag',
	'last-modified',
	'content-language',
] as const;

/**
 * In-process dedupe floor, in seconds, for backends that serve `/manifest`
 * without a shared-cache TTL. Host routes deliberately do not stamp their own
 * `max-age` over the backend's header (that defeats edge caching), so without
 * this floor every request to an older backend would hit the network. Kept
 * short: it only collapses concurrent/bursty requests and is never advertised
 * downstream as a `Cache-Control` value.
 */
export const MANIFEST_DEDUPE_TTL_SECONDS = 5;

/** A manifest plus the upstream response metadata a route needs to reply. */
export interface CachedManifestResponse {
	manifest: ConsentManifest;
	/** Lowercased upstream response headers. */
	headers: Record<string, string>;
	/** Parsed `s-maxage`, or `0` when the backend sent none. */
	sMaxAge: number;
	/** Epoch milliseconds at which this entry stops being reusable. */
	expiresAt: number;
}

interface CacheEntry extends CachedManifestResponse {
	sourceURL: string;
}

const manifestCache = new Map<string, CacheEntry>();

const trimSlash = function trimSlash(value: string): string {
	return value.endsWith('/') ? value.slice(0, -1) : value;
};

const normalizeHeaders = function normalizeHeaders(
	headers: Headers
): Record<string, string> {
	const normalized: Record<string, string> = {};
	headers.forEach((value, key) => {
		normalized[key.toLowerCase()] = value;
	});
	return normalized;
};

const parseCacheDirectiveSeconds = function parseCacheDirectiveSeconds(
	cacheControl: string | undefined,
	directive: string
): number | undefined {
	if (!cacheControl) {
		return undefined;
	}
	for (const part of cacheControl.split(',')) {
		const [rawKey, rawValue] = part.trim().split('=');
		if (rawKey?.toLowerCase() !== directive) {
			continue;
		}
		const seconds = Number(rawValue);
		return Number.isFinite(seconds) && seconds >= 0
			? Math.floor(seconds)
			: undefined;
	}
	return undefined;
};

/** Reads `s-maxage` from a `Cache-Control` value; `0` when absent. */
export const getManifestSMaxAge = function getManifestSMaxAge(
	cacheControl: string | undefined
): number {
	return parseCacheDirectiveSeconds(cacheControl, 's-maxage') ?? 0;
};

/** Reads `stale-while-revalidate` from a `Cache-Control` value; `0` when absent. */
export const getManifestStaleWhileRevalidate =
	function getManifestStaleWhileRevalidate(
		cacheControl: string | undefined
	): number {
		return (
			parseCacheDirectiveSeconds(cacheControl, 'stale-while-revalidate') ?? 0
		);
	};

/** `true` when the backend explicitly forbids reusing the response. */
const forbidsReuse = function forbidsReuse(
	cacheControl: string | undefined
): boolean {
	if (!cacheControl) {
		return false;
	}
	return cacheControl
		.split(',')
		.some((part) =>
			['no-store', 'no-cache', 'private'].includes(
				part.trim().split('=')[0]?.toLowerCase() ?? ''
			)
		);
};

/**
 * How long to keep an entry in the in-process cache. Prefers the backend's
 * `s-maxage`, falls back to the dedupe floor, and honours an explicit
 * `no-store`/`no-cache`/`private` by not caching at all.
 */
const resolveCacheTtlSeconds = function resolveCacheTtlSeconds(
	cacheControl: string | undefined,
	sMaxAge: number
): number {
	if (sMaxAge > 0) {
		return sMaxAge;
	}
	return forbidsReuse(cacheControl) ? 0 : MANIFEST_DEDUPE_TTL_SECONDS;
};

/** Where the manifest lives: an explicit URL, or `backendURL + /manifest`. */
export interface ManifestSourceConfig {
	backendURL?: string;
	manifestURL?: string;
}

/**
 * Resolves the upstream manifest URL.
 *
 * @param config - Either `manifestURL` (wins) or `backendURL`.
 * @returns The absolute or origin-relative manifest URL.
 * @throws {Error} When neither field is set.
 */
export const resolveManifestSourceURL = function resolveManifestSourceURL(
	config: ManifestSourceConfig
): string {
	if (config.manifestURL) {
		return config.manifestURL;
	}
	if (!config.backendURL) {
		throw new Error(
			'@c15t/core/server: manifest mode requires `backendURL` or `manifestURL`.'
		);
	}
	return `${trimSlash(config.backendURL)}/manifest`;
};

/** Appends an already-encoded query string to a manifest URL. */
export const createManifestRequestURL =
	function createManifestRequestURL(input: {
		sourceURL: string;
		query?: string;
	}): string {
		if (!input.query) {
			return input.sourceURL;
		}
		const separator = input.sourceURL.includes('?') ? '&' : '?';
		return `${input.sourceURL}${separator}${input.query}`;
	};

/** Options for {@link fetchCachedManifest}. */
export interface FetchCachedManifestOptions {
	config: ManifestSourceConfig;
	fetch?: ManifestFetch;
	/** Already-encoded query string, e.g. `language=de`. */
	query?: string;
	/** Injectable clock, for tests. */
	now?: number;
}

/**
 * Fetches the tenant manifest, reusing a cached copy while it is fresh and
 * revalidating with `If-None-Match` once it is not.
 *
 * @param input - Source config, fetch implementation, and optional query.
 * @returns The manifest plus the upstream cache metadata.
 * @throws {Error} When no fetch is available or the backend responds non-2xx.
 */
export const fetchCachedManifest = async function fetchCachedManifest(
	input: FetchCachedManifestOptions
): Promise<CachedManifestResponse> {
	const fetchImpl = input.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error('@c15t/core/server: no fetch implementation available.');
	}

	const sourceURL = createManifestRequestURL({
		query: input.query,
		sourceURL: resolveManifestSourceURL(input.config),
	});
	const now = input.now ?? Date.now();
	const cached = manifestCache.get(sourceURL);
	if (cached && cached.expiresAt > now) {
		return cached;
	}

	const headers: Record<string, string> = {
		accept: 'application/json',
		...c15tVersionHeaders,
	};
	if (cached?.headers.etag) {
		headers['if-none-match'] = cached.headers.etag;
	}

	const response = await fetchImpl(sourceURL, { headers, method: 'GET' });

	if (response.status === 304 && cached) {
		const responseHeaders = {
			...cached.headers,
			...normalizeHeaders(response.headers),
		};
		const sMaxAge = getManifestSMaxAge(responseHeaders['cache-control']);
		const ttl = resolveCacheTtlSeconds(
			responseHeaders['cache-control'],
			sMaxAge
		);
		const refreshed: CacheEntry = {
			...cached,
			expiresAt: now + ttl * 1000,
			headers: responseHeaders,
			sMaxAge,
		};
		if (ttl > 0) {
			manifestCache.set(sourceURL, refreshed);
		} else {
			manifestCache.delete(sourceURL);
		}
		return refreshed;
	}

	if (!response.ok) {
		throw new Error(
			`@c15t/core/server: /manifest responded ${response.status} ${response.statusText}`
		);
	}

	const manifest = (await response.json()) as ConsentManifest;
	const responseHeaders = normalizeHeaders(response.headers);
	const sMaxAge = getManifestSMaxAge(responseHeaders['cache-control']);
	const ttl = resolveCacheTtlSeconds(responseHeaders['cache-control'], sMaxAge);
	const entry: CacheEntry = {
		expiresAt: now + ttl * 1000,
		headers: responseHeaders,
		manifest,
		sMaxAge,
		sourceURL,
	};
	if (ttl > 0) {
		manifestCache.set(sourceURL, entry);
	}
	return entry;
};

/** Empties the in-process manifest cache. Intended for tests. */
export const clearManifestCache = function clearManifestCache(): void {
	manifestCache.clear();
};
