'use client';

import type { ConsentSnapshot } from '@c15t/nextjs';

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
	privacySignals?: ConsentSnapshot['privacySignals'];
	location?: {
		countryCode?: string | null;
		regionCode?: string | null;
	} | null;
	hasStoredChoice?: boolean;
	/** Distinct `activeUI` values in the order the probe observed them. */
	activeUiHistory: string[];
	/** First moment policy resolution settled (any prompt state). */
	promptSettledMs?: number;
	/** Prompt requirement kind when the installed source exposes one. */
	promptKind?: string | null;
	cls?: number;
	bannerReadyMs?: number;
	bannerVisibleMs?: number;
	bannerPaintMs?: number | null;
	onChoiceRecordedCount: number;
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
			activeUiHistory: [],
			mountCount: 0,
			onChoiceRecordedCount: 0,
			onErrorCount: 0,
			renderCount: 0,
			scenario,
			startedAtMs: performance.now(),
		};
	}

	return window.__c15tNextBench;
};

/**
 * Whether policy resolution has finished for this snapshot: the
 * provisional placeholder is gone and a resolved policy, a resolution
 * status, or a prompt requirement is present. Reads the #1025 fields when
 * the installed source exposes them and the pre-contract fields otherwise.
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

export const readPromptKind = function readPromptKind(
	snapshot: unknown
): string | null {
	const requirement = (snapshot as { promptRequirement?: unknown })
		?.promptRequirement;
	if (!requirement || typeof requirement !== 'object') {
		return null;
	}
	const { kind } = requirement as { kind?: unknown };
	return typeof kind === 'string' ? kind : null;
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
