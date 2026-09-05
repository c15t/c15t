/**
 * In-process consent-manifest cache for server adapters.
 *
 * Framework server routes (Nuxt, TanStack Start, ...) that proxy the backend's
 * `GET /manifest` and resolve `GET /init` locally share this module so the
 * caching rules live in one place: honour the backend's `s-maxage`, revalidate
 * with `ETag`, respect `no-store`, and collapse bursts for backends that send
 * no shared-cache TTL at all.
 *
 * Like `@c15t/core/transports/manifest`, this module resolves init with
 * `@c15t/schema` and imports every translation language. Import it from
 * `@c15t/core/transports/manifest-cache` in server code only.
 */

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
import { baseTranslations } from '@c15t/translations/all';

import { c15tVersionHeaders } from './version-header';

/**
 * Just the call signature the manifest cache needs.
 *
 * Deliberately narrower than `typeof globalThis.fetch`, which carries static
 * members (`fetch.preconnect` under recent `@types/node`) that no sensible
 * custom implementation provides — Nitro's `localFetch` included.
 */
export type ManifestFetch = (
	input: string | URL | Request,
	init?: RequestInit
) => Promise<Response>;

/** A manifest response held by the in-process cache. */
export interface CachedManifestResponse {
	/** The parsed manifest body. */
	manifest: ConsentManifest;
	/** Upstream response headers, keys lower-cased. */
	headers: Record<string, string>;
	/** The backend's `s-maxage`, in seconds, or `0` when it sent none. */
	sMaxAge: number;
	/** Epoch milliseconds after which the entry must be revalidated. */
	expiresAt: number;
	/** Epoch milliseconds when the upstream response was received. */
	fetchedAt: number;
	/** The upstream `Age` at receipt, in seconds, so TTLs do not restart. */
	upstreamAge: number;
}

/**
 * Current age of a cached manifest in seconds: the upstream `Age` plus the
 * time it has spent in this cache. Forward it as `Age` so a downstream CDN
 * counts the remaining lifetime instead of restarting the TTL.
 *
 * @param entry - A cached manifest response.
 * @param now - Current time in epoch milliseconds. Defaults to `Date.now()`.
 * @returns The age in whole seconds.
 */
export const getManifestAge = function getManifestAge(
	entry: Pick<CachedManifestResponse, 'fetchedAt' | 'upstreamAge'>,
	now: number = Date.now()
): number {
	return (
		entry.upstreamAge + Math.max(0, Math.floor((now - entry.fetchedAt) / 1000))
	);
};

/**
 * Storage behind {@link fetchCachedManifest}, keyed by the full request URL.
 * A `Map<string, CachedManifestResponse>` satisfies it; hosts that want
 * per-request or per-tenant isolation can supply their own.
 */
export interface ManifestCache {
	get: (sourceURL: string) => CachedManifestResponse | undefined;
	set: (sourceURL: string, entry: CachedManifestResponse) => unknown;
	delete: (sourceURL: string) => unknown;
	clear: () => void;
}

/** Options for {@link createManifestCache}. */
export interface ManifestCacheOptions {
	/**
	 * Most entries the cache holds at once. Keys include the query string
	 * and any credential partition, so a visitor can mint new keys with
	 * public input such as `?language=`; the cap keeps that bounded.
	 *
	 * @default 128
	 */
	maxEntries?: number;
}

const DEFAULT_MAX_ENTRIES = 128;

/**
 * Creates an empty, bounded manifest cache. Reads refresh an entry's
 * recency; when a write would exceed `maxEntries`, expired entries go
 * first, then the least recently used.
 *
 * @param options - Size bound.
 * @returns A cache instance for {@link fetchCachedManifest}.
 */
export const createManifestCache = function createManifestCache(
	options: ManifestCacheOptions = {}
): ManifestCache {
	const maxEntries = Math.max(1, options.maxEntries ?? DEFAULT_MAX_ENTRIES);
	const entries = new Map<string, CachedManifestResponse>();

	const makeRoom = function makeRoom(): void {
		if (entries.size < maxEntries) {
			return;
		}
		const now = Date.now();
		for (const [key, entry] of entries) {
			if (entry.expiresAt <= now) {
				entries.delete(key);
			}
		}
		while (entries.size >= maxEntries) {
			const oldest = entries.keys().next();
			if (oldest.done) {
				break;
			}
			entries.delete(oldest.value);
		}
	};

	return {
		clear: () => entries.clear(),
		delete: (key) => entries.delete(key),
		get: (key) => {
			const entry = entries.get(key);
			if (entry) {
				// Re-insert so Map iteration order doubles as recency.
				entries.delete(key);
				entries.set(key, entry);
			}
			return entry;
		},
		set: (key, entry) => {
			if (entries.has(key)) {
				entries.delete(key);
			} else {
				makeRoom();
			}
			entries.set(key, entry);
		},
	};
};

