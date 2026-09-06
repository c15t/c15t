/**
 * In-process cache for a backend `/manifest` response.
 *
 * Framework route handlers proxy the backend manifest to a same-origin URL
 * so browsers and server helpers read it without a cross-origin round trip.
 * The proxy has to avoid hitting the backend on every request, and not every
 * runtime has a data cache to lean on (the Next.js Pages Router and plain
 * Node servers have none), so the caching lives here: honour the backend's
 * `s-maxage`, revalidate with `If-None-Match` once it expires, and never
 * reuse a response the backend marked `no-store`, `no-cache`, or `private`.
 *
 * @packageDocumentation
 */

import type { ConsentManifest } from '@c15t/schema/types';

import { c15tVersionHeaders } from '../transports/version-header';

export type ManifestFetch = (
	input: string | URL | Request,
	init?: RequestInit
) => Promise<Response>;

export interface CachedManifest {
	manifest: ConsentManifest;
	/** Lower-cased response headers from the backend. */
	headers: Record<string, string>;
	/** `s-maxage` the backend asked for, `0` when it sent none. */
	sMaxAge: number;
	/** Epoch milliseconds after which the entry revalidates. */
	expiresAt: number;
}

export interface FetchCachedManifestOptions {
	/** Absolute manifest URL, including any query such as `?language=de`. */
	url: string;
	fetch?: ManifestFetch;
	/** Extra request headers, merged over the defaults. */
	headers?: Record<string, string>;
	/**
	 * Extra `RequestInit` fields for the backend fetch. Frameworks use this to
	 * pass their own cache hints, such as Next.js `next.revalidate`.
	 */
	init?: Omit<RequestInit, 'headers' | 'method'>;
	/** Clock override for tests. */
	now?: number;
}

/**
 * Floor applied when the backend sends no `s-maxage` but does not forbid
 * reuse either: enough to collapse a burst of requests into one fetch.
 */
export const MANIFEST_DEDUPE_TTL_SECONDS = 5;

const cache = new Map<string, CachedManifest>();
const inFlight = new Map<string, Promise<CachedManifest>>();

const normalizeHeaders = function normalizeHeaders(
	headers: Headers
): Record<string, string> {
	const normalized: Record<string, string> = {};
	headers.forEach((value, key) => {
		normalized[key.toLowerCase()] = value;
	});
	return normalized;
};

export const parseCacheDirectiveSeconds = function parseCacheDirectiveSeconds(
	cacheControl: string | null | undefined,
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

export const getManifestSMaxAge = function getManifestSMaxAge(
	cacheControl: string | null | undefined
): number {
	return parseCacheDirectiveSeconds(cacheControl, 's-maxage') ?? 0;
};

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
 * How long to keep an entry. Prefers the backend's `s-maxage`, falls back to
 * the dedupe floor, and honours an explicit `no-store`, `no-cache`, or
 * `private` by not caching at all.
 */
export const resolveManifestCacheTtlSeconds =
	function resolveManifestCacheTtlSeconds(
		cacheControl: string | undefined,
		sMaxAge: number
	): number {
		if (forbidsReuse(cacheControl)) {
			return 0;
		}
		return sMaxAge > 0 ? sMaxAge : MANIFEST_DEDUPE_TTL_SECONDS;
	};

const revalidate = async function revalidate(
	options: FetchCachedManifestOptions,
	fetchImpl: ManifestFetch,
	now: number,
	cached: CachedManifest | undefined
): Promise<CachedManifest> {
	const headers: Record<string, string> = {
		accept: 'application/json',
		...c15tVersionHeaders,
		...options.headers,
	};
	if (cached?.headers.etag) {
		headers['if-none-match'] = cached.headers.etag;
	}

	const response = await fetchImpl(options.url, {
		...options.init,
		headers,
		method: 'GET',
	});

	if (response.status === 304 && cached) {
		const responseHeaders = {
			...cached.headers,
			...normalizeHeaders(response.headers),
		};
		const sMaxAge = getManifestSMaxAge(responseHeaders['cache-control']);
		const ttl = resolveManifestCacheTtlSeconds(
			responseHeaders['cache-control'],
			sMaxAge
		);
		const refreshed: CachedManifest = {
			...cached,
			expiresAt: now + ttl * 1000,
			headers: responseHeaders,
			sMaxAge,
		};
		if (ttl > 0) {
			cache.set(options.url, refreshed);
		} else {
			cache.delete(options.url);
		}
		return refreshed;
	}

	if (!response.ok) {
		throw new Error(
			`fetchCachedManifest: ${options.url} responded ${response.status} ${response.statusText}`
		);
	}

	const manifest = (await response.json()) as ConsentManifest;
	const responseHeaders = normalizeHeaders(response.headers);
	const sMaxAge = getManifestSMaxAge(responseHeaders['cache-control']);
	const ttl = resolveManifestCacheTtlSeconds(
		responseHeaders['cache-control'],
		sMaxAge
	);
	const entry: CachedManifest = {
		expiresAt: now + ttl * 1000,
		headers: responseHeaders,
		manifest,
		sMaxAge,
	};
	if (ttl > 0) {
		cache.set(options.url, entry);
	}
	return entry;
};

/**
 * Fetches a manifest through the in-process cache.
 *
 * @remarks
 * A fresh entry is returned without a request. An expired entry is
 * revalidated with `If-None-Match`; a `304` extends it, anything else
 * replaces it. Concurrent misses for the same URL share one request, so a
 * burst of first visitors costs the backend a single fetch. Entries are
 * keyed by the full URL, so `?language=` variants cache independently.
 *
 * @param options - Manifest URL, fetch implementation, and extra request init
 * @returns The manifest with the backend's headers and cache metadata
 * @throws {Error} When no fetch implementation is available or the backend
 * responds with an error status
 */
export const fetchCachedManifest = function fetchCachedManifest(
	options: FetchCachedManifestOptions
): Promise<CachedManifest> {
	const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		return Promise.reject(
			new Error('fetchCachedManifest: no fetch implementation available.')
		);
	}

	const now = options.now ?? Date.now();
	const cached = cache.get(options.url);
	if (cached && cached.expiresAt > now) {
		return Promise.resolve(cached);
	}

	const pending = inFlight.get(options.url);
	if (pending) {
		return pending;
	}
	const request = (async () => {
		try {
			return await revalidate(options, fetchImpl, now, cached);
		} finally {
			inFlight.delete(options.url);
		}
	})();
	inFlight.set(options.url, request);
	return request;
};

/**
 * Drops every cached manifest. Intended for tests and for hosts that want
 * to force a refetch after a backend deploy.
 */
export const clearManifestCache = function clearManifestCache(): void {
	cache.clear();
	inFlight.clear();
};
