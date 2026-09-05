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

/**
 * Self-contained page-context expression that sums the app's JavaScript
 * resources. Counted by URL, not `initiatorType`: Next emits classic
 * `<script async>` tags (initiator `script`), while Vite hosts such as
 * TanStack Start ship `<link rel="modulepreload">` plus one module entry, and
 * Chromium reports the preloaded modules as `other`. Filtering on `script`
 * alone under-counts the module graph by an order of magnitude.
 * String for the same reason as `benchNavigationTimingExpression`.
 */
export const benchScriptResourceExpression = `(() => {
	const isScript = (entry) => {
		if (entry.initiatorType === 'script') {
			return true;
		}
		try {
			return /\\.m?js$/u.test(new URL(entry.name).pathname);
		} catch {
			return false;
		}
	};
	const entries = performance
		.getEntriesByType('resource')
		.filter((entry) => isScript(entry));
	if (entries.length === 0) {
		return null;
	}
	const ordered = [...entries].sort((a, b) => a.startTime - b.startTime);
	return {
		appScriptCount: ordered.length,
		firstAppScriptStartMs: ordered[0]?.startTime ?? 0,
		jsBytes: ordered.reduce(
			(sum, entry) => sum + (entry.transferSize || entry.encodedBodySize),
			0
		),
		lastAppScriptEndMs: ordered[ordered.length - 1]?.responseEnd ?? 0,
	};
})()`;

export interface BenchScriptResourceMetrics {
	appScriptCount: number;
	firstAppScriptStartMs: number;
	jsBytes: number;
	lastAppScriptEndMs: number;
}

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

export const parseBenchInitLatencyMs = function parseBenchInitLatencyMs(
	value: string | undefined
): number {
	if (!value) {
		return 0;
	}

	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(
			`C15T_BENCH_INIT_LATENCY_MS must be a non-negative number. Received "${value}".`
		);
	}

	return Math.round(parsed);
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
 * long tasks, and the banner's first paint (Element Timing).
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
	};
	Object.defineProperty(window, '__c15tBenchPerfMetrics', {
		value: metrics,
		configurable: true,
	});

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

export const installBenchPerformanceObservers =
	async function installBenchPerformanceObservers(
		page: BenchInitScriptPage,
		options: BenchPerformanceObserverOptions
	): Promise<void> {
		await page.addInitScript(benchPerformanceObserverScript(options));
	};