/** Cache used when {@link fetchCachedManifest} is called without one. */
const defaultManifestCache = createManifestCache();

/** In-flight upstream requests, so concurrent misses share one fetch. */
const inflightByCache = new WeakMap<
	ManifestCache,
	Map<string, Promise<CachedManifestResponse>>
>();

const getInflight = function getInflight(
	cache: ManifestCache
): Map<string, Promise<CachedManifestResponse>> {
	let inflight = inflightByCache.get(cache);
	if (!inflight) {
		inflight = new Map();
		inflightByCache.set(cache, inflight);
	}
	return inflight;
};

/**
 * Generation counters so a fill that started before `clearManifestCache`
 * cannot write the discarded value back once it completes.
 */
const generationByCache = new WeakMap<ManifestCache, number>();

const getGeneration = function getGeneration(cache: ManifestCache): number {
	return generationByCache.get(cache) ?? 0;
};

/**
 * Empties a manifest cache, including fills still in flight: pending
 * callers keep their promise, but its result is not stored and later
 * callers start a fresh fetch.
 *
 * @param cache - The cache to clear. Defaults to the module-level cache.
 */
export const clearManifestCache = function clearManifestCache(
	cache: ManifestCache = defaultManifestCache
): void {
	cache.clear();
	inflightByCache.get(cache)?.clear();
	generationByCache.set(cache, getGeneration(cache) + 1);
};

/**
 * Response headers a proxying manifest route forwards downstream verbatim.
 *
 * `vary` is deliberately NOT forwarded. The route sends no request headers
 * upstream and returns no CORS headers downstream, so its body is a pure
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
 * without a shared-cache TTL. Without it every request to an older backend
 * would hit the network. Kept deliberately short: it only collapses
 * concurrent/bursty requests and is never advertised downstream as a
 * `Cache-Control` value.
 */
export const MANIFEST_DEDUPE_TTL_SECONDS = 5;

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

/**
 * Reads the `s-maxage` directive from a `Cache-Control` header.
 *
 * @param cacheControl - The header value, if any.
 * @returns The directive in seconds, or `0` when absent or invalid.
 */
export const getManifestSMaxAge = function getManifestSMaxAge(
	cacheControl: string | undefined
): number {
	return parseCacheDirectiveSeconds(cacheControl, 's-maxage') ?? 0;
};

/**
 * Reads the `stale-while-revalidate` directive from a `Cache-Control` header.
 *
 * @param cacheControl - The header value, if any.
 * @returns The directive in seconds, or `0` when absent or invalid.
 */
export const getManifestStaleWhileRevalidate =
	function getManifestStaleWhileRevalidate(
		cacheControl: string | undefined
	): number {
		return (
			parseCacheDirectiveSeconds(cacheControl, 'stale-while-revalidate') ?? 0
		);
	};

