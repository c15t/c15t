'use client';

import type { PolicyBenchFixtureName } from '@c15t/benchmarking/policy-fixtures';

export type PolicyBenchScenario =
	| 'policy-fresh'
	| 'policy-reject'
	| 'policy-notice'
	| 'policy-none'
	| 'policy-repeat';

export interface PolicyHydrationMeasurement {
	/** Mean microseconds per synchronous `hydrate()` call, one entry per round. */
	hydrateUs: number[];
	hydrateCallCount: number;
	hydrateSuccessCount: number;
	/** Whether every kernel in the first round applied the stored record. */
	hydratedFromStorage: boolean;
	/** Cookie or localStorage writes observed during hydration. */
	writeCount: number;
	/** Where the kernel landed after hydration, for the runner's assertions. */
	activeUI: string;
	promptKind: string | null;
	hasStoredChoice: boolean | null;
}

export interface PolicyBenchState {
	scenario: PolicyBenchScenario;
	fixture: PolicyBenchFixtureName;
	startedAtMs: number;
	mountCount: number;
	/** Probe commits observed so far. */
	renderCount: number;
	/** Probe commits observed when the prompt became ready. */
	renderCountAtReady?: number;
	activeUI: string;
	/** Distinct `activeUI` values in the order the probe saw them. */
	activeUiHistory: string[];
	/** First moment the prompt state was settled and, if shown, visible. */
	promptReadyMs?: number;
	promptShown: boolean;
	/** Prompt requirement kind when the source exposes one. */
	promptKind: string | null;
	promptReason: string | null;
	/** Whether the settled snapshot reports an explicit stored choice. */
	hasStoredChoice: boolean | null;
	onChoiceRecordedCount: number;
	onErrorCount: number;
	measureHydration?: (
		iterations: number
	) => Promise<PolicyHydrationMeasurement>;
}

declare global {
	interface Window {
		__c15tPolicyBench?: PolicyBenchState;
	}
}

export const getPolicyBenchState = function getPolicyBenchState(
	scenario: PolicyBenchScenario,
	fixture: PolicyBenchFixtureName
): PolicyBenchState | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}
	if (
		!window.__c15tPolicyBench ||
		window.__c15tPolicyBench.scenario !== scenario ||
		window.__c15tPolicyBench.fixture !== fixture
	) {
		window.__c15tPolicyBench = {
			activeUI: 'none',
			activeUiHistory: [],
			fixture,
			hasStoredChoice: null,
			mountCount: 0,
			onChoiceRecordedCount: 0,
			onErrorCount: 0,
			promptKind: null,
			promptReason: null,
			promptShown: false,
			renderCount: 0,
			scenario,
			startedAtMs: performance.now(),
		};
	}
	return window.__c15tPolicyBench;
};

/**
 * Read the prompt requirement from a snapshot when the installed source
 * exposes one (the #1025 contract), without depending on its type.
 */
export const readPromptRequirement = function readPromptRequirement(
	snapshot: unknown
): { kind: string | null; reason: string | null } {
	const requirement = (snapshot as { promptRequirement?: unknown })
		?.promptRequirement;
	if (!requirement || typeof requirement !== 'object') {
		return { kind: null, reason: null };
	}
	const record = requirement as { kind?: unknown; reason?: unknown };
	return {
		kind: typeof record.kind === 'string' ? record.kind : null,
		reason: typeof record.reason === 'string' ? record.reason : null,
	};
};

/**
 * Whether the snapshot carries an explicit stored choice. Reads the
 * `explicitChoice` field of the #1025 contract first and falls back to the
 * pre-contract `hasConsented` flag.
 */
export const readStoredChoice = function readStoredChoice(
	snapshot: unknown
): boolean | null {
	const record = snapshot as {
		explicitChoice?: { categories?: Record<string, unknown> } | null;
		hasConsented?: unknown;
	};
	if (record && 'explicitChoice' in record) {
		const categories = record.explicitChoice?.categories;
		return !!categories && Object.keys(categories).length > 0;
	}
	if (record && typeof record.hasConsented === 'boolean') {
		return record.hasConsented;
	}
	return null;
};

/**
 * Whether policy resolution has finished for this snapshot: the
 * provisional placeholder is gone and a resolved policy, a resolution
 * status, or a prompt requirement is present.
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
