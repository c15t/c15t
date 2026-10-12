/**
 * Script resource timing for the browser benches, split at the first
 * idle-time preload.
 *
 * c15t loads some code it expects to need soon (the preference dialog, the
 * persistence writer) from a `requestIdleCallback` callback once the page
 * has loaded. The benches sample resources until `load` + 250 ms, so those
 * preloads used to become the page's "last app script" and moved
 * `lastAppScriptEndMs` without the page starting any later.
 *
 * The observer init script (`benchPerformanceObserverScript`) records every
 * idle callback task. A script request that starts inside one of those
 * tasks after `load` is an idle preload. `lastAppScriptEndMs` stops at the
 * first one; it and everything that starts after it are reported as
 * `idlePreload*` metrics instead. A slow script the page requested before
 * that point still counts, however late it finishes.
 */
import type { MetricSampleSet } from './schema';
import { summarizeMetric, summarizeNullableMetric } from './utils';

/** One script resource, read from Resource Timing in the page. */
export interface BenchScriptResource {
	url: string;
	initiatorType: string;
	startTime: number;
	responseEnd: number;
	transferSize: number;
	encodedBodySize: number;
}

/** One `requestIdleCallback` callback task, recorded in the page. */
export interface BenchIdleTask {
	/** When the callback started. */
	startMs: number;
	/**
	 * When the next task started, so microtasks the callback queued are
	 * inside the window. Null if that task had not run yet.
	 */
	endMs: number | null;
	/** The page's `load` event had already fired when the callback ran. */
	afterLoad: boolean;
}

/** Raw script timing read from the page by `benchScriptTimingExpression`. */
export interface BenchScriptTiming {
	resources: BenchScriptResource[];
	idleTasks: BenchIdleTask[];
}

/**
 * Which resources count as scripts.
 *
 * - `script-initiator`: `initiatorType === 'script'` only.
 * - `script-or-module-url`: also any `.js`/`.mjs` URL. Vite hosts preload
 *   their module graph with `<link rel="modulepreload">`, which Chromium
 *   reports as `link` or `other`.
 */
export type BenchScriptMatch = 'script-initiator' | 'script-or-module-url';

/** Script metrics for one page visit. */
export interface BenchScriptResourceMetrics {
	/** Every script resource, idle preloads included. */
	appScriptCount: number;
	firstAppScriptStartMs: number;
	/** Bytes of every script resource, idle preloads included. */
	jsBytes: number;
	/**
	 * Response end of the last script to start before the first idle
	 * preload.
	 */
	lastAppScriptEndMs: number;
	/** Scripts from the first idle preload on. */
	idlePreloadCount: number;
	/** Latest response end among those scripts; null when there are none. */
	idlePreloadEndMs: number | null;
	idlePreloadBytes: number;
}

/**
 * Self-contained page-context expression returning `BenchScriptTiming`.
 * A string, because functions passed to `page.evaluate` are serialized after
 * the transpiler has wrapped them (see `benchNavigationTimingExpression`).
 */
export const benchScriptTimingExpression = `(() => {
	const isScriptLike = (entry) => {
		if (entry.initiatorType === 'script') {
			return true;
		}
		try {
			return /\\.m?js$/u.test(new URL(entry.name).pathname);
		} catch {
			return false;
		}
	};
	const resources = performance
		.getEntriesByType('resource')
		.filter((entry) => isScriptLike(entry))
		.map((entry) => ({
			url: entry.name,
			initiatorType: entry.initiatorType,
			startTime: entry.startTime,
			responseEnd: entry.responseEnd,
			transferSize: entry.transferSize,
			encodedBodySize: entry.encodedBodySize,
		}));
	const tasks = window.__c15tBenchIdleTasks;
	const idleTasks = Array.isArray(tasks)
		? tasks.map((task) => ({
				startMs: task.startMs,
				endMs: task.endMs,
				afterLoad: task.afterLoad,
			}))
		: [];
	return { resources, idleTasks };
})()`;

const isModuleUrl = function isModuleUrl(url: string): boolean {
	try {
		return /\.m?js$/u.test(new URL(url).pathname);
	} catch {
		return false;
	}
};

