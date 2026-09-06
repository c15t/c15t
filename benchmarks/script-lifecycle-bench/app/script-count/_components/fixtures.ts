import type { Script } from '@c15t/core/modules/script-loader';

export type ScriptCountVersion = 'v3';

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
	recordScriptExecution: (id: string) => void;
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

export const normalizeCount = function normalizeCount(
	value: string | string[] | undefined
): number {
	const raw = Array.isArray(value) ? value[0] : value;
	const parsed = Number(raw ?? 5);
	if (!Number.isFinite(parsed)) {
		return 5;
	}
	return Math.max(1, Math.min(100, Math.trunc(parsed)));
};

export const makeScripts = function makeScripts(count: number): Script[] {
	return Array.from({ length: count }, (_, index) => {
		const id = `script-count-${index + 1}`;
		return {
			anonymizeId: false,
			attributes: {
				'data-bench-script-id': id,
			},
			category: categories[index % categories.length],
			id,
			src: `/api/bench-script/${id}`,
			target: index % 2 === 0 ? 'head' : 'body',
		};
	});
};

export const createInitialBenchState = function createInitialBenchState(
	count: number
): ScriptCountBenchState {
	const executed = new Set<string>();

	const state: ScriptCountBenchState = {
		actionStartedAtMs: null,
		activeUI: 'unknown',
		complete: false,
		completedAtMs: null,
		count,
		domIds: [],
		errors: [],
		executedIds: [],
		initialReady: false,
		loadedIds: [],
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
		scriptEvents: {},
		version: 'v3',
	};

	return state;
};

export const listDomIds = function listDomIds(count: number): string[] {
	return makeScripts(count)
		.map((script) => script.id)
		.filter(
			(id) => document.querySelector(`[data-bench-script-id="${id}"]`) !== null
		)
		.sort((left, right) => left.localeCompare(right));
};
