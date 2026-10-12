/**
 * In-process simulator for a Vercel-style CDN fronting an Inth `/manifest`
 * origin. No real sockets: `fetch`-compatible, driven by a caller-supplied
 * simulated clock so the CDN and `fetchCachedManifest` agree on "now" while
 * only real network round trips (edge/origin RTT) cost real wall-clock time.
 *
 * Cache-Control on origin responses (`s-maxage`, `stale-while-revalidate`)
 * governs the CDN's own freshness classification, exactly like a real
 * shared cache would honour it. Client requests carrying `If-None-Match`
 * are answered `304` whenever the CDN's own copy still matches, regardless
 * of whether that copy is fresh or being served stale.
 */
import { buildBrowserBenchManifest } from '@c15t/benchmarking/policy-fixtures';

/** Reads the current simulated time in epoch milliseconds. */
export type SimClock = () => number;

/** Cumulative counters describing what the CDN did across all requests. */
export interface VercelCdnCounters {
	/** Requests the CDN forwarded to the origin (successful or not). */
	originHits: number;
	/** Requests served from a fresh edge cache entry, no origin contact. */
	edgeHits: number;
	/** Responses sent as `304 Not Modified`. */
	notModified: number;
	/** Responses served from a stale-but-still-usable edge cache entry. */
	staleServes: number;
}

/** Fault modes toggleable at runtime; all default to `false`. */
export interface VercelCdnFaults {
	/** The origin never responds. The CDN hangs unless it can serve stale. */
	originDown: boolean;
	/** The CDN itself never responds; only `init.signal` aborts it. */
	edgeUnreachable: boolean;
	/** The origin responds `500` to every request it receives. */
	originError: boolean;
}

export interface VercelCdnOptions {
	/** Simulated clock; the CDN never reads the real `Date.now()`. */
	now: SimClock;
	/** Edge round-trip time in milliseconds. @default 25 */
	edgeRttMs?: number;
	/** Origin round-trip time in milliseconds. @default 150 */
	originRttMs?: number;
	/** `s-maxage` the origin advertises, in seconds. @default 300 */
	sMaxAge?: number;
	/** `stale-while-revalidate` the origin advertises, in seconds. @default 86400 */
	staleWhileRevalidate?: number;
	/**
	 * Whether the origin also sends `CDN-Cache-Control`. Vercel consumes
	 * `s-maxage` and `stale-while-revalidate` from a bare `Cache-Control` and
	 * strips them before forwarding; with `CDN-Cache-Control` present it
	 * forwards `Cache-Control` untouched. The c15t backend sends both.
	 * @default true
	 */
	originSendsCdnCacheControl?: boolean;
}

export interface VercelCdn {
	/** `fetch`-compatible entry point; pass as `fetchCachedManifest`'s `fetch`. */
	fetch: (
		input: string | URL | Request,
		init?: RequestInit
	) => Promise<Response>;
	counters: VercelCdnCounters;
	faults: VercelCdnFaults;
	/** Zeroes every counter without touching cached entries or faults. */
	resetCounters: () => void;
}

const DEFAULT_EDGE_RTT_MS = 25;
const DEFAULT_ORIGIN_RTT_MS = 150;
const DEFAULT_S_MAXAGE = 300;
const DEFAULT_STALE_WHILE_REVALIDATE = 86_400;

interface CdnCacheEntry {
	body: string;
	etag: string;
	sMaxAge: number;
	staleWhileRevalidate: number;
	/** Simulated epoch milliseconds this entry was (re)validated at origin. */
	fetchedAtSim: number;
}

/** Resolves after `ms`, or rejects immediately/eventually on `signal` abort. */
const sleep = function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason ?? new Error('aborted'));
			return;
		}
		const controller = new AbortController();
		const timer = setTimeout(() => {
			controller.abort();
			resolve();
		}, ms);
		signal?.addEventListener(
			'abort',
			() => {
				clearTimeout(timer);
				reject(signal.reason ?? new Error('aborted'));
			},
			{ once: true, signal: controller.signal }
		);
	});
};

/** Never settles on its own; only ever rejects, and only via `signal` abort. */
const hangUntilAbort = function hangUntilAbort(
	signal?: AbortSignal
): Promise<never> {
	return new Promise((_resolve, reject) => {
		if (!signal) {
			// No signal to wait on: this simulates a request nothing can cancel.
			return;
		}
		if (signal.aborted) {
			reject(signal.reason ?? new Error('aborted'));
			return;
		}
		signal.addEventListener(
			'abort',
			() => reject(signal.reason ?? new Error('aborted')),
			{ once: true }
		);
	});
};

