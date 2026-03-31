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
				return;
			}

			frameId = window.requestAnimationFrame(check);
		};

		frameId = window.requestAnimationFrame(check);
		return () => window.cancelAnimationFrame(frameId);
	}, [activeUI, scenario]);

	return null;
}
