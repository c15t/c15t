export type BenchThrottleProfileName = 'none' | 'mobile';

export interface BenchThrottleProfile {
	name: BenchThrottleProfileName;
	cpuThrottlingRate: number;
	network: {
		latencyMs: number;
		downloadThroughputBytesPerSecond: number;
		uploadThroughputBytesPerSecond: number;
	};
}

export const benchThrottleProfiles: Record<
	BenchThrottleProfileName,
	BenchThrottleProfile
> = {
	mobile: {
		cpuThrottlingRate: 4,
		name: 'mobile',
		network: {
			downloadThroughputBytesPerSecond: 1_125_000,
			latencyMs: 170,
			uploadThroughputBytesPerSecond: 187_500,
		},
	},
	none: {
		cpuThrottlingRate: 1,
		name: 'none',
		network: {
			downloadThroughputBytesPerSecond: -1,
			latencyMs: 0,
			uploadThroughputBytesPerSecond: -1,
		},
	},
};

export interface BenchCdpSession {
	send: {
		(method: 'Network.enable'): Promise<unknown>;
		(
			method: 'Emulation.setCPUThrottlingRate',
			params: { rate: number }
		): Promise<unknown>;
		(
			method: 'Network.emulateNetworkConditions',
			params: {
				offline: boolean;
				latency: number;
				downloadThroughput: number;
				uploadThroughput: number;
			}
		): Promise<unknown>;
	};
}

export interface BenchInitScriptPage {
	// Playwright ≥1.61 resolves this to a Disposable (the handle that removes
	// the script again); older versions resolved to void. The benchmarks never
	// use the result, so accept either.
	addInitScript: (
		script:
			| string
			| ((arg: BenchPerformanceObserverOptions) => void | Promise<void>),
		arg?: BenchPerformanceObserverOptions
	) => Promise<unknown>;
}

export interface BenchPerformanceObserverOptions {
	bannerElementTimingName: string;
	bannerRootTestId: string;
}

export interface BenchNavigationTimingMetrics {
	ttfbMs: number | null;
	htmlDoneMs: number | null;
	domContentLoadedMs: number | null;
	loadEventMs: number | null;
}

export const readBenchNavigationTiming =
	function readBenchNavigationTiming(): BenchNavigationTimingMetrics | null {
		const finiteTimingValue = (value: number): number | null =>
			Number.isFinite(value) && value >= 0 ? Number(value.toFixed(3)) : null;
		const nav = performance.getEntriesByType('navigation')[0] as
			| PerformanceNavigationTiming
			| undefined;
		if (!nav) {
			return null;
		}

		const navWithActivation = nav as PerformanceNavigationTiming & {
			activationStart?: number;
		};
		const activationStart =
			typeof navWithActivation.activationStart === 'number' &&
			navWithActivation.activationStart > 0
				? navWithActivation.activationStart
				: 0;
		const navigationStart =
			activationStart > 0 ? activationStart : nav.startTime;
		const responseStart = nav.responseStart - navigationStart;
		const htmlDone = nav.domContentLoadedEventEnd - navigationStart;

		return {
			domContentLoadedMs: finiteTimingValue(nav.domContentLoadedEventEnd),
			htmlDoneMs:
				nav.domContentLoadedEventEnd > 0 ? finiteTimingValue(htmlDone) : null,
			loadEventMs:
				nav.loadEventEnd > 0 ? finiteTimingValue(nav.loadEventEnd) : null,
			ttfbMs: nav.responseStart > 0 ? finiteTimingValue(responseStart) : null,
		};
	};

/**
 * Self-contained page-context expression for reading navigation timing.
 * Passed to Playwright's `page.evaluate(...)` as a string because imported
 * functions do not survive serialization into the page (transpiler/coverage
 * wrappers reference out-of-scope helpers). Keep in sync with
 * `readBenchNavigationTiming` above.
 */
export const benchNavigationTimingExpression = `(() => {
	const finiteTimingValue = (value) =>
		Number.isFinite(value) && value >= 0 ? Number(value.toFixed(3)) : null;
	const nav = performance.getEntriesByType('navigation')[0];
	if (!nav) {
		return null;
	}
	const activationStart =
		typeof nav.activationStart === 'number' && nav.activationStart > 0
			? nav.activationStart
			: 0;
	const navigationStart = activationStart > 0 ? activationStart : nav.startTime;
	const responseStart = nav.responseStart - navigationStart;
	const htmlDone = nav.domContentLoadedEventEnd - navigationStart;
	return {
		ttfbMs: nav.responseStart > 0 ? finiteTimingValue(responseStart) : null,
		htmlDoneMs:
			nav.domContentLoadedEventEnd > 0 ? finiteTimingValue(htmlDone) : null,
		domContentLoadedMs: finiteTimingValue(nav.domContentLoadedEventEnd),
		loadEventMs:
			nav.loadEventEnd > 0 ? finiteTimingValue(nav.loadEventEnd) : null,
	};
})()`;

