/**
 * Scenarios exercising `fetchCachedManifest` against the simulated Vercel
 * CDN in `./vercel-cdn`. Each scenario builds a fresh `createManifestCache()`
 * and a fresh CDN, drives some number of requests, and records per-request
 * latency (`perf.now()` around the `await`) plus outcome.
 *
 * These import `@c15t/core/transports/manifest-cache` directly — the public
 * entry point — so the same file runs unchanged against the cache before
 * and after the in-flight stale-while-revalidate change: only the installed
 * `@c15t/core` build differs between runs.
 */
import {
	createManifestCache,
	fetchCachedManifest,
} from '@c15t/core/transports/manifest-cache';
import type { FetchCachedManifestOptions } from '@c15t/core/transports/manifest-cache';

import { createSimulatedClock, createVercelCdn } from './vercel-cdn';
import type { VercelCdn, VercelCdnCounters } from './vercel-cdn';

const SOURCE_URL = 'https://consent.example.com/manifest';
/**
 * A request that waited on the simulated edge (25 ms RTT) or origin counts
 * as a stall; anything served from the in-process cache takes well under
 * a millisecond.
 */
export const STALL_THRESHOLD_MS = 10;
/**
 * Real milliseconds each simulated second lasts in the steady-state
 * scenario, long enough for a background edge round trip (25 ms) to land
 * inside the same simulated second it started in.
 */
const STEADY_STATE_TICK_MS = 40;

const realSleep = function realSleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
};

export interface RequestSample {
	latencyMs: number;
	outcome: 'resolved' | 'rejected';
	manifestRevision?: string | null;
	error?: string;
}

export interface ScenarioResult {
	name: string;
	description: string;
	samples: RequestSample[];
	counters: VercelCdnCounters;
	edgeCalls: number;
	durationMs: number;
	notes: string[];
}

export interface ScenarioDefinition {
	name: string;
	description: string;
	/** Slow scenarios (real internal timeouts) skip when `--quick` is passed. */
	quickSkip?: boolean;
	run: () => Promise<ScenarioResult>;
}

/** Wraps a CDN's `fetch` to count every call reaching the simulated edge. */
const withCallCounter = function withCallCounter(cdn: VercelCdn): {
	fetch: VercelCdn['fetch'];
	count: () => number;
} {
	let calls = 0;
	return {
		count: () => calls,
		fetch: (input, init) => {
			calls += 1;
			return cdn.fetch(input, init);
		},
	};
};

/** Runs one `fetchCachedManifest` call, timing it and capturing its outcome. */
const timedRequest = async function timedRequest(
	options: FetchCachedManifestOptions
): Promise<RequestSample> {
	const startedAt = performance.now();
	try {
		const result = await fetchCachedManifest(options);
		return {
			latencyMs: performance.now() - startedAt,
			manifestRevision: result.manifest?.revision ?? null,
			outcome: 'resolved',
		};
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : String(error),
			latencyMs: performance.now() - startedAt,
			outcome: 'rejected',
		};
	}
};

const stallCount = function stallCount(samples: RequestSample[]): number {
	return samples.filter((sample) => sample.latencyMs > STALL_THRESHOLD_MS)
		.length;
};

/**
 * Scenario 1: 200 concurrent requests on an empty cache, edge warm.
 * Expect one edge call — `fetchCachedManifest` dedupes concurrent misses
 * for the same key into a single in-flight upstream request.
 */
const runColdInstanceBurst =
	async function runColdInstanceBurst(): Promise<ScenarioResult> {
		const clock = createSimulatedClock(0);
		const cdn = createVercelCdn({ now: clock.now });
		const counted = withCallCounter(cdn);
		const cache = createManifestCache();

		const startedAt = performance.now();
		const now = clock.now();
		const samples = await Promise.all(
			Array.from({ length: 200 }, () =>
				timedRequest({
					cache,
					fetch: counted.fetch,
					now,
					sourceURL: SOURCE_URL,
				})
			)
		);

		return {
			counters: { ...cdn.counters },
			description:
				'200 concurrent requests on an empty cache, edge warm. Expect one edge call.',
			durationMs: performance.now() - startedAt,
			edgeCalls: counted.count(),
			name: 'cold-instance-burst',
			notes: [
				`${samples.filter((sample) => sample.outcome === 'rejected').length} of 200 requests rejected.`,
			],
			samples,
		};
	};

