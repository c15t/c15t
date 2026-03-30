'use client';

import { useConsentManager } from '@c15t/nextjs';
import { useEffect } from 'react';

export type BenchmarkVariant = 'client' | 'ssr' | 'prefetch';

type BenchmarkEventName =
	| 'mount'
	| 'on-banner-fetched'
	| 'on-consent-set'
	| 'on-error'
	| 'banner-visible';

type BenchmarkEvent = {
	name: BenchmarkEventName;
	atMs: number;
};

type BenchState = {
	variant: BenchmarkVariant;
	startedAtMs: number;
	mountCount: number;
	activeUI: string;
	onBannerFetchedMs?: number;
	bannerVisibleMs?: number;
	onBannerFetchedCount: number;
	onConsentSetCount: number;
	onErrorCount: number;
	events: BenchmarkEvent[];
};

declare global {
	interface Window {
		__c15tBench?: BenchState;
	}
}

function nowMs(): number {
	return performance.now();
}

function createState(variant: BenchmarkVariant): BenchState {
	return {
		variant,
		startedAtMs: nowMs(),
		mountCount: 0,
		activeUI: 'none',
		onBannerFetchedCount: 0,
		onConsentSetCount: 0,
		onErrorCount: 0,
		events: [],
	};
}

function getState(variant: BenchmarkVariant): BenchState | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}

	if (!window.__c15tBench || window.__c15tBench.variant !== variant) {
		window.__c15tBench = createState(variant);
	}

	return window.__c15tBench;
}

function pushEvent(state: BenchState, name: BenchmarkEventName): void {
	state.events.push({ name, atMs: nowMs() });
	if (state.events.length > 100) {
		state.events = state.events.slice(-100);
	}
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
	if (style.display === 'none' || style.visibility === 'hidden') {
		return false;
	}

	return Number(style.opacity) >= 0.99;
}

function hasRunningAnimations(element: Element): boolean {
	if (!(element instanceof HTMLElement) || !element.getAnimations) {
		return false;
	}

	return element
		.getAnimations()
		.some((animation) => animation.playState === 'running');
}

export function createBenchmarkCallbacks(variant: BenchmarkVariant) {
	return {
		onBannerFetched() {
			const state = getState(variant);
			if (!state) {
				return;
			}
			state.onBannerFetchedCount += 1;
			if (state.onBannerFetchedMs === undefined) {
				state.onBannerFetchedMs = nowMs();
			}
			pushEvent(state, 'on-banner-fetched');
		},
		onConsentSet() {
			const state = getState(variant);
			if (!state) {
				return;
			}
			state.onConsentSetCount += 1;
			pushEvent(state, 'on-consent-set');
		},
		onError() {
			const state = getState(variant);
			if (!state) {
				return;
			}
			state.onErrorCount += 1;
			pushEvent(state, 'on-error');
		},
	};
}

export function BenchmarkProbe({ variant }: { variant: BenchmarkVariant }) {
	const { activeUI } = useConsentManager();

	useEffect(() => {
		const state = getState(variant);
		if (!state) {
			return;
		}
		state.mountCount += 1;
		pushEvent(state, 'mount');
	}, [variant]);

	useEffect(() => {
		const state = getState(variant);
		if (!state) {
			return;
		}

		state.activeUI = activeUI;
		if (activeUI !== 'banner' || state.bannerVisibleMs !== undefined) {
			return;
		}

		let frameId: number | undefined;
		const checkBannerVisibility = () => {
			const currentState = getState(variant);
			if (!currentState || currentState.bannerVisibleMs !== undefined) {
				return;
			}

			const bannerRoot = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			const acceptButton = document.querySelector(
				'[data-testid="consent-banner-accept-button"]'
			);

			const isReady =
				!!bannerRoot &&
				!!acceptButton &&
				isElementVisible(bannerRoot) &&
				isElementVisible(acceptButton) &&
				!hasRunningAnimations(bannerRoot) &&
				!hasRunningAnimations(acceptButton);

			if (isReady) {
				currentState.bannerVisibleMs = nowMs();
				pushEvent(currentState, 'banner-visible');
				return;
			}

			frameId = window.requestAnimationFrame(checkBannerVisibility);
		};

		frameId = window.requestAnimationFrame(checkBannerVisibility);
		return () => {
			if (frameId !== undefined) {
				window.cancelAnimationFrame(frameId);
			}
		};
	}, [activeUI, variant]);

	return null;
}
