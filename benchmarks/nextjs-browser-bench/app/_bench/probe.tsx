'use client';

import { useActiveUI, useSnapshot } from '@c15t/nextjs';
import { useEffect, useRef } from 'react';

import {
	getState,
	hasRunningAnimations,
	isElementVisible,
	isPolicySettled,
	readPromptKind,
} from './state';
import type { NextjsBenchScenario } from './state';

const BANNER_ELEMENT_TIMING_NAME = 'c15t-consent-banner';

interface BenchmarkElementTimingEntry extends PerformanceEntry {
	identifier?: string;
	renderTime?: number;
	loadTime?: number;
}

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

export const NextjsBenchmarkProbe = ({
	scenario,
}: {
	scenario: NextjsBenchScenario;
}) => {
	const activeUI = useActiveUI();
	const snapshot = useSnapshot();
	const renderRef = useRef(0);
	useEffect(() => {
		renderRef.current += 1;
		const state = getState(scenario);
		if (state) {
			state.renderCount = renderRef.current;
			state.overrides = { ...snapshot.overrides };
			state.privacySignals = snapshot.privacySignals;
			state.location = snapshot.location
				? {
						countryCode: snapshot.location.countryCode,
						regionCode: snapshot.location.regionCode,
					}
				: null;
			state.hasStoredChoice = Boolean(snapshot.explicitChoice);
		}
	});

	useEffect(() => {
		const current = getState(scenario);
		if (!current) {
			return;
		}
		current.mountCount += 1;
	}, [scenario]);

	useEffect(() => {
		const current = getState(scenario);
		if (!current) {
			return;
		}

		if (current.cls === undefined) {
			current.cls = 0;
		}
		try {
			const observer = new PerformanceObserver((list) => {
				const latest = getState(scenario);
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
			observer.observe({ buffered: true, type: 'layout-shift' });
			return () => observer.disconnect();
		} catch {
			// PerformanceObserver is optional in benchmark browsers.
		}
	}, [scenario]);

	useEffect(() => {
		const current = getState(scenario);
		if (!current) {
			return;
		}

		const ui = activeUI ?? 'none';
		current.activeUI = ui;
		if (current.activeUiHistory.at(-1) !== ui) {
			current.activeUiHistory.push(ui);
		}
		current.promptKind = readPromptKind(snapshot);
		if (current.promptSettledMs === undefined && isPolicySettled(snapshot)) {
			current.promptSettledMs = performance.now();
		}
		current.overrides = { ...snapshot.overrides };
		current.privacySignals = snapshot.privacySignals;
		current.location = snapshot.location
			? {
					countryCode: snapshot.location.countryCode,
					regionCode: snapshot.location.regionCode,
				}
			: null;
		current.hasStoredChoice = Boolean(snapshot.explicitChoice);
		if (current.bannerVisibleMs !== undefined || activeUI !== 'banner') {
			return;
		}

		let frameId = 0;
		const check = () => {
			const latest = getState(scenario);
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
			if (
				ready &&
				!hasRunningAnimations(bannerRoot) &&
				!hasRunningAnimations(acceptButton)
			) {
				latest.bannerVisibleMs = performance.now();
				latest.bannerPaintMs = readBannerPaintMs();
				return;
			}

			frameId = window.requestAnimationFrame(check);
		};

		frameId = window.requestAnimationFrame(check);
		return () => window.cancelAnimationFrame(frameId);
	}, [activeUI, scenario, snapshot]);

	return null;
};