/**
 * Scenario 2: 20 rps for a simulated 900s. The simulated clock advances
 * 1s per batch, each batch lasting a short real tick so background work
 * can land; RTT sleeps are real. Crosses the 300s s-maxage twice.
 * Without stale serving every crossing stalls the whole batch on the
 * revalidation round trip.
 */
const runSteadyStateExpiry =
	async function runSteadyStateExpiry(): Promise<ScenarioResult> {
		const clock = createSimulatedClock(0);
		const cdn = createVercelCdn({ now: clock.now });
		const counted = withCallCounter(cdn);
		const cache = createManifestCache();

		const rps = 20;
		const durationSeconds = 900;
		const samples: RequestSample[] = [];
		const stalledSeconds: number[] = [];

		const startedAt = performance.now();
		for (let second = 1; second <= durationSeconds; second += 1) {
			clock.advance(1000);
			const now = clock.now();
			// oxlint-disable-next-line no-await-in-loop -- Each batch must observe the clock advance from the previous one.
			const batch = await Promise.all(
				Array.from({ length: rps }, () =>
					timedRequest({
						cache,
						fetch: counted.fetch,
						now,
						sourceURL: SOURCE_URL,
					})
				)
			);
			samples.push(...batch);
			if (stallCount(batch) > 0) {
				stalledSeconds.push(second);
			}
			// Let background revalidations started this simulated second finish
			// before the clock moves on, as they would on a real server.
			// oxlint-disable-next-line no-await-in-loop -- Sequential by design.
			await realSleep(STEADY_STATE_TICK_MS);
		}

		// The fill lands at simulated second 1, so boundaries fall at 301 and
		// 601 within a 900 s run.
		const expectedCrossings = Math.floor((durationSeconds - 1) / 300);

		return {
			counters: { ...cdn.counters },
			description:
				'20 rps for a simulated 900s, crossing the 300s s-maxage twice.',
			durationMs: performance.now() - startedAt,
			edgeCalls: counted.count(),
			name: 'steady-state-expiry',
			notes: [
				`Expected ~${expectedCrossings} s-maxage crossings over ${durationSeconds}s.`,
				`${stalledSeconds.length} of ${durationSeconds} simulated seconds had a stalled batch (>${STALL_THRESHOLD_MS}ms): [${stalledSeconds.join(', ')}].`,
			],
			samples,
		};
	};

/**
 * Scenario 3: origin down, CDN serving stale with Age 350 then Age 3600 to
 * a fresh app instance each; 25 sequential requests per instance. Without
 * stale serving, expect an edge call per request because Age > s-maxage
 * yields zero remaining client-side lifetime.
 */
const runEdgeServingStale =
	async function runEdgeServingStale(): Promise<ScenarioResult> {
		const clock = createSimulatedClock(0);
		const cdn = createVercelCdn({ now: clock.now });
		const counted = withCallCounter(cdn);

		// Warm only the CDN with the origin still up; the app instances below
		// start with an empty cache and see the CDN's stale copy first.
		await timedRequest({
			cache: createManifestCache(),
			fetch: counted.fetch,
			now: clock.now(),
			sourceURL: SOURCE_URL,
		});
		const edgeCallsAfterWarm = counted.count();
		cdn.resetCounters();
		cdn.faults.originDown = true;

		const samples: RequestSample[] = [];
		const startedAt = performance.now();

		for (const ageMs of [350_000, 3_600_000]) {
			clock.set(ageMs);
			const cache = createManifestCache();
			for (let index = 0; index < 25; index += 1) {
				// oxlint-disable-next-line no-await-in-loop -- Sequential by design; each request must see the prior one's cache effects.
				const sample = await timedRequest({
					cache,
					fetch: counted.fetch,
					now: clock.now(),
					sourceURL: SOURCE_URL,
				});
				samples.push(sample);
			}
			// Let a background revalidation from this phase settle.
			// oxlint-disable-next-line no-await-in-loop -- Sequential by design.
			await realSleep(STEADY_STATE_TICK_MS);
		}

		return {
			counters: { ...cdn.counters },
			description:
				'Origin down; CDN serves stale at Age 350 then Age 3600 to a fresh app instance each; 25 sequential requests per instance.',
			durationMs: performance.now() - startedAt,
			edgeCalls: counted.count() - edgeCallsAfterWarm,
			name: 'edge-serving-stale',
			notes: [
				'Edge call and CDN counters exclude the CDN warm-up request.',
				'A fresh cache per Age phase, so each phase starts with the CDN stale copy.',
			],
			samples,
		};
	};