const requestUrl = function requestUrl(input: string | URL | Request): string {
	if (typeof input === 'string') {
		return input;
	}
	return input instanceof URL ? input.href : input.url;
};

const readHeader = function readHeader(
	init: RequestInit | undefined,
	name: string
): string | undefined {
	const headers = init?.headers;
	if (!headers) {
		return undefined;
	}
	if (headers instanceof Headers) {
		return headers.get(name) ?? undefined;
	}
	if (Array.isArray(headers)) {
		const lower = name.toLowerCase();
		const found = headers.find(([key]) => key.toLowerCase() === lower);
		return found?.[1];
	}
	const record = headers as Record<string, string>;
	const key = Object.keys(record).find(
		(candidate) => candidate.toLowerCase() === name.toLowerCase()
	);
	return key ? record[key] : undefined;
};

type OriginResult = { body: string; etag: string } | { errorStatus: number };

/**
 * Creates a simulated Vercel CDN in front of a fixed-fixture `/manifest`
 * origin. Every field is process-local; nothing here opens a real socket.
 *
 * @param options - Clock, RTTs, and the origin's advertised cache policy.
 * @returns A `fetch`-compatible CDN plus its counters and fault switches.
 */
export const createVercelCdn = function createVercelCdn(
	options: VercelCdnOptions
): VercelCdn {
	const { now } = options;
	const edgeRttMs = options.edgeRttMs ?? DEFAULT_EDGE_RTT_MS;
	const originRttMs = options.originRttMs ?? DEFAULT_ORIGIN_RTT_MS;
	const sMaxAge = options.sMaxAge ?? DEFAULT_S_MAXAGE;
	const staleWhileRevalidate =
		options.staleWhileRevalidate ?? DEFAULT_STALE_WHILE_REVALIDATE;
	const originSendsCdnCacheControl = options.originSendsCdnCacheControl ?? true;

	const store = new Map<string, CdnCacheEntry>();
	const counters: VercelCdnCounters = {
		edgeHits: 0,
		notModified: 0,
		originHits: 0,
		staleServes: 0,
	};
	const faults: VercelCdnFaults = {
		edgeUnreachable: false,
		originDown: false,
		originError: false,
	};

	let manifestPromise: ReturnType<typeof buildBrowserBenchManifest> | undefined;
	const loadManifest = function loadManifest() {
		manifestPromise ??= buildBrowserBenchManifest();
		return manifestPromise;
	};

	/** Contacts the simulated origin. Never used for the `originDown` fault. */
	const callOrigin = async function callOrigin(
		signal?: AbortSignal
	): Promise<OriginResult> {
		await sleep(originRttMs, signal);
		if (faults.originError) {
			return { errorStatus: 500 };
		}
		const manifest = await loadManifest();
		return { body: JSON.stringify(manifest), etag: `"${manifest.revision}"` };
	};

	const originCacheControl =
		`public, s-maxage=${sMaxAge}, ` +
		`stale-while-revalidate=${staleWhileRevalidate}`;
	/**
	 * What the client sees. Vercel strips the shared-cache directives from a
	 * bare `Cache-Control` (documented behaviour); `CDN-Cache-Control` makes
	 * it pass the header through as sent.
	 */
	const forwardedCacheControl = originSendsCdnCacheControl
		? originCacheControl
		: 'public, max-age=0, must-revalidate';

	const buildResponse = function buildResponse(input: {
		status: number;
		body?: string;
		etag: string;
		ageSeconds: number;
		cacheStatus: 'HIT' | 'MISS' | 'STALE';
	}): Response {
		const headers: Record<string, string> = {
			age: String(Math.max(0, Math.floor(input.ageSeconds))),
			'cache-control': forwardedCacheControl,
			etag: input.etag,
			'x-vercel-cache': input.cacheStatus,
		};
		if (originSendsCdnCacheControl) {
			headers['cdn-cache-control'] = originCacheControl;
		}
		if (input.status !== 304 && input.body !== undefined) {
			headers['content-type'] = 'application/json';
		}
		return new Response(input.status === 304 ? null : input.body, {
			headers,
			status: input.status,
		});
	};

	/** Fire-and-forget background revalidation for a stale entry. */
	const revalidateInBackground = function revalidateInBackground(
		key: string
	): void {
		void (async () => {
			try {
				// Counted even when the origin is down: the CDN did forward it.
				counters.originHits += 1;
				if (faults.originDown) {
					// Never settles; nothing to store. The stale entry is served
					// and re-asked on a later request.
					return;
				}
				const result = await callOrigin();
				if ('errorStatus' in result) {
					return;
				}
				store.set(key, {
					body: result.body,
					etag: result.etag,
					fetchedAtSim: now(),
					sMaxAge,
					staleWhileRevalidate,
				});
			} catch {
				// Best-effort: a failed background revalidation keeps serving
				// whatever is already cached.
			}
		})();
	};

	/**
	 * Answers from the edge cache when it can: fresh, stale-but-usable, or
	 * last-known-copy while the origin is down. `undefined` means the edge
	 * has nothing usable and the origin must be asked.
	 */
	const serveFromEdge = function serveFromEdge(
		entry: CdnCacheEntry,
		key: string,
		ifNoneMatch: string | undefined,
		nowMs: number
	): Response | undefined {
		const ageSeconds = Math.max(0, (nowMs - entry.fetchedAtSim) / 1000);
		const isFresh = ageSeconds < entry.sMaxAge;
		const isStaleButUsable =
			!isFresh && ageSeconds < entry.sMaxAge + entry.staleWhileRevalidate;

		if (isFresh || isStaleButUsable) {
			const cacheStatus = isFresh ? 'HIT' : 'STALE';
			if (isFresh) {
				counters.edgeHits += 1;
			} else {
				counters.staleServes += 1;
				revalidateInBackground(key);
			}
			if (ifNoneMatch && ifNoneMatch === entry.etag) {
				counters.notModified += 1;
				return buildResponse({
					ageSeconds,
					cacheStatus,
					etag: entry.etag,
					status: 304,
				});
			}
			return buildResponse({
				ageSeconds,
				body: entry.body,
				cacheStatus,
				etag: entry.etag,
				status: 200,
			});
		}

		// Beyond stale-while-revalidate the edge has nothing it may serve, so
		// the request goes to the origin (and hangs there if it is down):
		// Vercel does not apply `stale-if-error` to function responses.
		return undefined;
	};

	const fetchImpl = async function fetchImpl(
		input: string | URL | Request,
		init?: RequestInit
	): Promise<Response> {
		if (faults.edgeUnreachable) {
			return hangUntilAbort(init?.signal ?? undefined);
		}

		await sleep(edgeRttMs, init?.signal ?? undefined);

		const key = requestUrl(input);
		const ifNoneMatch = readHeader(init, 'if-none-match');
		const entry = store.get(key);
		const nowMs = now();

		if (entry) {
			const served = serveFromEdge(entry, key, ifNoneMatch, nowMs);
			if (served) {
				return served;
			}
		} else if (faults.originDown) {
			counters.originHits += 1;
			return hangUntilAbort(init?.signal ?? undefined);
		}

		counters.originHits += 1;
		const result = await callOrigin(init?.signal ?? undefined);
		if ('errorStatus' in result) {
			return new Response(null, {
				headers: { 'x-vercel-cache': 'MISS' },
				status: result.errorStatus,
			});
		}
		store.set(key, {
			body: result.body,
			etag: result.etag,
			fetchedAtSim: nowMs,
			sMaxAge,
			staleWhileRevalidate,
		});
		return buildResponse({
			ageSeconds: 0,
			body: result.body,
			cacheStatus: 'MISS',
			etag: result.etag,
			status: 200,
		});
	};

	return {
		counters,
		faults,
		fetch: fetchImpl,
		resetCounters: () => {
			counters.originHits = 0;
			counters.edgeHits = 0;
			counters.notModified = 0;
			counters.staleServes = 0;
		},
	};
};

/** A monotonic simulated clock the harness and the CDN both read from. */
export interface SimulatedClock {
	now: SimClock;
	/** Advances the clock by `ms` (must be `>= 0`). */
	advance: (ms: number) => void;
	/** Jumps the clock to an absolute simulated epoch millisecond value. */
	set: (ms: number) => void;
}

export const createSimulatedClock = function createSimulatedClock(
	startMs = 0
): SimulatedClock {
	let value = startMs;
	return {
		advance: (ms: number) => {
			value += ms;
		},
		now: () => value,
		set: (ms: number) => {
			value = ms;
		},
	};
};
