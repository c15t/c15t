'use client';

import type { ScriptLifecycleScenarioName } from './fixtures';

export interface ScriptBenchState {
	scenario: ScriptLifecycleScenarioName;
	startedAtMs: number;
	consentSaveCount: number;
	activeUI: string;
	loadedIds: string[];
	loadEventCounts: Record<string, number>;
	beforeLoadEventCounts: Record<string, number>;
	consentChangeEventCounts: Record<string, number>;
	domPresenceById: Record<string, boolean>;
	reloadCount: number;
	errors: string[];
	scriptEvents: Record<string, number>;
	completionMarkers: Record<string, boolean>;
	recordScriptExecution?: (id: string) => void;
}

declare global {
	interface Window {
		__c15tScriptBench?: ScriptBenchState;
	}
}

export function nowMs(): number {
	return performance.now();
}

export function getBenchState(
	scenario: ScriptLifecycleScenarioName
): ScriptBenchState | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}

	if (
		!window.__c15tScriptBench ||
		window.__c15tScriptBench.scenario !== scenario
	) {
		window.__c15tScriptBench = {
			scenario,
			startedAtMs: nowMs(),
			consentSaveCount: 0,
			activeUI: 'none',
			loadedIds: [],
			loadEventCounts: {},
			beforeLoadEventCounts: {},
			consentChangeEventCounts: {},
			domPresenceById: {},
			reloadCount: 0,
			errors: [],
			scriptEvents: {},
			completionMarkers: {},
		};
	}

	return window.__c15tScriptBench;
}

export function incrementCounter(
	record: Record<string, number>,
	key: string
): void {
	record[key] = (record[key] ?? 0) + 1;
}

export function listDomPresence(ids: string[]): Record<string, boolean> {
	return ids.reduce<Record<string, boolean>>((acc, id) => {
		acc[id] = document.querySelector(`[data-bench-script-id="${id}"]`) !== null;
		return acc;
	}, {});
}

export function normalizeIds(ids: string[]): string[] {
	return [...ids].sort((left, right) => left.localeCompare(right));
}
