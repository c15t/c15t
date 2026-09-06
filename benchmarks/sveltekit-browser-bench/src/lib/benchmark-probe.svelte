<script
	lang="ts"
	module
>
	/**
	 * In-page probe for the SvelteKit browser bench.
	 *
	 * Publishes one object on `window.__c15tSvelteBench` that the Playwright
	 * runner polls. `bannerReadyMs` / `bannerVisibleMs` use the same
	 * rAF-settled definition as the Nuxt probe — banner root *and* accept
	 * button laid out, painted and not animating — so the two suites'
	 * numbers mean the same thing.
	 */
	import type { ConsentSnapshot } from '@c15t/svelte';

	/** Scenario names the SvelteKit bench app implements. */
	export type SvelteBenchScenario =
		| 'ssr'
		| 'ssr-manifest'
		| 'client'
		| 'client-manifest'
		| 'repeat-visitor';

	/** The shape the runner reads out of the page. */
	export interface SvelteBenchState {
		scenario: string;
		startedAtMs: number;
		mountCount: number;
		renderCount: number;
		activeUI: string;
		overrides: {
			country?: string;
			region?: string;
			language?: string;
			gpc?: boolean;
		};
		location: {
			countryCode?: string | null;
			regionCode?: string | null;
		} | null;
		hasConsented: boolean;
		bannerReadyMs?: number;
		bannerVisibleMs?: number;
		bannerPaintMs?: number | null;
		onBannerFetchedMs?: number;
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
			__c15tSvelteBench?: SvelteBenchState;
		}
	}

	const BANNER_ELEMENT_TIMING_NAME = 'c15t-consent-banner';

	const isElementVisible = function isElementVisible(
		element: Element
	): boolean {
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
	};

	const hasRunningAnimations = function hasRunningAnimations(
		element: Element
	): boolean {
		if (
			!(element instanceof HTMLElement) ||
			typeof element.getAnimations !== 'function'
		) {
			return false;
		}
		return element
			.getAnimations()
			.some((animation) => animation.playState === 'running');
	};

	const readBannerPaintMs = function readBannerPaintMs(): number | null {
		const entries = performance
			.getEntriesByType('element')
			.filter(
				(entry): entry is BenchmarkElementTimingEntry =>
					(entry as BenchmarkElementTimingEntry).identifier ===
					BANNER_ELEMENT_TIMING_NAME
			);
		const entry = entries.at(-1);
		if (!entry) {
			return null;
		}
		for (const value of [entry.renderTime, entry.loadTime, entry.startTime]) {
			if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
				return value;
			}
		}
		return null;
	};
</script>

<script lang="ts">
	import { getConsentKernel } from '@c15t/svelte';
	import { onMount } from 'svelte';

	let { scenario }: { scenario: SvelteBenchScenario } = $props();

	const kernel = getConsentKernel();

	const getState = function getState(): SvelteBenchState {
		if (
			!window.__c15tSvelteBench ||
			window.__c15tSvelteBench.scenario !== scenario
		) {
			window.__c15tSvelteBench = {
				activeUI: 'none',
				hasConsented: false,
				location: null,
				mountCount: 0,
				onBannerFetchedCount: 0,
				onConsentSetCount: 0,
				onErrorCount: 0,
				overrides: {},
				renderCount: 0,
				scenario,
				startedAtMs: performance.now(),
			};
		}
		return window.__c15tSvelteBench;
	};

	/**
	 * Repeat visitors never see a banner, so "ready" is "the kernel resolved
	 * with stored consent and decided to show nothing". Recorded as `0` for
	 * the same reason the Nuxt probe does: there is no banner to wait for.
	 */
	const markRepeatVisitorReady = function markRepeatVisitorReady(
		state: SvelteBenchState,
		snapshot: ConsentSnapshot
	): void {
		if (scenario !== 'repeat-visitor') {
			return;
		}
		if (snapshot.hasConsented && (snapshot.activeUI ?? 'none') === 'none') {
			state.bannerReadyMs ??= 0;
			state.bannerVisibleMs ??= 0;
			state.bannerPaintMs ??= null;
		}
	};

	const watchBannerVisibility = function watchBannerVisibility(): void {
		const state = getState();
		if (state.bannerVisibleMs !== undefined || state.activeUI !== 'banner') {
			return;
		}

		const check = () => {
			const latest = getState();
			// The banner can be dismissed while this callback is pending —
			// the runner waits on `bannerReadyMs`, not `bannerVisibleMs`,
			// before clicking accept. Without this the loop keeps scheduling
			// a frame through the interaction and until the context closes.
			if (
				latest.bannerVisibleMs !== undefined ||
				latest.activeUI !== 'banner'
			) {
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

			if (
				ready &&
				!hasRunningAnimations(bannerRoot) &&
				!hasRunningAnimations(acceptButton)
			) {
				latest.bannerVisibleMs = performance.now();
				latest.bannerPaintMs = readBannerPaintMs();
				return;
			}

			window.requestAnimationFrame(check);
		};

		window.requestAnimationFrame(check);
	};

	const publish = function publish(snapshot: ConsentSnapshot): void {
		const state = getState();
		state.renderCount += 1;
		const nextActiveUI = snapshot.activeUI ?? 'none';
		if (snapshot.hasConsented && !state.hasConsented) {
			state.onConsentSetCount += 1;
		}
		if (snapshot.policy && state.onBannerFetchedMs === undefined) {
			state.onBannerFetchedCount += 1;
			state.onBannerFetchedMs = performance.now();
		}
		state.activeUI = nextActiveUI;
		state.hasConsented = snapshot.hasConsented;
		state.location = snapshot.location
			? {
					countryCode: snapshot.location.countryCode,
					regionCode: snapshot.location.regionCode,
				}
			: null;
		state.overrides = { ...snapshot.overrides };
		markRepeatVisitorReady(state, snapshot);
		watchBannerVisibility();
	};

	onMount(() => {
		getState().mountCount += 1;
		publish(kernel.getSnapshot());
		return kernel.subscribe(publish);
	});
</script>
