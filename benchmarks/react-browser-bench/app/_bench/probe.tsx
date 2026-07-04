'use client';

import { useConsentManager } from '@c15t/react';
import { useEffect, useRef } from 'react';
import {
	getBenchState,
	hasRunningAnimations,
	isElementVisible,
	nowMs,
	type ReactBenchScenario,
} from './state';

const BANNER_ELEMENT_TIMING_NAME = 'c15t-consent-banner';

interface BenchmarkElementTimingEntry extends PerformanceEntry {
	identifier?: string;
	renderTime?: number;
	loadTime?: number;
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
	return entry ? entry.renderTime || entry.loadTime || entry.startTime : null;
}

export function ReactBenchmarkProbe({
	scenario,
}: {
	scenario: ReactBenchScenario;
}) {
	const { activeUI } = useConsentManager();
	const renderRef = useRef(0);
	renderRef.current += 1;

	const state = getBenchState(scenario);
	if (state) {
		state.renderCount = renderRef.current;
	}

	useEffect(() => {
		const current = getBenchState(scenario);
		if (!current) {
			return;
		}
		current.mountCount += 1;
	}, [scenario]);

	useEffect(() => {
		const current = getBenchState(scenario);
		if (!current) {
			return;
		}

		current.cls = current.cls ?? 0;
		try {
			const observer = new PerformanceObserver((list) => {
				const latest = getBenchState(scenario);
				if (!latest) {
					return;
				}
				for (const entry of list.getEntries()) {
					const shift = entry as PerformanceEntry & {
						value?: number;
						hadRecentInput?: boolean;
					};
					if (!shift.hadRecentInput) {
						latest.cls = (latest.cls ?? 0) + (shift.value ?? 0);
					}
				}
			});
			observer.observe({ type: 'layout-shift', buffered: true });
			return () => observer.disconnect();
		} catch {
			return;
		}
	}, [scenario]);

	useEffect(() => {
		const current = getBenchState(scenario);
		if (!current) {
			return;
		}

		current.activeUI = activeUI;
		if (current.bannerVisibleMs !== undefined || activeUI !== 'banner') {
			return;
		}

		let frameId = 0;
		const check = () => {
			const latest = getBenchState(scenario);
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
				latest.bannerReadyMs = nowMs();
			}

			const visible =
				ready &&
				!hasRunningAnimations(bannerRoot) &&
				!hasRunningAnimations(acceptButton);

			if (visible) {
				latest.bannerVisibleMs = nowMs();
				latest.bannerPaintMs = readBannerPaintMs();
				return;
			}

			frameId = window.requestAnimationFrame(check);
		};

		frameId = window.requestAnimationFrame(check);
		return () => window.cancelAnimationFrame(frameId);
	}, [activeUI, scenario]);

	return null;
}