export const parseBenchThrottleProfile = function parseBenchThrottleProfile(
	value: string | undefined
): BenchThrottleProfileName {
	const profile = value ?? 'none';
	if (profile === 'none' || profile === 'mobile') {
		return profile;
	}

	throw new Error(
		`Unsupported benchmark throttle profile "${profile}". Expected "none" or "mobile".`
	);
};

/**
 * Simulated consent-backend round trip, in milliseconds, that every browser
 * bench applies unless told otherwise. A real backend is a network hop away;
 * benching against an instant localhost backend hid whether code waits on it.
 */
export const DEFAULT_BENCH_BACKEND_LATENCY_MS = 200;

/**
 * Environment variable a runner reads and passes to its bench server. The
 * fixture delays every consent-backend endpoint (init, manifest, subjects,
 * sessions) by this many milliseconds, and server-side fetches of those
 * endpoints pay it too. Static assets and app HTML are not delayed.
 */
export const BENCH_BACKEND_LATENCY_ENV = 'C15T_BENCH_BACKEND_LATENCY_MS';

/** Older name of {@link BENCH_BACKEND_LATENCY_ENV}, still read as an alias. */
export const BENCH_INIT_LATENCY_ENV = 'C15T_BENCH_INIT_LATENCY_MS';

/** CLI flags that set the backend latency, in precedence order. */
export const BENCH_BACKEND_LATENCY_FLAGS = [
	'--backend-latency-ms',
	'--init-latency-ms',
	'--init-latency',
] as const;

/**
 * Parse one backend-latency value. An absent or empty value selects
 * {@link DEFAULT_BENCH_BACKEND_LATENCY_MS}; `0` turns the delay off.
 *
 * @param value - Raw flag or environment value.
 * @param source - Flag or variable name, for the error message.
 * @returns Whole milliseconds.
 * @throws {Error} When the value is not a finite, non-negative number.
 */
export const parseBenchBackendLatencyMs = function parseBenchBackendLatencyMs(
	value: string | undefined,
	source: string = BENCH_BACKEND_LATENCY_ENV
): number {
	if (value === undefined || value.trim() === '') {
		return DEFAULT_BENCH_BACKEND_LATENCY_MS;
	}

	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(
			`${source} must be a non-negative number. Received "${value}".`
		);
	}

	return Math.round(parsed);
};

/**
 * Resolve a runner's backend latency: the first CLI flag in
 * {@link BENCH_BACKEND_LATENCY_FLAGS}, then {@link BENCH_BACKEND_LATENCY_ENV},
 * then the {@link BENCH_INIT_LATENCY_ENV} alias, then the 200 ms default.
 *
 * @param readFlag - Reads one CLI flag's value, `undefined` when absent.
 * @param env - Process environment.
 * @returns Whole milliseconds.
 *
 * @example
 * ```ts
 * const backendLatencyMs = resolveBenchBackendLatencyMs(readCliFlag, process.env);
 * ```
 */
export const resolveBenchBackendLatencyMs =
	function resolveBenchBackendLatencyMs(
		readFlag: (name: string) => string | undefined,
		env: Readonly<Record<string, string | undefined>>
	): number {
		for (const flag of BENCH_BACKEND_LATENCY_FLAGS) {
			const value = readFlag(flag);
			if (value !== undefined) {
				return parseBenchBackendLatencyMs(value, flag);
			}
		}
		for (const name of [BENCH_BACKEND_LATENCY_ENV, BENCH_INIT_LATENCY_ENV]) {
			const value = env[name];
			if (value !== undefined && value.trim() !== '') {
				return parseBenchBackendLatencyMs(value, name);
			}
		}
		return DEFAULT_BENCH_BACKEND_LATENCY_MS;
	};

/** Network condition a browser bench result was measured under. */
export interface BenchCondition {
	profile: BenchThrottleProfileName;
	backendLatencyMs: number;
}

/**
 * Resolve the condition from the environment alone, the way
 * `scripts/benchmark-run.ts` hands it to every runner and to the gate.
 *
 * @param env - Process environment.
 */
export const resolveBenchConditionFromEnv =
	function resolveBenchConditionFromEnv(
		env: Readonly<Record<string, string | undefined>>
	): BenchCondition {
		return {
			backendLatencyMs: resolveBenchBackendLatencyMs(() => undefined, env),
			profile: parseBenchThrottleProfile(env.C15T_BENCH_PROFILE),
		};
	};

/**
 * Result scenario key carrying the condition, so results measured at
 * different latencies or profiles never share a key.
 *
 * @param scenario - Scenario name, for example `ssr`.
 * @param condition - Throttle profile and backend latency.
 * @returns For example `ssr:profile-none:latency-200ms`.
 */
