'use client';

export type ReactBenchScenario =
	| 'banner-css'
	| 'baseline'
	| 'css-banner-modules'
	| 'full-ui'
	| 'headless'
	| 'repeat-visitor';

export interface BenchInteractionMetrics {
	acceptAllMs?: number;
	rejectAllMs?: number;
	openPreferencesMs?: number;
	savePreferencesMs?: number;
}

export interface BenchState {
	scenario: ReactBenchScenario;
	startedAtMs: number;
	mountCount: number;
	renderCount: number;
	activeUI: string;
	cls?: number;
	bannerReadyMs?: number;
	bannerVisibleMs?: number;
	bannerPaintMs?: number | null;
	onChoiceRecordedCount: number;
	onErrorCount: number;
	interaction: BenchInteractionMetrics;
}

declare global {
	interface Window {
		__c15tReactBench?: BenchState;
	}
}

export const nowMs = function nowMs(): number {
	return performance.now();
};

export const getBenchState = function getBenchState(
	scenario: ReactBenchScenario
): BenchState | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}

	if (
		!window.__c15tReactBench ||
		window.__c15tReactBench.scenario !== scenario
	) {
		window.__c15tReactBench = {
			activeUI: 'none',
			interaction: {},
			mountCount: 0,
			onChoiceRecordedCount: 0,
			onErrorCount: 0,
			renderCount: 0,
			scenario,
			startedAtMs: nowMs(),
		};
	}

	return window.__c15tReactBench;
};

export const markInteraction = function markInteraction(
	scenario: ReactBenchScenario,
	key: keyof BenchInteractionMetrics
): void {
	const state = getBenchState(scenario);
	if (!state || state.interaction[key] !== undefined) {
		return;
	}

	state.interaction[key] = nowMs();
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