/**
 * Scenario 4: fill cache, advance past s-maxage (still within
 * stale-while-revalidate), set originDown, then 20 concurrent requests.
 * With a CDN in front these should still be fast (CDN stale).
 */
const runOriginDownWarm =
	async function runOriginDownWarm(): Promise<ScenarioResult> {
		const clock = createSimulatedClock(0);
		const cdn = createVercelCdn({ now: clock.now });
		const counted = withCallCounter(cdn);
		const cache = createManifestCache();

		await timedRequest({
			cache,
			fetch: counted.fetch,
			now: clock.now(),
			sourceURL: SOURCE_URL,
		});
		const edgeCallsAfterWarm = counted.count();
		cdn.resetCounters();

		// Past the 300s s-maxage, well inside the 86400s stale-while-revalidate.
		clock.advance(310_000);
		cdn.faults.originDown = true;

		const now = clock.now();
		const startedAt = performance.now();
		const samples = await Promise.all(
			Array.from({ length: 20 }, () =>
				timedRequest({
					cache,
					fetch: counted.fetch,
					now,
					sourceURL: SOURCE_URL,
				})
			)
		);
		// Foreground requests return before the background fill reaches the
		// edge (25 ms); let it land so the counters include it.
		await realSleep(STEADY_STATE_TICK_MS);

		return {
			counters: { ...cdn.counters },
			description:
				'Warm cache, past s-maxage, origin down; 20 concurrent requests. Expect the CDN to keep these fast.',
			durationMs: performance.now() - startedAt,
			edgeCalls: counted.count() - edgeCallsAfterWarm,
			name: 'origin-down-warm',
			notes: [],
			samples,
		};
	};

/**
 * Scenario 5: fill cache, advance past s-maxage, set edgeUnreachable, then
 * 5 sequential requests. BEFORE, expect each to reject after the cache's
 * internal 10s timeout — genuinely ~50s real time. Skipped by `--quick`.
 */
const runEdgeUnreachableWarm =
	async function runEdgeUnreachableWarm(): Promise<ScenarioResult> {
		const clock = createSimulatedClock(0);
		const cdn = createVercelCdn({ now: clock.now });
		const counted = withCallCounter(cdn);
		const cache = createManifestCache();

		await timedRequest({
			cache,
			fetch: counted.fetch,
			now: clock.now(),
			sourceURL: SOURCE_URL,
		});
		const edgeCallsAfterWarm = counted.count();
		cdn.resetCounters();

		clock.advance(310_000);
		cdn.faults.edgeUnreachable = true;

		const samples: RequestSample[] = [];
		const startedAt = performance.now();
		for (let index = 0; index < 5; index += 1) {
			// oxlint-disable-next-line no-await-in-loop -- Sequential by design; this scenario measures the internal timeout per request.
			const sample = await timedRequest({
				cache,
				fetch: counted.fetch,
				now: clock.now(),
				sourceURL: SOURCE_URL,
			});
			samples.push(sample);
		}

		return {
			counters: { ...cdn.counters },
			description:
				'Warm cache, past s-maxage, edge unreachable; 5 sequential requests. Without stale serving each rides out the internal 10s timeout (~50s real); with it, only the one background refresh does.',
			durationMs: performance.now() - startedAt,
			edgeCalls: counted.count() - edgeCallsAfterWarm,
			name: 'edge-unreachable-warm',
			notes: [],
			samples,
		};
	};

/**
 * Scenario 6: empty cache, edgeUnreachable, 3 sequential requests.
 * Rejections and duration.
 */
