export type BannerVisibilityVersion = 'v2' | 'v3';

export interface BannerVisibilityBenchState {
	version: BannerVisibilityVersion;
	activeUI: string;
	renderCount: number;
	mountMs?: number;
	bannerReadyMs?: number;
	bannerVisibleMs?: number;
	errorCount: number;
	errors: string[];
}

declare global {
	interface Window {
		__c15tBannerVisibilityBench?: BannerVisibilityBenchState;
	}
}

export const normalizeBannerVersion = function normalizeBannerVersion(
	value: string | null | undefined
): BannerVisibilityVersion {
	return value === 'v3' ? 'v3' : 'v2';
};

export const getBenchState = function getBenchState(
	version: BannerVisibilityVersion
): BannerVisibilityBenchState | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}
	if (
		!window.__c15tBannerVisibilityBench ||
		window.__c15tBannerVisibilityBench.version !== version
	) {
		window.__c15tBannerVisibilityBench = {
			activeUI: 'unknown',
			errorCount: 0,
			errors: [],
			renderCount: 0,
			version,
		};
	}
	return window.__c15tBannerVisibilityBench;
};

const isElementVisible = function isElementVisible(element: Element): boolean {
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

export const observeBannerVisibility = function observeBannerVisibility(
	version: BannerVisibilityVersion,
	activeUI: string
): () => void {
	const state = getBenchState(version);
	if (!state) {
		return () => {
			/* empty */
		};
	}
	state.activeUI = activeUI;
	if (state.bannerVisibleMs !== undefined || activeUI !== 'banner') {
		return () => {
			/* empty */
		};
	}

	let frameId = 0;
	const check = () => {
		const latest = getBenchState(version);
		if (!latest || latest.bannerVisibleMs !== undefined) {
			return;
		}

		const bannerRoot = document.querySelector(
			'[data-testid="consent-banner-root"]'
		);
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
			return;
		}

		frameId = window.requestAnimationFrame(check);
	};

	frameId = window.requestAnimationFrame(check);
	return () => window.cancelAnimationFrame(frameId);
};
