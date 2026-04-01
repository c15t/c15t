'use client';

export type NextjsBenchScenario =
	| 'client'
	| 'ssr'
	| 'prefetch'
	| 'repeat-visitor';

export interface NextjsBenchState {
	scenario: NextjsBenchScenario;
	startedAtMs: number;
	mountCount: number;
	renderCount: number;
	activeUI: string;
	onBannerFetchedMs?: number;
	bannerReadyMs?: number;
	bannerVisibleMs?: number;
	onBannerFetchedCount: number;
	onConsentSetCount: number;
	onErrorCount: number;
	openPreferencesMs?: number;
	savePreferencesMs?: number;
}

declare global {
	interface Window {
		__c15tNextBench?: NextjsBenchState;
	}
}

export function getState(
	scenario: NextjsBenchScenario
): NextjsBenchState | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}

	if (!window.__c15tNextBench || window.__c15tNextBench.scenario !== scenario) {
		window.__c15tNextBench = {
			scenario,
			startedAtMs: performance.now(),
			mountCount: 0,
			renderCount: 0,
			activeUI: 'none',
			onBannerFetchedCount: 0,
			onConsentSetCount: 0,
			onErrorCount: 0,
		};
	}

	return window.__c15tNextBench;
}

export function isElementVisible(element: Element): boolean {
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

export function hasRunningAnimations(element: Element): boolean {
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
