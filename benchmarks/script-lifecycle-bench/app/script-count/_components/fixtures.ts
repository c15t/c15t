import type { Script as V2Script } from 'c15t';
import type { Script as V3Script } from 'c15t/v3/modules/script-loader';

export type ScriptCountVersion = 'v2' | 'v3';

export interface ScriptCountBenchState {
	version: ScriptCountVersion;
	count: number;
	actionStartedAtMs: number | null;
	completedAtMs: number | null;
	activeUI: string;
	loadedIds: string[];
	executedIds: string[];
	domIds: string[];
	errors: string[];
	scriptEvents: Record<string, number>;
	initialReady: boolean;
	complete: boolean;
	recordScriptExecution(id: string): void;
}

declare global {
	interface Window {
		__c15tScriptCountBench?: ScriptCountBenchState;
		__c15tGetScriptCountBenchState?: () => ScriptCountBenchState | null;
	}
}

const categories = [
	'measurement',
	'marketing',
	'functionality',
	'experience',
] as const;

export function normalizeCount(value: string | string[] | undefined): number {
	const raw = Array.isArray(value) ? value[0] : value;
	const parsed = Number(raw ?? 5);
	if (!Number.isFinite(parsed)) return 5;
	return Math.max(1, Math.min(100, Math.trunc(parsed)));
}

export function normalizeVersion(
	value: string | string[] | undefined
): ScriptCountVersion {
	return value === 'v3' ? 'v3' : 'v2';
}

export function makeScripts(count: number): V2Script[] {
	return Array.from({ length: count }, (_, index) => {
		const id = `script-count-${index + 1}`;
		return {
			id,
			src: `/api/bench-script/${id}`,
			category: categories[index % categories.length],
			target: index % 2 === 0 ? 'head' : 'body',
			anonymizeId: false,
			attributes: {
				'data-bench-script-id': id,
			},
		};
	});
}

export function makeV3Scripts(count: number): V3Script[] {
	return makeScripts(count) as V3Script[];
}

export function createInitialBenchState(
	version: ScriptCountVersion,
	count: number
): ScriptCountBenchState {
	const executed = new Set<string>();

	const state: ScriptCountBenchState = {
		version,
		count,
		actionStartedAtMs: null,
		completedAtMs: null,
		activeUI: 'unknown',
		loadedIds: [],
		executedIds: [],
		domIds: [],
		errors: [],
		scriptEvents: {},
		initialReady: false,
		complete: false,
		recordScriptExecution(id: string) {
			state.scriptEvents[id] = performance.now();
			executed.add(id);
			state.executedIds = Array.from(executed).sort((left, right) =>
				left.localeCompare(right)
			);
			if (state.executedIds.length >= state.count && !state.complete) {
				state.completedAtMs = performance.now();
				state.complete = true;
			}
		},
	};

	return state;
}

export function listDomIds(count: number): string[] {
	return makeScripts(count)
		.map((script) => script.id)
		.filter(
			(id) => document.querySelector(`[data-bench-script-id="${id}"]`) !== null
		)
		.sort((left, right) => left.localeCompare(right));
}
