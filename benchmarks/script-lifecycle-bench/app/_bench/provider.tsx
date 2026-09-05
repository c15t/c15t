'use client';

import {
	createConsentKernel,
	createHostedTransport,
	deleteConsentFromStorage,
} from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import type {
	Script,
	ScriptLoaderHandle,
} from '@c15t/core/modules/script-loader';
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
	const kernelRef = useRef<ConsentKernel | null>(null);
	const loaderRef = useRef<ScriptLoaderHandle | null>(null);
	const [ready, setReady] = useState(false);
	// Start from `null` on both server and client. Reading the browser
	// state in the initializer rendered a different `<pre>` on the client
	// than the server HTML carried, which React reported as a hydration
	// mismatch (#418) on every scenario load.
	const [currentState, setCurrentState] = useState<ScriptBenchState | null>(
		null
	);

	useEffect(() => {
		let disposed = false;
		let unsubscribe: (() => void) | undefined;

		const syncState = () => {
			const kernel = kernelRef.current;
			const loader = loaderRef.current;
			const state = getBenchState(config.name);
			if (!kernel || !loader || !state) {
				return;
			}

			const current = kernel.getSnapshot();
			state.activeUI = current.activeUI ?? 'none';
			state.loadedIds = normalizeIds(loader.getLoadedScriptIds());
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

			const hasInitialConsent = config.initialConsent === 'all';
			const kernel = createConsentKernel({
				transport: createHostedTransport({
					backendURL: '/api/bench-consent',
				}),
			});
			kernelRef.current = kernel;

			const initResult = await kernel.commands.init();
			if (!initResult.ok) {
				state.errors.push(String(initResult.error));
			}
			if (hasInitialConsent) {
				const saved = await kernel.commands.save('all');
				if (!saved.ok) {
					throw new Error('Failed to prepare saved-choice lifecycle fixture');
				}
			}
			loaderRef.current = createScriptLoader({
				kernel,
				scripts: augmentScripts(config, syncState),
			});

			unsubscribe = kernel.subscribe(syncState);
			syncState();
			if (!disposed) {
				setReady(true);
			}
		};

		void initialize();

		return () => {
			disposed = true;
			unsubscribe?.();
			loaderRef.current?.dispose();
			loaderRef.current = null;
			kernelRef.current = null;
		};
	}, [config]);

	const value = useMemo<ScriptLifecycleContextValue>(() => {
		const runScenarioAction = async () => {
			const kernel = kernelRef.current;
			const state = getBenchState(config.name);
			if (!kernel || !state) {
				return;
			}

			switch (config.name) {
				case 'grant-standard':
				case 'callback-only-toggle':
					state.consentSaveCount += 1;
					await kernel.commands.save('all');
					break;
				case 'revoke-standard':
				case 'always-load-retain':
				case 'persist-after-revoked':
					state.consentSaveCount += 1;
					await kernel.commands.save('none');
					break;
				case 'reload-single': {
					state.reloadCount += 1;
					loaderRef.current?.dispose();
					const syncReloadState = () => {
						const latest = getBenchState(config.name);
						if (!latest) {
							return;
						}
						latest.activeUI = kernel.getSnapshot().activeUI ?? 'none';
						latest.loadedIds = normalizeIds(
							loaderRef.current?.getLoadedScriptIds() ?? []
						);
						updateDomPresence(latest, config.scriptIds);
						evaluateCompletion(latest, config);
						setCurrentState({ ...latest });
					};
					loaderRef.current = createScriptLoader({
						kernel,
						scripts: augmentScripts(config, syncReloadState),
					});
					break;
				}
				default:
					return;
			}

			const current = kernel.getSnapshot();
			state.activeUI = current.activeUI ?? 'none';
			state.loadedIds = normalizeIds(
				loaderRef.current?.getLoadedScriptIds() ?? []
			);
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
