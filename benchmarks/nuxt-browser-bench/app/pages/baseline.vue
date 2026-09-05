<script setup lang="ts">
/**
 * Zero-consent baseline page: identical app shell, NO c15t (the module is
 * omitted entirely when built with C15T_BENCH_BASELINE=1). Measures the
 * page's own floor so `consentTaxMs = bannerVisible − pageFloor` can be
 * derived across runs.
 *
 * Fully self-contained: must not import any c15t composable or shared bench
 * component (they don't exist in the baseline build). The probe stub mirrors
 * the real probe's settle semantics (double-rAF after mount); here
 * `bannerReadyMs`/`bannerVisibleMs` mean "app hydrated and painted".
 */
import { onMounted } from 'vue';

onMounted(() => {
	const w = window as typeof window & {
		__c15tNuxtBench?: Record<string, unknown>;
	};
	if (!w.__c15tNuxtBench) {
		w.__c15tNuxtBench = {
			activeUI: 'none',
			mountCount: 1,
			onBannerFetchedCount: 0,
			onChoiceRecordedCount: 0,
			onErrorCount: 0,
			renderCount: 1,
			scenario: 'baseline',
			startedAtMs: performance.now(),
		};
	}
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			const state = w.__c15tNuxtBench;
			if (state && state.bannerReadyMs === undefined) {
				const now = performance.now();
				state.bannerReadyMs = now;
				state.bannerVisibleMs = now;
			}
		});
	});
});
</script>

<template>
	<main style="padding: 2rem; font-family: system-ui">
		<h1>Zero-consent baseline</h1>
		<p>Identical app shell, no consent library. Measures the page floor.</p>
		<button
			id="baseline-noop"
			type="button"
		>
			No-op interaction target
		</button>
	</main>
</template>
