/** Shared manifest HTTP cache. Does not load translations or resolve policy. */
import type { ConsentManifest } from '@c15t/schema/types';
import { CONSENT_REQUEST_HEADER_NAMES } from '@c15t/schema/types';

import { c15tProtocolHeaders } from '../transports/version-header';

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
	/**
	 * Epoch milliseconds after which the entry is stale. A stale entry is
	 * still served until {@link staleUntil} while one background
	 * revalidation runs; past that it blocks on the upstream again.
	 */
	expiresAt: number;
	/**
	 * Epoch milliseconds until which a stale entry may still be served:
	 * `expiresAt` plus the backend's `stale-while-revalidate`. Equal to
	 * `expiresAt` when the backend sent no such directive.
	 */
	staleUntil: number;
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
 * recency; when a write would exceed `maxEntries`, entries past their
 * stale window go first, then the least recently used. A stale entry that
 * can still be served therefore competes on recency like a fresh one, so
 * a manifest read on every request stays put while keys minted once (a
 * `?language=` a visitor made up) age out.
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
			if (entry.staleUntil <= now) {
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

/** An upstream request shared by every caller waiting on the same key. */
interface InflightFill {
	promise: Promise<CachedManifestResponse>;
	/** Wall-clock epoch milliseconds when the upstream request started. */
	startedAt: number;
}

/** In-flight upstream requests, so concurrent misses share one fetch. */
const inflightByCache = new WeakMap<ManifestCache, Map<string, InflightFill>>();

const getInflight = function getInflight(
	cache: ManifestCache
): Map<string, InflightFill> {
	let inflight = inflightByCache.get(cache);
	if (!inflight) {
		inflight = new Map();
		inflightByCache.set(cache, inflight);
	}
	return inflight;
};

/**
 * Most revalidation floors held per cache. A floor exists only while a key
 * is being served stale after a failed or already-stale refresh, so a
 * handful is the norm; the cap is a hard bound against visitor-minted keys,
 * not a working-set size. It is twice the default cache cap so every live
 * key in a default cache keeps its floor through an outage, with room for
 * churn; a larger caller-supplied cache can lose a floor early, which costs
 * one extra revalidation attempt for that key. Insertion order doubles as
 * age, so the oldest record goes first when the cap is reached.
 */
const MAX_REVALIDATION_FLOORS = DEFAULT_MAX_ENTRIES * 2;

/**
 * Earliest time a stale entry may be revalidated again, per cache key, so a
 * source that keeps answering stale (a CDN whose origin is down) or keeps
 * failing is asked at most once per {@link MANIFEST_DEDUPE_TTL_SECONDS}
 * while the entry is served. Keyed by cache key rather than entry identity
 * because a caller-supplied {@link ManifestCache} may return a fresh object
 * on every read. A record is dropped whenever a fresh entry is stored for
 * its key, when the key is deleted or read after eviction, and when the
 * map reaches {@link MAX_REVALIDATION_FLOORS}; lapsed records are inert
 * either way. Evicting a live record early only costs one extra
 * revalidation attempt for that key.
 */
const revalidateAfterByCache = new WeakMap<
	ManifestCache,
	Map<string, number>
>();

/**
 * Snapshot of the revalidation floors a cache currently holds, keyed by
 * cache key. Lapsed records are inert, so no public behaviour exposes the
 * map's size or contents; tests read this instead.
 *
 * @internal
 */
export const readRevalidationFloors = function readRevalidationFloors(
	cache: ManifestCache
): ReadonlyMap<string, number> {
	const floors = revalidateAfterByCache.get(cache);
	return floors ? new Map(floors) : new Map();
};

const getRevalidateAfter = function getRevalidateAfter(
	cache: ManifestCache
): Map<string, number> {
	let revalidateAfter = revalidateAfterByCache.get(cache);
	if (!revalidateAfter) {
		revalidateAfter = new Map();
		revalidateAfterByCache.set(cache, revalidateAfter);
	}
	return revalidateAfter;
};

const setRevalidationFloor = function setRevalidationFloor(
	cache: ManifestCache,
	cacheKey: string,
	deadline: number
): void {
	const revalidateAfter = getRevalidateAfter(cache);
	revalidateAfter.delete(cacheKey);
	while (revalidateAfter.size >= MAX_REVALIDATION_FLOORS) {
		const oldest = revalidateAfter.keys().next();
		if (oldest.done) {
			break;
		}
		revalidateAfter.delete(oldest.value);
	}
	revalidateAfter.set(cacheKey, deadline);
};

/**
 * Shortest wait, in milliseconds, before a key whose last upstream fill
 * failed with nothing servable in the cache is asked again. Each further
 * consecutive failure doubles it, up to {@link MANIFEST_FAILURE_RETRY_MAX_MS}.
 */
export const MANIFEST_FAILURE_RETRY_MIN_MS = 1000;

/**
 * Longest wait, in milliseconds, between upstream attempts for a key that
 * keeps failing with nothing servable in the cache. Matches the floor for a
 * stale entry whose refresh failed ({@link MANIFEST_DEDUPE_TTL_SECONDS}), so
 * a recovered backend is noticed within five seconds either way.
 */
export const MANIFEST_FAILURE_RETRY_MAX_MS = 5000;

/**
 * How long one upstream manifest request may take before the cache aborts it
 * and records a failure. Callers that must answer sooner pass `timeoutMs`;
 * the upstream request keeps running for them in the background.
 */
export const MANIFEST_FETCH_TIMEOUT_MS = 5000;

/**
 * Why {@link fetchCachedManifest} gave up without a manifest.
 *
 * - `timeout`: the caller's `timeoutMs` ran out before the upstream answered.
 *   The upstream request keeps running and fills the cache for later callers.
 * - `backoff`: the last upstream attempt for this key failed and the retry
 *   floor has not passed, so no request was made. `cause` holds that failure.
 */
export type ManifestUnavailableReason = 'backoff' | 'timeout';

/**
 * Thrown by {@link fetchCachedManifest} when it answers without a manifest
 * and without asking the upstream: the caller's time budget ran out, or the
 * key is inside its retry floor after a failure. Callers should render
 * without a resolved policy (optional categories denied, consent UI hidden)
 * and let the browser resolve it.
 */
export class ManifestUnavailableError extends Error {
	/** Why no manifest was returned. */
	readonly reason: ManifestUnavailableReason;
	/**
	 * Milliseconds until the cache will ask the upstream again, for
	 * `backoff`. Suitable for a `Retry-After` header once rounded up.
	 */
	readonly retryAfterMs: number | undefined;

	constructor(
		reason: ManifestUnavailableReason,
		message: string,
		options: { cause?: unknown; retryAfterMs?: number } = {}
	) {
		super(message, { cause: options.cause });
		this.name = 'ManifestUnavailableError';
		this.reason = reason;
		this.retryAfterMs = options.retryAfterMs;
	}
}

/** The last failed fill for a key with nothing servable in the cache. */
interface FillFailure {
	/** The failure, rethrown as `cause` while the floor holds. */
	error: unknown;
	/** Consecutive failures, which set the backoff. */
	failures: number;
	/** Epoch milliseconds before which the upstream is not asked again. */
	retryAt: number;
}

/**
 * Failed fills per cache key, so a backend that is down is asked once per
 * retry floor instead of once per request. Bounded like the revalidation
 * floors: the oldest record goes first, which only costs that key one early
 * retry. A success for the key, a delete, and a clear drop the record.
 */
const failuresByCache = new WeakMap<ManifestCache, Map<string, FillFailure>>();

const getFailures = function getFailures(
	cache: ManifestCache
): Map<string, FillFailure> {
	let failures = failuresByCache.get(cache);
	if (!failures) {
		failures = new Map();
		failuresByCache.set(cache, failures);
	}
	return failures;
};

const recordFillFailure = function recordFillFailure(
	cache: ManifestCache,
	cacheKey: string,
	error: unknown,
	settledAt: number
): void {
	const failures = getFailures(cache);
	const previous = failures.get(cacheKey);
	const count = (previous?.failures ?? 0) + 1;
	const floor = Math.min(
		MANIFEST_FAILURE_RETRY_MIN_MS * 2 ** (count - 1),
		MANIFEST_FAILURE_RETRY_MAX_MS
	);
	failures.delete(cacheKey);
	while (failures.size >= MAX_REVALIDATION_FLOORS) {
		const oldest = failures.keys().next();
		if (oldest.done) {
			break;
		}
		failures.delete(oldest.value);
	}
	failures.set(cacheKey, {
		error,
		failures: count,
		retryAt: settledAt + floor,
	});
};

/**
 * Snapshot of the failure records a cache holds, keyed by cache key: the
 * consecutive failure count and when the upstream may be asked again.
 *
 * @internal
 */
export const readFillFailures = function readFillFailures(
	cache: ManifestCache
): ReadonlyMap<string, { failures: number; retryAt: number }> {
	const failures = failuresByCache.get(cache);
	return new Map(
		[...(failures ?? [])].map(([key, record]) => [
			key,
			{ failures: record.failures, retryAt: record.retryAt },
		])
	);
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
	revalidateAfterByCache.get(cache)?.clear();
	failuresByCache.get(cache)?.clear();
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
		const value = rawValue?.trim();
		if (!value || !/^\d+$/u.test(value)) {
			return undefined;
		}
		const seconds = Number(value);
		return Number.isSafeInteger(seconds) ? seconds : undefined;
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
	cacheControl: string | null | undefined
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
export const resolveManifestCacheTtlSeconds =
	function resolveManifestCacheTtlSeconds(
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

/**
 * Fresh and stale deadlines for a response received at `now`. The upstream
 * `Age` is charged against both windows so a copy a CDN has already held
 * for a while, or is already serving stale, does not get a restarted TTL.
 */
const resolveEntryLifetime = function resolveEntryLifetime(input: {
	cacheControl: string | undefined;
	now: number;
	sMaxAge: number;
	upstreamAge: number;
}): { expiresAt: number; staleUntil: number; ttl: number } {
	const ttl = resolveManifestCacheTtlSeconds(input.cacheControl, input.sMaxAge);
	// The stale window only applies to a response that opted into shared
	// caching with an explicit `s-maxage` (`0` included: stale on arrival, not
	// unreusable). Without it the TTL is the dedupe floor, which is not a
	// freshness lifetime to extend; and `no-store`, `no-cache`, and `private`
	// switch the window off outright.
	const staleWhileRevalidate =
		!forbidsReuse(input.cacheControl) && hasSharedMaxAge(input.cacheControl)
			? getManifestStaleWhileRevalidate(input.cacheControl)
			: 0;
	const expiresAt = input.now + Math.max(0, ttl - input.upstreamAge) * 1000;
	const staleUntil =
		input.now +
		Math.max(0, ttl + staleWhileRevalidate - input.upstreamAge) * 1000;
	return { expiresAt, staleUntil, ttl };
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
	 * unless the host is a loopback address. Requests with identity headers
	 * reject redirects so credentials cannot reach an unvalidated target.
	 */
	headers?: Record<string, string>;
	/**
	 * Framework fetch options. Without a signal, the upstream request is
	 * aborted after {@link MANIFEST_FETCH_TIMEOUT_MS}.
	 */
	init?: Omit<RequestInit, 'headers' | 'method'>;
	/**
	 * Longest this call waits for the upstream, in milliseconds, when nothing
	 * servable is cached. Counted from the start of the upstream request, so a
	 * call that joins a request already in flight only gets what is left of
	 * it. When it runs out the call rejects with a
	 * {@link ManifestUnavailableError} (`reason: 'timeout'`), and the upstream
	 * request keeps running to fill the cache for later callers; its promise
	 * goes to `onBackgroundRevalidate`. Fresh and stale-while-revalidate reads
	 * answer from memory and never wait. Omit to wait for the upstream request
	 * itself.
	 */
	timeoutMs?: number;
	/**
	 * Called with the promise of upstream work that outlives this call: a
	 * background revalidation of a stale entry, or a fill this call stopped
	 * waiting for when `timeoutMs` ran out. A host passes it to the platform
	 * so the work survives the response on runtimes that cancel detached async
	 * work once a response is sent (Vercel `waitUntil`, Next.js `after`,
	 * Cloudflare `ctx.waitUntil`). The promise never rejects. Not called when
	 * the read is served fresh or waits for the upstream to finish.
	 */
	onBackgroundRevalidate?: (revalidation: Promise<void>) => void;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const CREDENTIAL_HEADERS = new Set([
	'authorization',
	'cookie',
	'proxy-authorization',
]);

/**
 * Request headers that carry no visitor identity: the browser negotiation
 * headers, the consent resolver inputs, and this client's version headers.
 * Anything else a host forwards (an API key, a tenant selector) is treated
 * as a credential for transport purposes.
 */
const PUBLIC_MANIFEST_HEADERS = new Set([
	'accept',
	'accept-language',
	'content-type',
	'if-none-match',
	'origin',
	'referer',
	'sec-gpc',
	'user-agent',
	...CONSENT_REQUEST_HEADER_NAMES,
	...Object.keys(c15tProtocolHeaders),
]);

const findIdentityHeader = function findIdentityHeader(
	headers: Record<string, string> | undefined
): string | undefined {
	if (!headers) {
		return undefined;
	}
	return Object.keys(headers).find((name) => {
		const lower = name.toLowerCase();
		return CREDENTIAL_HEADERS.has(lower) || !PUBLIC_MANIFEST_HEADERS.has(lower);
	});
};

/** Refuses to send credentials in clear text to anything but loopback. */
const assertCredentialTransport = function assertCredentialTransport(
	requestURL: string,
	headers: Record<string, string> | undefined
): void {
	const identityHeader = findIdentityHeader(headers);
	if (!identityHeader) {
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
			`c15t manifest cache: refusing to send credentials over http to ${url.host} (${identityHeader}). Use https, or a loopback host for local development.`
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
	init: FetchCachedManifestOptions['init'];
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
			if (entry.expiresAt > now) {
				// A fresh entry sets its own schedule: the next revalidation is
				// due when it expires, however this fill was started.
				revalidateAfterByCache.get(cache)?.delete(cacheKey);
			}
		}
	};
	const headers: Record<string, string> = {
		accept: 'application/json',
		...c15tProtocolHeaders,
		...input.headers,
	};
	if (cached?.headers.etag) {
		headers['if-none-match'] = cached.headers.etag;
	}

	const response = await fetchImpl(requestURL, {
		...input.init,
		headers,
		method: 'GET',
		redirect: findIdentityHeader(input.headers)
			? 'error'
			: input.init?.redirect,
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
		const upstreamAge = readUpstreamAge(responseHeaders);
		const { expiresAt, staleUntil } = resolveEntryLifetime({
			cacheControl: responseHeaders['cache-control'],
			now,
			sMaxAge,
			upstreamAge,
		});
		const refreshed: CachedManifestResponse = {
			...cached,
			expiresAt,
			fetchedAt: now,
			headers: responseHeaders,
			sMaxAge,
			staleUntil,
			upstreamAge,
		};
		if (staleUntil > now) {
			store(refreshed);
		} else if (getGeneration(cache) === generation) {
			cache.delete(cacheKey);
			revalidateAfterByCache.get(cache)?.delete(cacheKey);
		}
		return refreshed;
	}

	if (!response.ok) {
		// `status` lets a host tell a backend without `/manifest` (404) from
		// one that is failing, including through a `backoff` error's `cause`.
		throw Object.assign(
			new Error(
				`c15t manifest cache: backend /manifest responded ${response.status} ${response.statusText}`
			),
			{ status: response.status }
		);
	}

	const manifest = (await response.json()) as ConsentManifest;
	const responseHeaders = normalizeHeaders(response.headers);
	const sMaxAge = getManifestSMaxAge(responseHeaders['cache-control']);
	// A source behind its own CDN reports how long the object has already
	// lived; the remaining lifetime is what this cache may grant. A copy the
	// CDN is itself serving stale arrives with `Age` past `s-maxage` and is
	// stored as already stale, so it is served while the next revalidation
	// runs instead of costing every request an upstream round trip.
	const upstreamAge = readUpstreamAge(responseHeaders);
	const { expiresAt, staleUntil } = resolveEntryLifetime({
		cacheControl: responseHeaders['cache-control'],
		now,
		sMaxAge,
		upstreamAge,
	});
	const entry: CachedManifestResponse = {
		expiresAt,
		fetchedAt: now,
		headers: responseHeaders,
		manifest,
		sMaxAge,
		staleUntil,
		upstreamAge,
	};
	if (staleUntil > now) {
		store(entry);
	} else if (getGeneration(cache) === generation) {
		// The replacement cannot be cached (`no-store`, `private`, or already
		// aged out), so the stale entry must not outlive it either.
		cache.delete(cacheKey);
		revalidateAfterByCache.get(cache)?.delete(cacheKey);
	}
	return entry;
};

/** Swallows a promise's outcome, for work handed to the platform. */
const settle = async function settle(task: Promise<unknown>): Promise<void> {
	try {
		await task;
	} catch {
		// The outcome is recorded elsewhere; the platform only keeps it alive.
	}
};

/**
 * Settles with `task`, or rejects with `onTimeout()` after `ms`, whichever is
 * first. The timer is cleared as soon as either happens.
 */
const raceTimer = async function raceTimer<Value>(
	task: Promise<Value>,
	ms: number,
	onTimeout: () => Error
): Promise<Value> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const expired = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => {
			reject(onTimeout());
		}, ms);
	});
	try {
		return await Promise.race([task, expired]);
	} finally {
		clearTimeout(timer);
	}
};

