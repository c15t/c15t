'use client';

import { useConsentManager } from '@c15t/nextjs';
import { useEffect, useRef } from 'react';
import {
	getState,
	hasRunningAnimations,
	isElementVisible,
	type NextjsBenchScenario,
} from './state';

export function NextjsBenchmarkProbe({
	scenario,
}: {
	scenario: NextjsBenchScenario;
}) {
	const { activeUI } = useConsentManager();
	const renderRef = useRef(0);
	renderRef.current += 1;

	const state = getState(scenario);
	if (state) {
		state.renderCount = renderRef.current;
	}

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

		current.activeUI = activeUI;
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
	}, [activeUI, scenario]);

	return null;
}
