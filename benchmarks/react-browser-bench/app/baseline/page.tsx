'use client';

/**
 * Zero-consent baseline page: the identical bench app shell with NO c15t at
 * all. Measures the page's own floor (framework boot, hydration) so absolute
 * banner timings become legible and `consentTaxMs = bannerVisible − pageFloor`
 * can be derived across runs.
 *
 * The probe stub satisfies the runner's wait conditions: `bannerReadyMs` /
 * `bannerVisibleMs` here mean "app hydrated and painted" — the page floor.
 */
import { useEffect } from 'react';

import { getBenchState } from '../_bench/state';

function BaselineProbe() {
	useEffect(() => {
		const state = getBenchState('baseline');
		if (!state) {
			return;
		}
		// Mirror the real probe's settle semantics: two rAFs after hydration.
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const now = performance.now();
				if (state.bannerReadyMs === undefined) {
					state.bannerReadyMs = now;
					state.bannerVisibleMs = now;
				}
				state.activeUI = 'none';
			});
		});
	}, []);
	return null;
}

export default function BaselinePage() {
	return (
		<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
			<BaselineProbe />
			<h1>Zero-consent baseline</h1>
			<p>Identical app shell, no consent library. Measures the page floor.</p>
			<button
				id="baseline-noop"
				type="button"
			>
				No-op interaction target
			</button>
		</main>
	);
}