/**
 * Throws a `backoff` {@link ManifestUnavailableError} while the key's last
 * failure record is inside its retry floor.
 */
const assertNotBackingOff = function assertNotBackingOff(
	cache: ManifestCache,
	cacheKey: string,
	now: number
): void {
	const failure = failuresByCache.get(cache)?.get(cacheKey);
	if (!failure || failure.retryAt <= now) {
		return;
	}
	const retryAfterMs = failure.retryAt - now;
	const what =
		failure.failures === 1 ? 'request' : `${failure.failures} requests`;
	throw new ManifestUnavailableError(
		'backoff',
		`c15t manifest cache: the last ${what} for this manifest failed; retrying in ${retryAfterMs} ms.`,
		{ cause: failure.error, retryAfterMs }
	);
};

/**
 * Waits for a fill within the caller's `timeoutMs`, measured from when the
 * fill started. Past it, rejects and hands the still-running fill to
 * `onBackgroundRevalidate` so the platform keeps it alive.
 */
const waitForFill = function waitForFill(
	fill: InflightFill,
	options: Pick<
		FetchCachedManifestOptions,
		'onBackgroundRevalidate' | 'timeoutMs'
	>
): Promise<CachedManifestResponse> {
	const { timeoutMs } = options;
	if (timeoutMs === undefined || !Number.isFinite(timeoutMs)) {
		return fill.promise;
	}
	const giveUp = function giveUp(): ManifestUnavailableError {
		if (options.onBackgroundRevalidate) {
			try {
				options.onBackgroundRevalidate(settle(fill.promise));
			} catch {
				// Registration is best effort; the fill runs either way.
			}
		}
		return new ManifestUnavailableError(
			'timeout',
			`c15t manifest cache: no manifest within ${timeoutMs} ms; the request continues in the background.`
		);
	};
	const remaining = fill.startedAt + Math.max(0, timeoutMs) - Date.now();
	if (remaining <= 0) {
		// Joined a fill that already ran past the budget: the upstream is
		// slow, so answer now rather than add to the wait.
		return Promise.reject(giveUp());
	}
	return raceTimer(fill.promise, remaining, giveUp);
};