const runEdgeUnreachableCold =
	async function runEdgeUnreachableCold(): Promise<ScenarioResult> {
		const clock = createSimulatedClock(0);
		const cdn = createVercelCdn({ now: clock.now });
		cdn.faults.edgeUnreachable = true;
		const counted = withCallCounter(cdn);
		const cache = createManifestCache();

		const samples: RequestSample[] = [];
		const startedAt = performance.now();
		for (let index = 0; index < 3; index += 1) {
			// oxlint-disable-next-line no-await-in-loop -- Sequential by design; this scenario measures the internal timeout per request on a cold cache.
			const sample = await timedRequest({
				cache,
				fetch: counted.fetch,
				now: clock.now(),
				sourceURL: SOURCE_URL,
			});
			samples.push(sample);
		}

		return {
			counters: { ...cdn.counters },
			description:
				'Empty cache, edge unreachable; 3 sequential requests. Real ~30s (internal 10s timeout x3).',
			durationMs: performance.now() - startedAt,
			edgeCalls: counted.count(),
			name: 'edge-unreachable-cold',
			notes: [],
			samples,
		};
	};

/**
 * Scenario 7: the CDN strips `s-maxage`/`stale-while-revalidate` because the
 * origin sends only `Cache-Control` (Vercel's documented behaviour without
 * `CDN-Cache-Control`). The app then sees no shared-cache TTL and no stale
 * window. The first fill gets the 5 s dedupe floor; once the CDN copy's
 * `Age` reaches 5 s that floor is exhausted on arrival, nothing is stored,
 * and every batch after that waits on an edge round trip. Shows why the
 * backend must send both headers.
 */
const runBareCacheControl =
	async function runBareCacheControl(): Promise<ScenarioResult> {
		const clock = createSimulatedClock(0);
		const cdn = createVercelCdn({
			now: clock.now,
			originSendsCdnCacheControl: false,
		});
		const counted = withCallCounter(cdn);
		const cache = createManifestCache();

		const rps = 20;
		const durationSeconds = 60;
		const samples: RequestSample[] = [];
		const stalledSeconds: number[] = [];
		const startedAt = performance.now();
		for (let second = 1; second <= durationSeconds; second += 1) {
			clock.advance(1000);
			const now = clock.now();
			// oxlint-disable-next-line no-await-in-loop -- Each batch must observe the clock advance from the previous one.
			const batch = await Promise.all(
				Array.from({ length: rps }, () =>
					timedRequest({
						cache,
						fetch: counted.fetch,
						now,
						sourceURL: SOURCE_URL,
					})
				)
			);
			samples.push(...batch);
			if (stallCount(batch) > 0) {
				stalledSeconds.push(second);
			}
			// oxlint-disable-next-line no-await-in-loop -- Sequential by design.
			await realSleep(STEADY_STATE_TICK_MS);
		}

		return {
			counters: { ...cdn.counters },
			description:
				'Origin sends only Cache-Control, so the CDN strips s-maxage and stale-while-revalidate; 20 rps for 60 s.',
			durationMs: performance.now() - startedAt,
			edgeCalls: counted.count(),
			name: 'bare-cache-control-through-cdn',
			notes: [
				`${stalledSeconds.length} of ${durationSeconds} simulated seconds had a stalled batch (>${STALL_THRESHOLD_MS}ms).`,
			],
			samples,
		};
	};

export const scenarioDefinitions: ScenarioDefinition[] = [
	{
		description:
			'200 concurrent requests on an empty cache, edge warm. Expect one edge call.',
		name: 'cold-instance-burst',
		run: runColdInstanceBurst,
	},
	{
		description:
			'20 rps for a simulated 900s, crossing the 300s s-maxage twice.',
		name: 'steady-state-expiry',
		run: runSteadyStateExpiry,
	},
	{
		description:
			'Origin down; CDN serves stale at Age 350 then Age 3600 to a fresh app instance each; 25 sequential requests per instance.',
		name: 'edge-serving-stale',
		run: runEdgeServingStale,
	},
	{
		description:
			'Warm cache, past s-maxage, origin down; 20 concurrent requests.',
		name: 'origin-down-warm',
		run: runOriginDownWarm,
	},
	{
		description:
			'Warm cache, past s-maxage, edge unreachable; 5 sequential requests (~50s real without stale serving).',
		name: 'edge-unreachable-warm',
		quickSkip: true,
		run: runEdgeUnreachableWarm,
	},
	{
		description:
			'Empty cache, edge unreachable; 3 sequential requests (~30s real).',
		name: 'edge-unreachable-cold',
		run: runEdgeUnreachableCold,
	},
	{
		description:
			'Origin sends only Cache-Control, so the CDN strips the shared-cache directives; 20 rps for 60 s.',
		name: 'bare-cache-control-through-cdn',
		run: runBareCacheControl,
	},
];