const matchesScript = function matchesScript(
	resource: BenchScriptResource,
	match: BenchScriptMatch
): boolean {
	if (resource.initiatorType === 'script') {
		return true;
	}
	return match === 'script-or-module-url' && isModuleUrl(resource.url);
};

/**
 * Whether a script request started inside an idle callback task that ran
 * after `load`. The task, not the time of day, decides: a slow script the
 * page asked for earlier is never an idle preload.
 *
 * @param resource - The script resource.
 * @param idleTasks - Idle callback tasks recorded in the page.
 * @returns True for an idle-time preload.
 */
export const isIdlePreload = function isIdlePreload(
	resource: BenchScriptResource,
	idleTasks: readonly BenchIdleTask[]
): boolean {
	return idleTasks.some(
		(task) =>
			task.afterLoad &&
			resource.startTime >= task.startMs &&
			(task.endMs === null || resource.startTime <= task.endMs)
	);
};

const resourceBytes = function resourceBytes(
	resource: BenchScriptResource
): number {
	return resource.transferSize || resource.encodedBodySize;
};

/**
 * Script metrics for one visit, split at the first idle preload.
 *
 * @param timing - Raw timing from `benchScriptTimingExpression`.
 * @param match - Which resources count as scripts.
 * @returns The metrics, or null when the page loaded no scripts.
 */
export const summarizeBenchScripts = function summarizeBenchScripts(
	timing: BenchScriptTiming | null | undefined,
	match: BenchScriptMatch
): BenchScriptResourceMetrics | null {
	const scripts = (timing?.resources ?? [])
		.filter((resource) => matchesScript(resource, match))
		.sort((a, b) => a.startTime - b.startTime);
	if (scripts.length === 0) {
		return null;
	}

	const idleTasks = timing?.idleTasks ?? [];
	const firstPreload = scripts.findIndex((resource) =>
		isIdlePreload(resource, idleTasks)
	);
	const appScripts =
		firstPreload === -1 ? scripts : scripts.slice(0, firstPreload);
	const preloads = firstPreload === -1 ? [] : scripts.slice(firstPreload);

	return {
		appScriptCount: scripts.length,
		firstAppScriptStartMs: scripts[0]?.startTime ?? 0,
		idlePreloadBytes: preloads.reduce(
			(sum, resource) => sum + resourceBytes(resource),
			0
		),
		idlePreloadCount: preloads.length,
		idlePreloadEndMs:
			preloads.length > 0
				? Math.max(...preloads.map((resource) => resource.responseEnd))
				: null,
		jsBytes: scripts.reduce(
			(sum, resource) => sum + resourceBytes(resource),
			0
		),
		lastAppScriptEndMs: appScripts.at(-1)?.responseEnd ?? 0,
	};
};

/** What the idle preload metrics mean, written into result notes. */
export const scriptTimingGlossary = [
	'lastAppScriptEndMs: response end of the last script to start before the first idle-time preload (a script requested from a requestIdleCallback task after load).',
	'idlePreloadCount / idlePreloadBytes / idlePreloadEndMs: scripts from the first idle-time preload on, and when the last of them finished. appScriptCount and jsBytes include them.',
] as const;

export interface IdlePreloadSample {
	idlePreloadCount?: number;
	idlePreloadEndMs?: number | null;
	idlePreloadBytes?: number;
}

/**
 * Summaries for the idle preload metrics.
 *
 * @param samples - Per-visit script metrics.
 * @returns Metric sample sets in a stable order.
 */
export const summarizeIdlePreloadMetrics = function summarizeIdlePreloadMetrics(
	samples: readonly IdlePreloadSample[]
): MetricSampleSet[] {
	return [
		summarizeMetric(
			'idlePreloadCount',
			'count',
			samples.map((sample) => sample.idlePreloadCount ?? 0)
		),
		summarizeMetric(
			'idlePreloadBytes',
			'bytes',
			samples.map((sample) => sample.idlePreloadBytes ?? 0)
		),
		summarizeNullableMetric(
			'idlePreloadEndMs',
			'ms',
			samples.map((sample) => sample.idlePreloadEndMs ?? null)
		),
	];
};
