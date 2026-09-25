'use client';

import { useActiveUI, useSetActiveUI, useSnapshot } from 'c15t/react';
import { useEffect } from 'react';

/** Page state the harness reads through `window.__c15tConsumerBench`. */
export interface ConsumerProbeState {
	activeUI: string;
	hasStoredChoice: boolean;
	/** Hydrated readiness: active banner with a visible accept button. */
	bannerReadyMs?: number;
	/** First moment policy resolution settled, banner or not. */
	promptSettledMs?: number;
	onChoiceRecordedCount: number;
}

declare global {
	interface Window {
		__c15tConsumerBench?: ConsumerProbeState;
	}
}

export const getProbeState = function getProbeState():
	| ConsumerProbeState
	| undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}
	window.__c15tConsumerBench ??= {
		activeUI: 'none',
		hasStoredChoice: false,
		onChoiceRecordedCount: 0,
	};
	return window.__c15tConsumerBench;
};

const isVisible = function isVisible(element: Element | null): boolean {
	if (!(element instanceof HTMLElement)) {
		return false;
	}
	const rect = element.getBoundingClientRect();
	const style = window.getComputedStyle(element);
	return (
		rect.width > 0 &&
		rect.height > 0 &&
		style.display !== 'none' &&
		style.visibility !== 'hidden' &&
		Number(style.opacity) >= 0.99
	);
};

const isSettled = function isSettled(snapshot: unknown): boolean {
	const record = snapshot as {
		policyPending?: unknown;
		policy?: unknown;
		resolution?: unknown;
		promptRequirement?: unknown;
	};
	if (record?.policyPending === true) {
		return false;
	}
	const present = (value: unknown) => value !== undefined && value !== null;
	return (
		present(record?.policy) ||
		present(record?.resolution) ||
		present(record?.promptRequirement)
	);
};

/** Records consent milestones without rendering anything. */
export const ConsumerProbe = () => {
	const activeUI = useActiveUI();
	const snapshot = useSnapshot();

	useEffect(() => {
		const state = getProbeState();
		if (!state) {
			return;
		}
		state.activeUI = activeUI ?? 'none';
		state.hasStoredChoice = Boolean(snapshot.explicitChoice);
		if (state.promptSettledMs === undefined && isSettled(snapshot)) {
			state.promptSettledMs = performance.now();
		}
		if (state.bannerReadyMs !== undefined || activeUI !== 'banner') {
			return;
		}
		let frame = 0;
		const check = () => {
			const latest = getProbeState();
			if (!latest || latest.bannerReadyMs !== undefined) {
				return;
			}
			const root = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			const accept = document.querySelector(
				'[data-testid="consent-banner-accept-button"]'
			);
			const running = [root, accept].some(
				(element) =>
					element instanceof HTMLElement &&
					element
						.getAnimations()
						.some((animation) => animation.playState === 'running')
			);
			if (isVisible(root) && isVisible(accept) && !running) {
				latest.bannerReadyMs = performance.now();
				return;
			}
			frame = requestAnimationFrame(check);
		};
		frame = requestAnimationFrame(check);
		return () => cancelAnimationFrame(frame);
	}, [activeUI, snapshot]);

	return null;
};

/** Opens the preference dialog, which loads the deferred dialog chunk. */
export const OpenPreferencesButton = () => {
	const setActiveUI = useSetActiveUI();
	return (
		<button
			id="open-preferences"
			onClick={() => setActiveUI('dialog')}
			type="button"
		>
			Privacy settings
		</button>
	);
};
