'use client';

import {
	configureConsentManager,
	createConsentManagerStore,
	deleteConsentFromStorage,
	generateSubjectId,
	saveConsentToStorage,
} from '@c15t/core';
import type { Script } from '@c15t/core';
import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import type { ReactNode } from 'react';

import { getScenarioScripts } from './fixtures';
import type { ScriptLifecycleScenarioConfig } from './fixtures';
import {
	getBenchState,
	incrementCounter,
	listDomPresence,
	normalizeIds,
	nowMs,
} from './state';
import type { ScriptBenchState } from './state';

type Store = ReturnType<typeof createConsentManagerStore>;
type StoreState = ReturnType<Store['getState']>;
type StoreStateWithReload = StoreState & {
	reloadScript: (scriptId: string) => unknown;
};

interface ScriptLifecycleContextValue {
	config: ScriptLifecycleScenarioConfig;
	ready: boolean;
	state: ScriptBenchState | null;
	runScenarioAction: () => Promise<void>;
}

const ScriptLifecycleContext =
	createContext<ScriptLifecycleContextValue | null>(null);

const sameIds = function sameIds(
	actual: string[],
	expected: string[]
): boolean {
	const left = normalizeIds(actual);
	const right = normalizeIds(expected);
	return (
		left.length === right.length &&
		left.every((value, index) => value === right[index])
	);
};

const updateDomPresence = function updateDomPresence(
	state: ScriptBenchState,
	scriptIds: string[]
): void {
	state.domPresenceById = listDomPresence(scriptIds);
};

const markIfReady = function markIfReady(
	state: ScriptBenchState,
	config: ScriptLifecycleScenarioConfig,
	phase: 'initial' | 'final'
): boolean {
	updateDomPresence(state, config.scriptIds);

	const expectedLoaded =
		phase === 'initial'
			? config.expectedInitialLoadedIds
			: config.expectedFinalLoadedIds;
	const expectedDom =
		phase === 'initial'
			? config.expectedInitialDomIds
			: config.expectedFinalDomIds;
	const expectedActiveUI =
		phase === 'initial'
			? config.expectedInitialActiveUI
			: config.expectedFinalActiveUI;

	return (
		state.activeUI === expectedActiveUI &&
		sameIds(state.loadedIds, expectedLoaded) &&
		config.scriptIds.every(
			(id) => (state.domPresenceById[id] ?? false) === expectedDom.includes(id)
		)
	);
};

const hasStandardLoads = function hasStandardLoads(state: ScriptBenchState) {
	return (
		(state.loadEventCounts['fixture-standard-head'] ?? 0) >= 1 &&
		(state.loadEventCounts['fixture-standard-body'] ?? 0) >= 1 &&
		(state.loadEventCounts['fixture-inline'] ?? 0) >= 1
	);
};

const hasReloadedTarget = function hasReloadedTarget(
	state: ScriptBenchState,
	config: ScriptLifecycleScenarioConfig
) {
	return (
		state.reloadCount >= 1 &&
		(state.loadEventCounts[config.reloadTargetId ?? 'fixture-standard-head'] ??
			0) >= 2
	);
};

const hasCallbackOnlyCycle = function hasCallbackOnlyCycle(
	state: ScriptBenchState
) {
	return (
		(state.beforeLoadEventCounts['fixture-callback-only'] ?? 0) >= 1 &&
		(state.loadEventCounts['fixture-callback-only'] ?? 0) >= 1 &&
		(state.domPresenceById['fixture-callback-only'] ?? false) === false
	);
};

const evaluateCompletion = function evaluateCompletion(
	state: ScriptBenchState,
	config: ScriptLifecycleScenarioConfig
): void {
	if (
		!state.completionMarkers.initialReady &&
		markIfReady(state, config, 'initial')
	) {
		state.completionMarkers.initialReady = true;
	}

	if (!state.completionMarkers.initialReady) {
		return;
	}

	const isFinalReady = markIfReady(state, config, 'final');

	switch (config.name) {
		case 'grant-standard': {
			if (isFinalReady && hasStandardLoads(state)) {
				state.completionMarkers[config.completionMarker] = true;
			}
			return;
		}
		case 'revoke-standard': {
			if (isFinalReady) {
				state.completionMarkers[config.completionMarker] = true;
			}
			return;
		}
		case 'reload-single': {
			if (isFinalReady && hasReloadedTarget(state, config)) {
				state.completionMarkers[config.completionMarker] = true;
			}
			return;
		}
		case 'callback-only-toggle': {
			if (isFinalReady && hasCallbackOnlyCycle(state)) {
				state.completionMarkers[config.completionMarker] = true;
			}
			return;
		}
		case 'always-load-retain':
		case 'persist-after-revoked': {
			if (isFinalReady) {
				state.completionMarkers[config.completionMarker] = true;
			}
			break;
		}
		default:
			break;
	}
};

