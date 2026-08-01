import type {
	ConsentManifest,
	InitOutput,
	ResolveInitFromManifestInputs,
} from '@c15t/schema/types';
import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import { c15tVersionHeaders } from 'c15t/v3';
import type { ConsentConfig } from '../config';
import { DEFAULT_MANIFEST_ROUTE, DEFAULT_NUXT_INIT_ROUTE } from '../manifest';

export interface ManifestModeRuntimeConfig
	extends Pick<
		ConsentConfig,
		'backendURL' | 'manifestURL' | 'initRoute' | 'manifestRoute'
	> {}

/**
 * Just the call signature the manifest routes need.
 *
 * Deliberately narrower than `typeof globalThis.fetch`, which carries static
 * members (`fetch.preconnect` under recent `@types/node`) that no sensible
 * custom implementation provides — nitro's `localFetch` included.
 */
export type ManifestFetch = (
	input: string | URL | Request,
	init?: RequestInit
) => Promise<Response>;

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

function trimSlash(value: string): string {
	return value.endsWith('/') ? value.slice(0, -1) : value;
}

function normalizeHeader(value: string | string[] | undefined): string | null {
	if (!value) return null;
	return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeHeaders(headers: Headers): Record<string, string> {
	const normalized: Record<string, string> = {};
	headers.forEach((value, key) => {
		normalized[key.toLowerCase()] = value;
	});
	return normalized;
}

function parseCacheDirectiveSeconds(
	cacheControl: string | undefined,
	directive: string
): number | undefined {
	if (!cacheControl) return undefined;
	for (const part of cacheControl.split(',')) {
		const [rawKey, rawValue] = part.trim().split('=');
		if (rawKey?.toLowerCase() !== directive) continue;
		const seconds = Number(rawValue);
		return Number.isFinite(seconds) && seconds >= 0
			? Math.floor(seconds)
			: undefined;
	}
	return undefined;
}

export function getManifestSMaxAge(cacheControl: string | undefined): number {
	return parseCacheDirectiveSeconds(cacheControl, 's-maxage') ?? 0;
}

export function getManifestStaleWhileRevalidate(
	cacheControl: string | undefined
): number {
	return (
		parseCacheDirectiveSeconds(cacheControl, 'stale-while-revalidate') ?? 0
	);
}

/**
 * In-process dedupe floor, in seconds, for backends that serve `/manifest`
 * without a shared-cache TTL. `manifest.get.ts` deliberately does not wrap the
 * route in `defineCachedEventHandler` (it stamped its own `max-age` over the
 * backend's header and defeated edge caching), so without this floor every
 * request to an older backend would hit the network. Kept deliberately short:
 * it only collapses concurrent/bursty requests, it is never advertised
 * downstream as a `Cache-Control` value.
 */
export const MANIFEST_DEDUPE_TTL_SECONDS = 5;

/** `true` when the backend explicitly forbids reusing the response. */
function forbidsReuse(cacheControl: string | undefined): boolean {
	if (!cacheControl) return false;
	return cacheControl
		.split(',')
		.some((part) =>
			['no-store', 'no-cache', 'private'].includes(
				part.trim().split('=')[0]?.toLowerCase() ?? ''
			)
		);
}

/**
 * How long to keep an entry in the in-process cache. Prefers the backend's
 * `s-maxage`, falls back to the dedupe floor, and honours an explicit
 * `no-store`/`no-cache`/`private` by not caching at all.
 */
function resolveCacheTtlSeconds(
	cacheControl: string | undefined,
	sMaxAge: number
): number {
	if (sMaxAge > 0) return sMaxAge;
	return forbidsReuse(cacheControl) ? 0 : MANIFEST_DEDUPE_TTL_SECONDS;
}

export function resolveManifestSourceURL(
	config: ManifestModeRuntimeConfig
): string {
	if (config.manifestURL) {
		return config.manifestURL;
	}
	if (!config.backendURL) {
		throw new Error(
			'@c15t/vue manifest mode requires `backendURL` or `manifestURL`.'
		);
	}
	return `${trimSlash(config.backendURL)}/manifest`;
}

export function resolveNuxtInitRoute(
	config: Pick<ConsentConfig, 'initRoute'>
): string {
	return config.initRoute ?? DEFAULT_NUXT_INIT_ROUTE;
}

export function resolveNuxtManifestRoute(
	config: Pick<ConsentConfig, 'manifestRoute'>
): string {
	return config.manifestRoute ?? DEFAULT_MANIFEST_ROUTE;
}

export function createManifestRequestURL(input: {
	sourceURL: string;
	query?: string;
}): string {
	if (!input.query) return input.sourceURL;
	const separator = input.sourceURL.includes('?') ? '&' : '?';
	return `${input.sourceURL}${separator}${input.query}`;
}

export async function fetchCachedManifest(input: {
	config: ManifestModeRuntimeConfig;
	fetch?: ManifestFetch;
	query?: string;
	now?: number;
}): Promise<CachedManifestResponse> {
	const fetchImpl = input.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error(
			'@c15t/vue manifest route requires a fetch implementation.'
		);
	}

	const sourceURL = createManifestRequestURL({
		sourceURL: resolveManifestSourceURL(input.config),
		query: input.query,
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

	const response = await fetchImpl(sourceURL, {
		method: 'GET',
		headers,
	});

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
		const refreshed = {
			...cached,
			headers: responseHeaders,
			sMaxAge,
			expiresAt: now + ttl * 1000,
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
			`@c15t/vue manifest route: backend /manifest responded ${response.status} ${response.statusText}`
		);
	}

	const manifest = (await response.json()) as ConsentManifest;
	const responseHeaders = normalizeHeaders(response.headers);
	const sMaxAge = getManifestSMaxAge(responseHeaders['cache-control']);
	const ttl = resolveCacheTtlSeconds(responseHeaders['cache-control'], sMaxAge);
	const entry: CacheEntry = {
		sourceURL,
		manifest,
		headers: responseHeaders,
		sMaxAge,
		expiresAt: now + ttl * 1000,
	};
	if (ttl > 0) {
		manifestCache.set(sourceURL, entry);
	}
	return entry;
}

export function clearManifestRouteCache(): void {
	manifestCache.clear();
}

export function getResolverInputsFromHeaders(
	headers: Record<string, string | string[] | undefined>
): ResolveInitFromManifestInputs {
	const normalized: Record<string, string | undefined> = {};
	for (const [key, value] of Object.entries(headers)) {
		normalized[key.toLowerCase()] = normalizeHeader(value) ?? undefined;
	}
	const inputs = extractConsentRequestInputs(normalized);

	return {
		country: inputs.country,
		region: inputs.region,
		language: inputs.language ?? 'en',
		gpc: inputs.gpc,
	};
}

export function resolveManifestInit(input: {
	manifest: ConsentManifest;
	headers: Record<string, string | string[] | undefined>;
}): InitOutput {
	const inputs = getResolverInputsFromHeaders(input.headers);
	return {
		...resolveInitFromManifest(input.manifest, inputs),
		// Resolver inputs use `null` for absent; the overrides record wants
		// the fields dropped instead.
		resolvedOverrides: consentInputsToOverrides({
			country: inputs.country ?? undefined,
			region: inputs.region ?? undefined,
			language: inputs.language ?? undefined,
			gpc: inputs.gpc,
		}),
	} as InitOutput;
}
