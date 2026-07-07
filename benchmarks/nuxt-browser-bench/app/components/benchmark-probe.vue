<script
	setup
	lang="ts"
>
import { nextTick, onBeforeUpdate, onMounted, watch } from 'vue';
import {
	useConsentActiveUI,
	useConsentInit,
	useConsentSnapshot,
} from '#c15t/composables';

const props = defineProps<{
	scenario: NuxtBenchScenario;
}>();

type NuxtBenchScenario =
	| 'ssr'
	| 'ssr-manifest'
	| 'client'
	| 'client-manifest'
	| 'repeat-visitor';

interface NuxtBenchState {
	scenario: NuxtBenchScenario;
	startedAtMs: number;
	mountCount: number;
	renderCount: number;
	activeUI: string;
	overrides?: {
		country?: string;
		region?: string;
		language?: string;
		gpc?: boolean;
	};
	location?: {
		countryCode?: string | null;
		regionCode?: string | null;
	} | null;
	hasConsented?: boolean;
	onBannerFetchedMs?: number;
	cls?: number;
	bannerReadyMs?: number;
	bannerVisibleMs?: number;
	bannerPaintMs?: number | null;
	onBannerFetchedCount: number;
	onConsentSetCount: number;
	onErrorCount: number;
}

interface BenchmarkElementTimingEntry extends PerformanceEntry {
	identifier?: string;
	renderTime?: number;
	loadTime?: number;
}

declare global {
	interface Window {
		__c15tNuxtBench?: NuxtBenchState;
	}
}

const BANNER_ELEMENT_TIMING_NAME = 'c15t-consent-banner';

const activeUI = useConsentActiveUI();
const init = useConsentInit();
const snapshot = useConsentSnapshot();

function getBenchState(): NuxtBenchState | undefined {
	if (!import.meta.client) {
		return undefined;
	}

	if (
		!window.__c15tNuxtBench ||
		window.__c15tNuxtBench.scenario !== props.scenario
	) {
		window.__c15tNuxtBench = {
			scenario: props.scenario,
			startedAtMs: performance.now(),
			mountCount: 0,
			renderCount: 0,
			activeUI: 'none',
			onBannerFetchedCount: 0,
			onConsentSetCount: 0,
			onErrorCount: 0,
		};
	}

	return window.__c15tNuxtBench;
}

function normalizeActiveUI(value: unknown): string {
	if (value === 'manager') {
		return 'dialog';
	}
	if (value === null || value === undefined) {
		return 'none';
	}
	return String(value);
}

function updateSnapshotProbe(state: NuxtBenchState) {
	state.overrides = { ...snapshot.value.overrides };
	state.location = snapshot.value.location
		? {
				countryCode: snapshot.value.location.countryCode,
				regionCode: snapshot.value.location.regionCode,
			}
		: null;
	state.hasConsented = snapshot.value.hasConsented;
}

function isElementVisible(element: Element): boolean {
	if (!(element instanceof HTMLElement)) {
		return false;
	}

	const rect = element.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) {
		return false;
	}

	const style = window.getComputedStyle(element);
	return (
		style.display !== 'none' &&
		style.visibility !== 'hidden' &&
		Number(style.opacity) >= 0.99
	);
}

function hasRunningAnimations(element: Element): boolean {
	if (
		!(element instanceof HTMLElement) ||
		typeof element.getAnimations !== 'function'
	) {
		return false;
	}

	return element
		.getAnimations()
		.some((animation) => animation.playState === 'running');
}

function readBannerPaintMs(): number | null {
	const entries = performance
		.getEntriesByType('element')
		.filter(
			(entry): entry is BenchmarkElementTimingEntry =>
				(entry as BenchmarkElementTimingEntry).identifier ===
				BANNER_ELEMENT_TIMING_NAME
		);
	const entry = entries.at(-1);
	if (!entry) return null;
	for (const value of [entry.renderTime, entry.loadTime, entry.startTime]) {
		if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
			return value;
		}
	}
	return null;
}

function markRepeatVisitorReady() {
	const state = getBenchState();
	if (!state || props.scenario !== 'repeat-visitor') {
		return;
	}
	if (
		snapshot.value.hasConsented &&
		normalizeActiveUI(activeUI.value) === 'none'
	) {
		state.bannerReadyMs = state.bannerReadyMs ?? 0;
		state.bannerVisibleMs = state.bannerVisibleMs ?? 0;
		state.bannerPaintMs = state.bannerPaintMs ?? null;
	}
}

function watchBannerVisibility() {
	const state = getBenchState();
	if (
		!state ||
		state.bannerVisibleMs !== undefined ||
		normalizeActiveUI(activeUI.value) !== 'banner'
	) {
		markRepeatVisitorReady();
		return;
	}

	let frameId = 0;
	const check = () => {
		const latest = getBenchState();
		if (!latest || latest.bannerVisibleMs !== undefined) {
			return;
		}

		const bannerRoot = document.querySelector(
			'[data-testid="consent-banner-root"]'
		);
		if (bannerRoot instanceof HTMLElement) {
			bannerRoot.setAttribute('elementtiming', BANNER_ELEMENT_TIMING_NAME);
		}
		const acceptButton = document.querySelector(
			'[data-testid="consent-banner-accept-button"]'
		);

		const ready =
			!!bannerRoot &&
			!!acceptButton &&
			isElementVisible(bannerRoot) &&
			isElementVisible(acceptButton);

		if (ready && latest.bannerReadyMs === undefined) {
			latest.bannerReadyMs = performance.now();
		}

		const visible =
			ready &&
			!hasRunningAnimations(bannerRoot) &&
			!hasRunningAnimations(acceptButton);

		if (visible) {
			latest.bannerVisibleMs = performance.now();
			latest.bannerPaintMs = readBannerPaintMs();
			return;
		}

		frameId = window.requestAnimationFrame(check);
	};

	frameId = window.requestAnimationFrame(check);
	return () => window.cancelAnimationFrame(frameId);
}

if (import.meta.client) {
	const state = getBenchState();
	if (state) {
		state.renderCount += 1;
		updateSnapshotProbe(state);
	}
}

onBeforeUpdate(() => {
	const state = getBenchState();
	if (state) {
		state.renderCount += 1;
		updateSnapshotProbe(state);
	}
});

onMounted(() => {
	const state = getBenchState();
	if (state) {
		state.mountCount += 1;
	}
});

watch(
	init,
	(value) => {
		const state = getBenchState();
		if (state && value) {
			state.onBannerFetchedCount += 1;
			state.onBannerFetchedMs = state.onBannerFetchedMs ?? performance.now();
		}
	},
	{ immediate: true }
);

watch(
	() => snapshot.value.hasConsented,
	(hasConsented, hadConsented) => {
		const state = getBenchState();
		if (state && hasConsented && !hadConsented) {
			state.onConsentSetCount += 1;
		}
		void nextTick(markRepeatVisitorReady);
	},
	{ immediate: true }
);

watch(
	snapshot,
	() => {
		const state = getBenchState();
		if (state) {
			updateSnapshotProbe(state);
		}
	},
	{ immediate: true }
);

watch(
	activeUI,
	(value) => {
		const state = getBenchState();
		if (state) {
			state.activeUI = normalizeActiveUI(value);
		}
		void nextTick(watchBannerVisibility);
	},
	{ immediate: true }
);
</script>

<template>
	<span hidden>{{ activeUI }}</span>
</template>
