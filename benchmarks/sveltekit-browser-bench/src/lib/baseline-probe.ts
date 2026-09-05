/**
 * Zero-consent baseline probe.
 *
 * Self-contained on purpose: the baseline arms must not import anything from
 * `@c15t/*`, or the floor they measure would include the library they exist
 * to subtract. Mirrors the real probe's settle semantics (double-rAF after
 * mount); here `bannerReadyMs` / `bannerVisibleMs` mean "app shell hydrated
 * and painted".
 *
 * @param scenario - The baseline arm being measured.
 */
export const publishBaselineProbe = function publishBaselineProbe(
	scenario: 'baseline' | 'baseline-client'
): void {
	const benchWindow = window as typeof window & {
		__c15tSvelteBench?: Record<string, unknown>;
	};
	benchWindow.__c15tSvelteBench ??= {
		activeUI: 'none',
		hasConsented: false,
		location: null,
		mountCount: 1,
		onBannerFetchedCount: 0,
		onConsentSetCount: 0,
		onErrorCount: 0,
		overrides: {},
		renderCount: 1,
		scenario,
		startedAtMs: performance.now(),
	};

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			const state = benchWindow.__c15tSvelteBench;
			if (state && state.bannerReadyMs === undefined) {
				const now = performance.now();
				state.bannerReadyMs = now;
				state.bannerVisibleMs = now;
				state.bannerPaintMs = null;
			}
		});
	});
};
