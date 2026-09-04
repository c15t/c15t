/**
 * In-process manifest cache — interim local shim.
 *
 * @remarks
 * A shared implementation is landing as `@c15t/core/server`, lifted from
 * `packages/vue/src/runtime/server/manifest-mode.ts`. This file mirrors its
 * shape (ETag revalidation, `s-maxage` honoured, `no-store`/`no-cache`/
 * `private` respected, short dedupe floor otherwise) so replacing it is an
 * import change. Delete this file when that module ships.
 */

import { c15tVersionHeaders } from '@c15t/core';
import type { ConsentManifest } from '@c15t/schema/types';

/**
 * Just the call signature the routes need. Narrower than
 * `typeof globalThis.fetch`, whose static members no custom fetch provides.
 */
export type ManifestFetch = (
	input: string | URL | Request,
	init?: RequestInit
) => Promise<Response>;

/** A manifest plus the caching metadata its response carried. */
export interface CachedManifestResponse {
	manifest: ConsentManifest;
	headers: Record<string, string>;
	sMaxAge: number;
	expiresAt: number;
}

interface CacheEntry extends CachedManifestResponse {
	sourceURL: string;
}

const manifestCache = new Map<string, CacheEntry>();

/**
 * Dedupe floor, in seconds, for backends that serve `/manifest` with no
 * shared-cache TTL. It only collapses bursts; it is never advertised
 * downstream as a `Cache-Control` value.
 */
export const MANIFEST_DEDUPE_TTL_SECONDS = 5;

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

/**
 * Read `s-maxage` from a `Cache-Control` header.
 *
 * @param cacheControl - The header value.
 * @returns The value in seconds, or `0`.
 */
export const getManifestSMaxAge = function getManifestSMaxAge(
	cacheControl: string | undefined
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

const resolveCacheTtlSeconds = function resolveCacheTtlSeconds(
	cacheControl: string | undefined,
	sMaxAge: number
): number {
	if (sMaxAge > 0) {
		return sMaxAge;
	}
	return forbidsReuse(cacheControl) ? 0 : MANIFEST_DEDUPE_TTL_SECONDS;
};

/**
 * Fetch `/manifest`, reusing the in-process copy while it is fresh.
 *
 * @param input - Source URL, optional fetch, optional clock.
 * @returns The manifest and the caching metadata its response carried.
 * @throws {Error} When the backend responds with a non-2xx status.
 */
export const fetchCachedManifest = async function fetchCachedManifest(input: {
	sourceURL: string;
	fetch?: ManifestFetch;
	now?: number;
}): Promise<CachedManifestResponse> {
	const fetchImpl = input.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error('@c15t/astro: no fetch available for /manifest.');
	}

	const { sourceURL } = input;
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
			`@c15t/astro: /manifest responded ${response.status} ${response.statusText}`
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

/** Drop every cached manifest. Used by tests and by config reloads. */
export const clearManifestCache = function clearManifestCache(): void {
	manifestCache.clear();
};
