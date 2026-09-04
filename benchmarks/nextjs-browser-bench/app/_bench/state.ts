'use client';

export type NextjsBenchScenario =
	| 'baseline'
	| 'client'
	| 'manifest-client'
	| 'manifest-ssr'
	| 'repeat-visitor'
	| 'rsc-ssr'
	| 'ssr';

export interface NextjsBenchState {
	scenario: NextjsBenchScenario;
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
	openPreferencesMs?: number;
	savePreferencesMs?: number;
}

declare global {
	interface Window {
		__c15tNextBench?: NextjsBenchState;
	}
}

export const getState = function getState(
	scenario: NextjsBenchScenario
): NextjsBenchState | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}

	if (!window.__c15tNextBench || window.__c15tNextBench.scenario !== scenario) {
		window.__c15tNextBench = {
			activeUI: 'none',
			mountCount: 0,
			onBannerFetchedCount: 0,
			onConsentSetCount: 0,
			onErrorCount: 0,
			renderCount: 0,
			scenario,
			startedAtMs: performance.now(),
		};
	}

	return window.__c15tNextBench;
};

export const isElementVisible = function isElementVisible(
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

export const hasRunningAnimations = function hasRunningAnimations(
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