/**
 * Bounds a whole server-side consent resolution, not only its manifest read:
 * rejects with a {@link ManifestUnavailableError} (`reason: 'timeout'`) once
 * `timeoutMs` has passed. The task itself is not cancelled.
 *
 * @param task - The resolution to bound.
 * @param timeoutMs - Budget in milliseconds. `undefined` or a non-finite
 * value returns the task unchanged.
 * @returns The task's result, if it settles in time.
 * @throws {ManifestUnavailableError} When the budget runs out first.
 */
export const withResolutionBudget = function withResolutionBudget<Value>(
	task: Promise<Value>,
	timeoutMs: number | undefined
): Promise<Value> {
	if (timeoutMs === undefined || !Number.isFinite(timeoutMs)) {
		return task;
	}
	return raceTimer(
		task,
		Math.max(0, timeoutMs),
		() =>
			new ManifestUnavailableError(
				'timeout',
				`c15t: consent resolution did not finish within ${timeoutMs} ms.`
			)
	);
};

/**
 * Fetches the manifest through the in-process cache.
 *
 * Serves a fresh entry without a network round-trip. Once `s-maxage` has
 * passed, a stale entry inside the backend's `stale-while-revalidate`
 * window is still returned at once while one background request
 * revalidates it with `If-None-Match`; a failed or timed-out revalidation
 * leaves the stale entry in place and is retried no sooner than
 * {@link MANIFEST_DEDUPE_TTL_SECONDS} later. Past that window, or with no
 * such directive, the caller waits on the upstream as for a miss; a stale
 * entry is never served past its window.
 * Concurrent misses for the same URL share one upstream request, so a cold
 * start or an expiry under load reaches the backend once.
 *
 * When that upstream request fails with nothing servable cached, the key is
 * not asked again for {@link MANIFEST_FAILURE_RETRY_MIN_MS}, doubling with
 * each consecutive failure up to {@link MANIFEST_FAILURE_RETRY_MAX_MS}; calls
 * in between reject at once. With `timeoutMs`, a call stops waiting for the
 * upstream after that long and the request finishes in the background.
 *
 * @param options - Source URL, fetch, query, clock, budget, and cache overrides.
 * @returns The cached or freshly fetched manifest with its upstream headers.
 * @throws {ManifestUnavailableError} When `timeoutMs` runs out, or the key is
 * inside its retry floor after a failure.
 * @throws {Error} When no fetch implementation is available, the backend
 * responds with a non-2xx status, or the request times out after
 * {@link MANIFEST_FETCH_TIMEOUT_MS}.
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
	if (!cached) {
		// The key left the cache (evicted or deleted by the host), so any
		// throttle record for it is an orphan.
		revalidateAfterByCache.get(cache)?.delete(cacheKey);
	} else if (cached.expiresAt > now) {
		return cached;
	}

	const inflight = getInflight(cache);
	const pending = inflight.get(cacheKey);
	/**
	 * Starts one upstream fill and registers it as in flight. A background
	 * fill outlives the request that triggered it, so it never inherits that
	 * request's `signal`: it always gets a cache-owned controller with the
	 * default timeout.
	 */
	const startFill = function startFill(background = false): InflightFill {
		const callerSignal = background ? undefined : options.init?.signal;
		const controller = callerSignal ? undefined : new AbortController();
		const timeout = controller
			? setTimeout(() => {
					controller.abort(
						new Error(
							`c15t manifest cache: fetch timed out after ${MANIFEST_FETCH_TIMEOUT_MS} ms.`
						)
					);
				}, MANIFEST_FETCH_TIMEOUT_MS)
			: undefined;
		const startedAt = Date.now();
		const request = (async () => {
			try {
				const entry = await revalidateManifest({
					cache,
					cacheKey,
					cached,
					fetchImpl,
					generation,
					headers: options.headers,
					init: controller
						? { ...options.init, signal: controller.signal }
						: options.init,
					now,
					requestURL,
				});
				if (getGeneration(cache) === generation) {
					failuresByCache.get(cache)?.delete(cacheKey);
				}
				return entry;
			} catch (error) {
				// A background refresh keeps its stale entry and has its own floor.
				// A caller that cancelled its own request says nothing about the
				// upstream, so neither counts as a failure of the key.
				if (
					!background &&
					!callerSignal?.aborted &&
					getGeneration(cache) === generation
				) {
					recordFillFailure(
						cache,
						cacheKey,
						error,
						now + (Date.now() - startedAt)
					);
				}
				throw error;
			} finally {
				clearTimeout(timeout);
				// After a clear the map holds newer fills; leave those alone.
				if (getGeneration(cache) === generation) {
					inflight.delete(cacheKey);
				}
			}
		})();
		const fill: InflightFill = { promise: request, startedAt };
		inflight.set(cacheKey, fill);
		return fill;
	};

	if (cached && cached.staleUntil > now) {
		// Stale but inside the backend's stale-while-revalidate window: answer
		// from memory now and refresh behind the request. One fill at a time,
		// and no sooner than the dedupe floor after the last one settled, so a
		// source that keeps answering stale or keeps failing is not re-asked
		// on every request.
		const revalidateAfter = getRevalidateAfter(cache);
		if (!pending && (revalidateAfter.get(cacheKey) ?? 0) <= now) {
			// Claim the slot before the first await so concurrent stale reads
			// in the same tick do not each start a fill.
			setRevalidationFloor(cache, cacheKey, Number.POSITIVE_INFINITY);
			const revalidation = (async () => {
				// The floor counts from when the fill settles, not when it starts,
				// so a slow or timed-out upstream is not asked again at once.
				// Measured as elapsed wall time so an injected `now` still works.
				const startedAt = Date.now();
				let replacement: CachedManifestResponse | undefined;
				try {
					replacement = await startFill(true).promise;
				} catch {
					// The stale entry stays in place; the next window retries.
				} finally {
					if (getGeneration(cache) === generation) {
						const settledAt = now + (Date.now() - startedAt);
						if (replacement && replacement.expiresAt > settledAt) {
							// Fresh: `store` already cleared the floor and the entry's
							// own expiry schedules the next revalidation, even if that
							// is sooner than the floor (`s-maxage` under five seconds).
							revalidateAfter.delete(cacheKey);
						} else {
							// Failed, or answered already stale (a CDN whose origin is
							// down): hold off for the floor before asking again.
							setRevalidationFloor(
								cache,
								cacheKey,
								settledAt + MANIFEST_DEDUPE_TTL_SECONDS * 1000
							);
						}
					}
				}
			})();
			if (options.onBackgroundRevalidate) {
				try {
					options.onBackgroundRevalidate(revalidation);
				} catch {
					// A failing host registration must not turn a stale read that
					// already has an answer into an error. The refresh still runs;
					// it is only unregistered with the platform.
				}
			}
		}
		return cached;
	}

	if (pending) {
		return waitForFill(pending, options);
	}
	// Nothing servable is cached. After a failure, answer from the failure
	// record until its floor passes instead of asking a backend that is down
	// again on every request. A stale entry past its window is never served.
	assertNotBackingOff(cache, cacheKey, now);
	return waitForFill(startFill(), options);
};

/**
 * Default time budget, in milliseconds, for resolving consent while a server
 * renders a page. Server adapters wait at most this long for the manifest (or
 * backend `/init`) before rendering without a resolved policy.
 *
 * A warm in-process cache answers in about a millisecond. A cold read over a
 * new TLS connection to a hosted backend measured 115 to 385 ms, so 500 ms
 * covers a healthy cold start while keeping an outage from holding the page.
 */
export const DEFAULT_RESOLVE_TIMEOUT_MS = 500;