export const benchScenarioKey = function benchScenarioKey(
	scenario: string,
	condition: BenchCondition
): string {
	return `${scenario}:profile-${condition.profile}:latency-${condition.backendLatencyMs}ms`;
};

export const applyBenchThrottleProfile =
	async function applyBenchThrottleProfile(
		session: BenchCdpSession,
		profileName: BenchThrottleProfileName
	): Promise<void> {
		const profile = benchThrottleProfiles[profileName];
		await session.send('Network.enable');
		await session.send('Emulation.setCPUThrottlingRate', {
			rate: profile.cpuThrottlingRate,
		});
		await session.send('Network.emulateNetworkConditions', {
			downloadThroughput: profile.network.downloadThroughputBytesPerSecond,
			latency: profile.network.latencyMs,
			offline: false,
			uploadThroughput: profile.network.uploadThroughputBytesPerSecond,
		});
	};

/**
 * Builds the self-contained page-context init script that records CLS,
 * long tasks, page FCP/LCP, each `requestIdleCallback` task (for
 * `script-timing.ts`), and four separate banner milestones:
 *
 * - `bannerDomMs`: the banner root first exists in the DOM (server HTML
 *   parsed or client insertion), whether or not it is styled or visible.
 * - `bannerFirstFrameMs`: the first animation frame after that insertion.
 *   Rendering is blocked until render-blocking CSS arrives, so this is the
 *   earliest frame that could paint the banner. It is not a paint timestamp.
 * - `bannerPaintMs`: Element Timing for banner text or images, when
 *   Chromium emits it. This is the measured paint.
 * - Hydrated readiness (`bannerReadyMs`) is recorded by each app's probe,
 *   not here: it needs the consent runtime to report an active banner.
 *
 * Kept as a *string* for the same reason as
 * `benchNavigationTimingExpression`: function-form init scripts are
 * serialized with `Function.prototype.toString` after the transpiler has
 * decorated them (tsx/esbuild `keepNames` injects `__name(...)` wrappers),
 * so they throw `ReferenceError: __name is not defined` in the page and the
 * observers silently never install.
 *
 * Element Timing notes (all measured against headless Chromium):
 * - Entries are only delivered to `PerformanceObserver`s;
 *   `performance.getEntriesByType('element')` is always empty.
 * - Entries are only emitted for images and for elements that aggregate
 *   text nodes — never for a bare container like the banner root. So the
 *   root *and* every descendant are marked; whichever element Chromium
 *   associates the banner's text/images with carries the attribute, and the
 *   earliest entry is the banner's first paint.
 * - The attribute must be present before the element's first paint (it
 *   never retro-emits). That holds here: MutationObserver callbacks run at
 *   microtask checkpoints — after parser/hydration insertion, before the
 *   next rendering opportunity.
 */
