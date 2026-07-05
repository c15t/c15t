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
	none: {
		name: 'none',
		cpuThrottlingRate: 1,
		network: {
			latencyMs: 0,
			downloadThroughputBytesPerSecond: -1,
			uploadThroughputBytesPerSecond: -1,
		},
	},
	mobile: {
		name: 'mobile',
		cpuThrottlingRate: 4,
		network: {
			latencyMs: 170,
			downloadThroughputBytesPerSecond: 1_125_000,
			uploadThroughputBytesPerSecond: 187_500,
		},
	},
};

export interface BenchCdpSession {
	send(method: string, params?: Record<string, unknown>): Promise<unknown>;
}

export interface BenchInitScriptPage {
	addInitScript(
		script:
			| string
			| ((arg: BenchPerformanceObserverOptions) => void | Promise<void>),
		arg?: BenchPerformanceObserverOptions
	): Promise<void>;
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

export function readBenchNavigationTiming(): BenchNavigationTimingMetrics | null {
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
}

export function parseBenchThrottleProfile(
	value: string | undefined
): BenchThrottleProfileName {
	const profile = value ?? 'none';
	if (profile === 'none' || profile === 'mobile') {
		return profile;
	}

	throw new Error(
		`Unsupported benchmark throttle profile "${profile}". Expected "none" or "mobile".`
	);
}

export function parseBenchInitLatencyMs(value: string | undefined): number {
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
}

export async function applyBenchThrottleProfile(
	session: BenchCdpSession,
	profileName: BenchThrottleProfileName
): Promise<void> {
	const profile = benchThrottleProfiles[profileName];
	await session.send('Network.enable');
	await session.send('Emulation.setCPUThrottlingRate', {
		rate: profile.cpuThrottlingRate,
	});
	await session.send('Network.emulateNetworkConditions', {
		offline: false,
		latency: profile.network.latencyMs,
		downloadThroughput: profile.network.downloadThroughputBytesPerSecond,
		uploadThroughput: profile.network.uploadThroughputBytesPerSecond,
	});
}

export async function installBenchPerformanceObservers(
	page: BenchInitScriptPage,
	options: BenchPerformanceObserverOptions
): Promise<void> {
	await page.addInitScript(
		({
			bannerElementTimingName: timingName,
			bannerRootTestId: testId,
		}: BenchPerformanceObserverOptions) => {
			const metrics = {
				cls: 0,
				longTaskCount: 0,
				longTaskTotalMs: 0,
				bannerPaintMs: null as number | null,
			};
			Object.defineProperty(window, '__c15tBenchPerfMetrics', {
				value: metrics,
				configurable: true,
			});

			const toPaintTime = (entry: PerformanceEntry) => {
				const elementEntry = entry as PerformanceEntry & {
					renderTime?: number;
					loadTime?: number;
				};
				for (const value of [
					elementEntry.renderTime,
					elementEntry.loadTime,
					elementEntry.startTime,
				]) {
					if (
						typeof value === 'number' &&
						Number.isFinite(value) &&
						value > 0
					) {
						return value;
					}
				}
				return null;
			};

			const readBufferedBannerPaint = () => {
				try {
					const entries = performance.getEntriesByType('element').filter(
						(entry) =>
							(
								entry as PerformanceEntry & {
									identifier?: string;
								}
							).identifier === timingName
					);
					const entry = entries.at(-1);
					if (!entry) return;
					metrics.bannerPaintMs = toPaintTime(entry);
				} catch {}
			};

			const markBanner = () => {
				const root = document.querySelector(`[data-testid="${testId}"]`);
				if (root instanceof HTMLElement) {
					root.setAttribute('elementtiming', timingName);
				}
			};

			try {
				new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						const shift = entry as PerformanceEntry & {
							value?: number;
							hadRecentInput?: boolean;
						};
						if (!shift.hadRecentInput) {
							metrics.cls += shift.value ?? 0;
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
						const elementEntry = entry as PerformanceEntry & {
							identifier?: string;
							renderTime?: number;
							loadTime?: number;
						};
						if (elementEntry.identifier === timingName) {
							metrics.bannerPaintMs = toPaintTime(entry);
						}
					}
				}).observe({ type: 'element', buffered: true });
			} catch {}

			markBanner();
			readBufferedBannerPaint();
			document.addEventListener(
				'DOMContentLoaded',
				() => {
					markBanner();
					readBufferedBannerPaint();
				},
				{ once: true }
			);
			try {
				new MutationObserver(markBanner).observe(
					document.documentElement ?? document,
					{
						childList: true,
						subtree: true,
					}
				);
			} catch {}
		},
		options
	);
}