/** Reads the upstream `Age` header in seconds, `0` when absent or invalid. */
const readUpstreamAge = function readUpstreamAge(
	headers: Record<string, string>
): number {
	const parsed = Number.parseInt(headers.age ?? '', 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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

/** `true` when the backend sent an `s-maxage` directive, including `0`. */
const hasSharedMaxAge = function hasSharedMaxAge(
	cacheControl: string | undefined
): boolean {
	return parseCacheDirectiveSeconds(cacheControl, 's-maxage') !== undefined;
};

/**
 * How long to keep an entry in the in-process cache. `no-store`, `no-cache`,
 * and `private` win over everything else, including a positive `s-maxage`,
 * so a response the backend marked non-reusable never enters the shared
 * cache. Otherwise an explicit `s-maxage` is used as-is (`0` means
 * revalidate on every use) and a missing directive falls back to the floor.
 */
const resolveCacheTtlSeconds = function resolveCacheTtlSeconds(
	cacheControl: string | undefined,
	sMaxAge: number
): number {
	if (forbidsReuse(cacheControl)) {
		return 0;
	}
	if (hasSharedMaxAge(cacheControl)) {
		return sMaxAge;
	}
	return MANIFEST_DEDUPE_TTL_SECONDS;
};

/** Where a server adapter reads the manifest from. */
export interface ManifestSourceOptions {
	/** Backend URL; the manifest is read from `${backendURL}/manifest`. */
	backendURL?: string;
	/** Explicit manifest URL. Takes precedence over `backendURL`. */
	manifestURL?: string;
}

/**
 * Resolves the upstream manifest URL from adapter configuration.
 *
 * @param options - Backend or explicit manifest URL.
 * @returns The URL to fetch the manifest from.
 * @throws {Error} When neither `manifestURL` nor `backendURL` is set.
 */
export const resolveManifestSourceURL = function resolveManifestSourceURL(
	options: ManifestSourceOptions
): string {
	if (options.manifestURL) {
		return options.manifestURL;
	}
	if (!options.backendURL) {
		throw new Error(
			'c15t manifest cache: `backendURL` or `manifestURL` is required.'
		);
	}
	return `${trimSlash(options.backendURL)}/manifest`;
};

/**
 * Appends a request query string to the manifest source URL.
 *
 * @param input - The source URL and the raw query string to append.
 * @returns The full request URL.
 */
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
	/** Resolved upstream manifest URL (see {@link resolveManifestSourceURL}). */
	sourceURL: string;
	/** Fetch implementation. Defaults to `globalThis.fetch`. */
	fetch?: ManifestFetch;
	/** Raw query string forwarded to the upstream request. */
	query?: string;
	/** Current time in epoch milliseconds. Defaults to `Date.now()`. */
	now?: number;
	/** Cache to read and write. Defaults to the module-level cache. */
	cache?: ManifestCache;
	/**
	 * Extra headers for the upstream request, for example an authentication
	 * header a private manifest requires. Entries are partitioned by a digest
	 * of these headers, so callers with different credentials never share a
	 * cached manifest or an in-flight request, and the key holds no secret.
	 * Credentials (`cookie`, `authorization`) are refused over plain `http:`
	 * unless the host is a loopback address.
	 */
	headers?: Record<string, string>;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const CREDENTIAL_HEADERS = new Set([
	'authorization',
	'cookie',
	'proxy-authorization',
]);

const hasCredentialHeaders = function hasCredentialHeaders(
	headers: Record<string, string> | undefined
): boolean {
	if (!headers) {
		return false;
	}
	return Object.keys(headers).some((name) =>
		CREDENTIAL_HEADERS.has(name.toLowerCase())
	);
};

/** Refuses to send credentials in clear text to anything but loopback. */
const assertCredentialTransport = function assertCredentialTransport(
	requestURL: string,
	headers: Record<string, string> | undefined
): void {
	if (!hasCredentialHeaders(headers)) {
		return;
	}
	let url: URL;
	try {
		url = new URL(requestURL);
	} catch {
		return;
	}
	if (url.protocol === 'http:' && !LOOPBACK_HOSTS.has(url.hostname)) {
		throw new Error(
			`c15t manifest cache: refusing to send credentials over http to ${url.host}. Use https, or a loopback host for local development.`
		);
	}
};

const HASH_LANES = [31, 131, 16_777_619] as const;
const LANE_MODULUS = 4_294_967_296;

/** One 32-bit lane of a multiplicative string hash, no bitwise ops. */
const hashLane = function hashLane(value: string, multiplier: number): string {
	let hash = 2_166_136_261 % LANE_MODULUS;
	for (let index = 0; index < value.length; index += 1) {
		hash =
			(((hash * multiplier) % LANE_MODULUS) + value.charCodeAt(index)) %
			LANE_MODULUS;
	}
	return hash.toString(16).padStart(8, '0');
};

const digest = async function digest(value: string): Promise<string> {
	const subtle = globalThis.crypto?.subtle;
	if (subtle) {
		const bytes = await subtle.digest(
			'SHA-256',
			new TextEncoder().encode(value)
		);
		return Array.from(new Uint8Array(bytes), (byte) =>
			byte.toString(16).padStart(2, '0')
		).join('');
	}
	// Without WebCrypto (only very old runtimes): three independent 32-bit
	// lanes (96 bits) of a multiplicative string hash. Not cryptographic, but
	// free of the credential value, which is what a caller-supplied cache that
	// logs or persists keys must never see.
	return HASH_LANES.map((multiplier) => hashLane(value, multiplier)).join('');
};

/**
 * Cache key: the request URL alone, or the URL plus a digest of the
 * forwarded headers so different credentials never share an entry.
 */
const buildCacheKey = async function buildCacheKey(
	requestURL: string,
	headers: Record<string, string> | undefined
): Promise<string> {
	if (!headers || Object.keys(headers).length === 0) {
		return requestURL;
	}
	const scope = Object.entries(headers)
		.map(([name, value]) => `${name.toLowerCase()}=${value}`)
		.sort()
		.join('\n');
	return `${requestURL}#${await digest(scope)}`;
};

const revalidateManifest = async function revalidateManifest(input: {
	cache: ManifestCache;
	cacheKey: string;
	cached: CachedManifestResponse | undefined;
	fetchImpl: ManifestFetch;
	generation: number;
	headers: Record<string, string> | undefined;
	now: number;
	requestURL: string;
}): Promise<CachedManifestResponse> {
	const { cache, cacheKey, cached, fetchImpl, generation, now, requestURL } =
		input;
	// A clear during the fetch bumps the generation; then the result is
	// returned to the waiting callers but never stored.
	const store = function store(entry: CachedManifestResponse): void {
		if (getGeneration(cache) === generation) {
			cache.set(cacheKey, entry);
		}
	};
	const headers: Record<string, string> = {
		accept: 'application/json',
		...c15tVersionHeaders,
		...input.headers,
	};
	if (cached?.headers.etag) {
		headers['if-none-match'] = cached.headers.etag;
	}

	const response = await fetchImpl(requestURL, {
		headers,
		method: 'GET',
	});

	if (response.status === 304 && cached) {
		// A 304 sets a new freshness baseline: only an Age the validation
		// response itself carries counts, never the one the stale entry had.
		const { age: _staleAge, ...retainedHeaders } = cached.headers;
		const responseHeaders = {
			...retainedHeaders,
			...normalizeHeaders(response.headers),
		};
		const sMaxAge = getManifestSMaxAge(responseHeaders['cache-control']);
		const ttl = resolveCacheTtlSeconds(
			responseHeaders['cache-control'],
			sMaxAge
		);
		const upstreamAge = readUpstreamAge(responseHeaders);
		const refreshed: CachedManifestResponse = {
			...cached,
			expiresAt: now + Math.max(0, ttl - upstreamAge) * 1000,
			fetchedAt: now,
			headers: responseHeaders,
			sMaxAge,
			upstreamAge,
		};
		if (ttl > upstreamAge) {
			store(refreshed);
		} else if (getGeneration(cache) === generation) {
			cache.delete(cacheKey);
		}
		return refreshed;
	}

	if (!response.ok) {
		throw new Error(
			`c15t manifest cache: backend /manifest responded ${response.status} ${response.statusText}`
		);
	}

	const manifest = (await response.json()) as ConsentManifest;
	const responseHeaders = normalizeHeaders(response.headers);
	const sMaxAge = getManifestSMaxAge(responseHeaders['cache-control']);
	const ttl = resolveCacheTtlSeconds(responseHeaders['cache-control'], sMaxAge);
	// A source behind its own CDN reports how long the object has already
	// lived; the remaining lifetime is what this cache may grant.
	const upstreamAge = readUpstreamAge(responseHeaders);
	const entry: CachedManifestResponse = {
		expiresAt: now + Math.max(0, ttl - upstreamAge) * 1000,
		fetchedAt: now,
		headers: responseHeaders,
		manifest,
		sMaxAge,
		upstreamAge,
	};
	if (ttl > upstreamAge) {
		store(entry);
	}
	return entry;
};

/**
 * Fetches the manifest through the in-process cache.
 *
 * Serves a fresh entry without a network round-trip, revalidates a stale
 * entry with `If-None-Match` and refreshes its TTL on `304`, and otherwise
 * fetches and caches the response according to its `Cache-Control`.
 * Concurrent misses for the same URL share one upstream request, so a cold
 * start or an expiry under load reaches the backend once.
 *
 * @param options - Source URL, fetch, query, clock, and cache overrides.
 * @returns The cached or freshly fetched manifest with its upstream headers.
 * @throws {Error} When no fetch implementation is available or the backend responds
 * with a non-2xx status.
 */
export const fetchCachedManifest = async function fetchCachedManifest(
	options: FetchCachedManifestOptions
): Promise<CachedManifestResponse> {
	const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error('c15t manifest cache: a fetch implementation is required.');
	}

	const cache = options.cache ?? defaultManifestCache;
	const requestURL = createManifestRequestURL({
		query: options.query,
		sourceURL: options.sourceURL,
	});
	assertCredentialTransport(requestURL, options.headers);
	// Read before the first await so a clear that lands while the key is
	// being digested still invalidates this fill.
	const generation = getGeneration(cache);
	const cacheKey = await buildCacheKey(requestURL, options.headers);
	if (getGeneration(cache) !== generation) {
		// A clear landed while the key was being digested: start over so this
		// fill can neither reuse nor register anything from before the clear.
		return fetchCachedManifest(options);
	}
	const now = options.now ?? Date.now();
	const cached = cache.get(cacheKey);
	if (cached && cached.expiresAt > now) {
		return cached;
	}

	const inflight = getInflight(cache);
	const pending = inflight.get(cacheKey);
	if (pending) {
		return pending;
	}
	const request = (async () => {
		try {
			return await revalidateManifest({
				cache,
				cacheKey,
				cached,
				fetchImpl,
				generation,
				headers: options.headers,
				now,
				requestURL,
			});
		} finally {
			// After a clear the map holds newer fills; leave those alone.
			if (getGeneration(cache) === generation) {
				inflight.delete(cacheKey);
			}
		}
	})();
	inflight.set(cacheKey, request);
	return request;
};

/** Request headers accepted by {@link resolveManifestInit}. */
export type ManifestRequestHeaders =
	| Headers
	| Record<string, string | string[] | undefined>;

const normalizeHeader = function normalizeHeader(
	value: string | string[] | undefined
): string | undefined {
	if (!value) {
		return undefined;
	}
	return Array.isArray(value) ? value[0] : value;
};

/**
 * Derives manifest resolver inputs (geo, language, GPC) from request headers.
 *
 * @param headers - A `Headers` instance or a header record (any key casing).
 * @returns Inputs for `resolveInitFromManifest`; language falls back to `en`.
 */
export const getResolverInputsFromHeaders =
	function getResolverInputsFromHeaders(
		headers: ManifestRequestHeaders
	): ResolveInitFromManifestInputs {
		let source: Headers | Record<string, string | undefined>;
		if (headers instanceof Headers) {
			source = headers;
		} else {
			const normalized: Record<string, string | undefined> = {};
			for (const [key, value] of Object.entries(headers)) {
				normalized[key.toLowerCase()] = normalizeHeader(value);
			}
			source = normalized;
		}
		const inputs = extractConsentRequestInputs(source);

		return {
			country: inputs.country,
			gpc: inputs.gpc,
			language: inputs.language ?? 'en',
			region: inputs.region,
		};
	};

/** Input for {@link resolveManifestInit}. */
export type ResolveManifestInitOptions =
	| {
			/** The manifest to resolve against. */
			manifest: ConsentManifest;
			/** Request headers the resolver inputs are derived from. */
			headers: ManifestRequestHeaders;
			inputs?: never;
	  }
	| {
			/** The manifest to resolve against. */
			manifest: ConsentManifest;
			/** Explicit resolver inputs, used as-is. */
			inputs: ResolveInitFromManifestInputs;
			headers?: never;
	  };

/**
 * Resolves a `GET /init` response locally from a manifest.
 *
 * Mirrors what the backend's `/init` returns, minus a `policySnapshotToken`:
 * pair it with `hosted({ assertDecisionInputs: true })` on the client so saves
 * stay bound to the decision they were made against.
 *
 * @param options - The manifest plus either request headers or explicit inputs.
 * @returns The resolved init output including `resolvedOverrides`.
 */
export const resolveManifestInit = function resolveManifestInit(
	options: ResolveManifestInitOptions
): InitOutput {
	const inputs =
		options.inputs ?? getResolverInputsFromHeaders(options.headers);
	return {
		...resolveInitFromManifest(options.manifest, inputs, { baseTranslations }),
		// Resolver inputs use `null` for absent; the overrides record wants
		// the fields dropped instead.
		resolvedOverrides: consentInputsToOverrides({
			country: inputs.country ?? undefined,
			gpc: inputs.gpc,
			language: inputs.language ?? undefined,
			region: inputs.region ?? undefined,
		}),
	} as InitOutput;
};