export const benchPerformanceObserverScript =
	function benchPerformanceObserverScript(
		options: BenchPerformanceObserverOptions
	): string {
		const timingName = JSON.stringify(options.bannerElementTimingName);
		const testId = JSON.stringify(options.bannerRootTestId);
		return `(() => {
	const timingName = ${timingName};
	const testId = ${testId};
	const metrics = {
		cls: 0,
		longTaskCount: 0,
		longTaskTotalMs: 0,
		bannerPaintMs: null,
		bannerDomMs: null,
		bannerFirstFrameMs: null,
		fcpMs: null,
		lcpMs: null,
	};
	Object.defineProperty(window, '__c15tBenchPerfMetrics', {
		value: metrics,
		configurable: true,
	});

	// Record each requestIdleCallback task so script-timing.ts can tell an
	// idle-time preload from a script the page needed to start. The window
	// runs until the next task, so it covers the callback's microtasks.
	const idleTasks = [];
	Object.defineProperty(window, '__c15tBenchIdleTasks', {
		value: idleTasks,
		configurable: true,
	});
	const nativeRequestIdleCallback = window.requestIdleCallback;
	if (typeof nativeRequestIdleCallback === 'function') {
		window.requestIdleCallback = function requestIdleCallback(
			callback,
			options
		) {
			return nativeRequestIdleCallback.call(
				window,
				(deadline) => {
					const task = {
						startMs: performance.now(),
						endMs: null,
						afterLoad: document.readyState === 'complete',
					};
					idleTasks.push(task);
					const channel = new MessageChannel();
					channel.port1.onmessage = () => {
						task.endMs = performance.now();
						channel.port1.close();
					};
					channel.port2.postMessage(null);
					return callback(deadline);
				},
				options
			);
		};
	}

	const toPaintTime = (entry) => {
		for (const value of [entry.renderTime, entry.loadTime, entry.startTime]) {
			if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
				return value;
			}
		}
		return null;
	};

	const markBanner = () => {
		const root = document.querySelector('[data-testid="' + testId + '"]');
		if (!(root instanceof HTMLElement)) {
			return;
		}
		if (metrics.bannerDomMs === null) {
			metrics.bannerDomMs = performance.now();
			requestAnimationFrame(() => {
				if (metrics.bannerFirstFrameMs === null) {
					metrics.bannerFirstFrameMs = performance.now();
				}
			});
		}
		if (!root.hasAttribute('elementtiming')) {
			root.setAttribute('elementtiming', timingName);
		}
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
		let node = walker.nextNode();
		while (node) {
			if (node instanceof Element && !node.hasAttribute('elementtiming')) {
				node.setAttribute('elementtiming', timingName);
			}
			node = walker.nextNode();
		}
	};

	try {
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (!entry.hadRecentInput) {
					metrics.cls += entry.value ?? 0;
				}
			}
		}).observe({ type: 'layout-shift', buffered: true });
	} catch {}

	try {
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				metrics.longTaskCount += 1;
				metrics.longTaskTotalMs += entry.duration;
			}
		}).observe({ type: 'longtask', buffered: true });
	} catch {}

	try {
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.name === 'first-contentful-paint') {
					metrics.fcpMs = entry.startTime;
				}
			}
		}).observe({ type: 'paint', buffered: true });
	} catch {}

	try {
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				// The latest candidate is the LCP until input stops reporting.
				metrics.lcpMs = entry.renderTime || entry.loadTime || entry.startTime;
			}
		}).observe({ type: 'largest-contentful-paint', buffered: true });
	} catch {}

	try {
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.identifier === timingName) {
					// Every marked element reports; the banner's paint time is
					// the earliest entry (first pixel of any banner content).
					const paintMs = toPaintTime(entry);
					if (
						paintMs !== null &&
						(metrics.bannerPaintMs === null || paintMs < metrics.bannerPaintMs)
					) {
						metrics.bannerPaintMs = paintMs;
					}
				}
			}
		}).observe({ type: 'element', buffered: true });
	} catch {}

	markBanner();
	document.addEventListener('DOMContentLoaded', markBanner, { once: true });
	try {
		new MutationObserver(markBanner).observe(
			document.documentElement ?? document,
			{
				childList: true,
				subtree: true,
			}
		);
	} catch {}
})();`;
	};

/** Values the observer script collects, read back after the page settles. */
export interface BenchPerfMetrics {
	cls: number;
	longTaskCount: number;
	longTaskTotalMs: number;
	bannerPaintMs: number | null;
	bannerDomMs: number | null;
	bannerFirstFrameMs: number | null;
	fcpMs: number | null;
	lcpMs: number | null;
	domNodeCount: number;
}

/**
 * Self-contained page-context expression that reads the observer metrics.
 * String for the same reason as `benchNavigationTimingExpression`.
 */
export const benchPerfMetricsExpression = `(() => {
	const metrics = window.__c15tBenchPerfMetrics;
	const finite = (value) =>
		typeof value === 'number' && Number.isFinite(value)
			? Number(value.toFixed(3))
			: null;
	return {
		cls: metrics ? metrics.cls : 0,
		longTaskCount: metrics ? metrics.longTaskCount : 0,
		longTaskTotalMs: metrics ? metrics.longTaskTotalMs : 0,
		bannerPaintMs: metrics ? finite(metrics.bannerPaintMs) : null,
		bannerDomMs: metrics ? finite(metrics.bannerDomMs) : null,
		bannerFirstFrameMs: metrics ? finite(metrics.bannerFirstFrameMs) : null,
		fcpMs: metrics ? finite(metrics.fcpMs) : null,
		lcpMs: metrics ? finite(metrics.lcpMs) : null,
		domNodeCount: document.querySelectorAll('*').length,
	};
})()`;

/** One stylesheet the page loaded, from Resource Timing. */
export interface BenchStylesheetResource {
	url: string;
	transferSize: number;
	encodedBodySize: number;
	decodedBodySize: number;
}

/**
 * Self-contained page-context expression listing every CSS resource the
 * page fetched, so duplicate or overlapping stylesheets show up by URL.
 */
export const benchStylesheetResourcesExpression = `(() =>
	performance
		.getEntriesByType('resource')
		.filter((entry) => {
			try {
				return /\\.css$/u.test(new URL(entry.name).pathname);
			} catch {
				return false;
			}
		})
		.map((entry) => ({
			url: entry.name,
			transferSize: entry.transferSize,
			encodedBodySize: entry.encodedBodySize,
			decodedBodySize: entry.decodedBodySize,
		}))
)()`;

export const installBenchPerformanceObservers =
	async function installBenchPerformanceObservers(
		page: BenchInitScriptPage,
		options: BenchPerformanceObserverOptions
	): Promise<void> {
		await page.addInitScript(benchPerformanceObserverScript(options));
	};
