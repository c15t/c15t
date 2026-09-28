export type TanstackBenchScenario =
	| 'baseline'
	| 'client'
	| 'manifest-client'
	| 'manifest-ssr'
	| 'manifest-ssr-proxy'
	| 'manifest-ssr-root'
	| 'ssr';

/**
 * Same fields as the Next arm's `__c15tNextBench` so the runners and the
 * cross-framework report can read both without translation.
 */
export interface TanstackBenchState {
	scenario: TanstackBenchScenario;
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
	/** First moment policy resolution settled, banner or not. */
	promptSettledMs?: number;
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
		__c15tTanstackBench?: TanstackBenchState;
	}
}

export const getState = function getState(
	scenario: TanstackBenchScenario
): TanstackBenchState | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}

	if (
		!window.__c15tTanstackBench ||
		window.__c15tTanstackBench.scenario !== scenario
	) {
		window.__c15tTanstackBench = {
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

	return window.__c15tTanstackBench;
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

/**
 * Whether policy resolution has finished: the provisional placeholder is
 * gone and a resolved policy, resolution, or prompt requirement exists.
 * Saved-consent visits never show a banner, so they wait on this instead.
 */
export const isPolicySettled = function isPolicySettled(
	snapshot: unknown
): boolean {
	const record = snapshot as {
		policyPending?: unknown;
		policy?: unknown;
		resolution?: unknown;
		promptRequirement?: unknown;
	};
	if (record?.policyPending === true) {
		return false;
	}
	return (
		(record?.policy !== undefined && record?.policy !== null) ||
		(record?.resolution !== undefined && record?.resolution !== null) ||
		(record?.promptRequirement !== undefined &&
			record?.promptRequirement !== null)
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