const augmentScripts = function augmentScripts(
	config: ScriptLifecycleScenarioConfig,
	onStateChange: () => void
): Script[] {
	return getScenarioScripts(config).map((script) => ({
		...script,
		onBeforeLoad(info) {
			const state = getBenchState(config.name);
			if (!state) {
				return;
			}
			incrementCounter(state.beforeLoadEventCounts, info.id);
			onStateChange();
		},
		onConsentChange(info) {
			const state = getBenchState(config.name);
			if (!state) {
				return;
			}
			incrementCounter(state.consentChangeEventCounts, info.id);
			onStateChange();
		},
		onLoad(info) {
			const state = getBenchState(config.name);
			if (!state) {
				return;
			}
			incrementCounter(state.loadEventCounts, info.id);
			onStateChange();
		},
	}));
};

export const ScriptLifecycleProvider = ({
	children,
	config,
}: {
	children: ReactNode;
	config: ScriptLifecycleScenarioConfig;
}) => {
	const storeRef = useRef<Store | null>(null);
	const [ready, setReady] = useState(false);
	const [currentState, setCurrentState] = useState<ScriptBenchState | null>(
		() => getBenchState(config.name) ?? null
	);

	useEffect(() => {
		let disposed = false;
		let unsubscribe: (() => void) | undefined;

		const syncState = () => {
			const store = storeRef.current;
			const state = getBenchState(config.name);
			if (!store || !state) {
				return;
			}

			const current = store.getState();
			state.activeUI = current.activeUI;
			state.loadedIds = normalizeIds(current.getLoadedScriptIds());
			updateDomPresence(state, config.scriptIds);
			evaluateCompletion(state, config);
			setCurrentState({ ...state });
		};

		const initialize = async () => {
			deleteConsentFromStorage();
			try {
				window.localStorage.clear();
				window.sessionStorage.clear();
			} catch {
				// Storage may be unavailable in the benchmark browser.
			}

			const state = getBenchState(config.name);
			if (!state) {
				return;
			}

			state.recordScriptExecution = (id: string) => {
				state.scriptEvents[id] = nowMs();
				updateDomPresence(state, config.scriptIds);
				evaluateCompletion(state, config);
				setCurrentState({ ...state });
			};

			if (config.initialConsent === 'all') {
				saveConsentToStorage({
					consentInfo: {
						subjectId: generateSubjectId(),
						time: Date.now(),
					},
					consents: {
						experience: true,
						functionality: true,
						marketing: true,
						measurement: true,
						necessary: true,
					},
				});
			}

			const manager = configureConsentManager({
				backendURL: '/api/bench-consent',
				mode: 'c15t',
			});
			const store = createConsentManagerStore(manager, {
				callbacks: {
					onError(info) {
						const latest = getBenchState(config.name);
						if (!latest) {
							return;
						}
						latest.errors.push(
							typeof info?.error === 'string'
								? info.error
								: 'Script lifecycle benchmark error'
						);
						setCurrentState({ ...latest });
					},
				},
				initialConsentCategories: [
					'necessary',
					'functionality',
					'experience',
					'marketing',
					'measurement',
				],
				reloadOnConsentRevoked: false,
			});
			storeRef.current = store;

			await store.getState().initConsentManager();
			store.getState().setScripts(augmentScripts(config, syncState));

			unsubscribe = store.subscribe(syncState);
			syncState();
			if (!disposed) {
				setReady(true);
			}
		};

		void initialize();

		return () => {
			disposed = true;
			unsubscribe?.();
			storeRef.current = null;
		};
	}, [config]);

	const value = useMemo<ScriptLifecycleContextValue>(() => {
		const runScenarioAction = async () => {
			const store = storeRef.current;
			const state = getBenchState(config.name);
			if (!store || !state) {
				return;
			}

			switch (config.name) {
				case 'grant-standard':
				case 'callback-only-toggle':
					state.consentSaveCount += 1;
					await store.getState().saveConsents('all');
					break;
				case 'revoke-standard':
				case 'always-load-retain':
				case 'persist-after-revoked':
					state.consentSaveCount += 1;
					await store.getState().saveConsents('necessary');
					break;
				case 'reload-single':
					state.reloadCount += 1;
					(store.getState() as StoreStateWithReload).reloadScript(
						config.reloadTargetId ?? 'fixture-standard-head'
					);
					break;
				default:
					return;
			}

			const current = store.getState();
			state.activeUI = current.activeUI;
			state.loadedIds = normalizeIds(current.getLoadedScriptIds());
			updateDomPresence(state, config.scriptIds);
			evaluateCompletion(state, config);
			setCurrentState({ ...state });
		};

		return {
			config,
			ready,
			runScenarioAction,
			state: currentState,
		};
	}, [config, currentState, ready]);

	return (
		<ScriptLifecycleContext.Provider value={value}>
			{children}
		</ScriptLifecycleContext.Provider>
	);
};

export const useScriptLifecycleBench =
	function useScriptLifecycleBench(): ScriptLifecycleContextValue {
		const value = useContext(ScriptLifecycleContext);
		if (!value) {
			throw new Error(
				'useScriptLifecycleBench must be used within ScriptLifecycleProvider'
			);
		}
		return value;
	};
