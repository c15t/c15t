import type { Script } from '@c15t/core';

const getDefined = <Value>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

export type ScriptLifecycleScenarioName =
	| 'grant-standard'
	| 'revoke-standard'
	| 'reload-single'
	| 'callback-only-toggle'
	| 'always-load-retain'
	| 'persist-after-revoked';

export type ScriptLifecyclePrimaryMetric =
	| 'grantStandardLifecycleMs'
	| 'revokeStandardLifecycleMs'
	| 'reloadSingleScriptMs'
	| 'callbackOnlyToggleMs'
	| 'alwaysLoadRetentionMs'
	| 'persistAfterRevokedMs';

export interface ScriptLifecycleScenarioConfig {
	name: ScriptLifecycleScenarioName;
	metric: ScriptLifecyclePrimaryMetric;
	initialConsent: 'fresh' | 'all';
	actionLabel: string;
	completionMarker: string;
	scriptIds: string[];
	expectedInitialLoadedIds: string[];
	expectedInitialDomIds: string[];
	expectedFinalLoadedIds: string[];
	expectedFinalDomIds: string[];
	expectedInitialActiveUI: 'none' | 'banner' | 'dialog';
	expectedFinalActiveUI: 'none' | 'banner' | 'dialog';
	reloadTargetId?: string;
}

const benchAttribute = (id: string) => ({
	'data-bench-script-id': id,
});

export const scriptFixtures: Record<string, Script> = {
	'fixture-always-load': {
		alwaysLoad: true,
		anonymizeId: false,
		attributes: benchAttribute('fixture-always-load'),
		category: 'measurement',
		id: 'fixture-always-load',
		src: '/api/bench-script/fixture-always-load',
	},
	'fixture-callback-only': {
		anonymizeId: false,
		callbackOnly: true,
		category: 'experience',
		id: 'fixture-callback-only',
	},
	'fixture-inline': {
		anonymizeId: false,
		attributes: benchAttribute('fixture-inline'),
		category: 'functionality',
		id: 'fixture-inline',
		textContent:
			'window.__c15tScriptBench?.recordScriptExecution?.("fixture-inline");',
	},
	'fixture-persist': {
		anonymizeId: false,
		attributes: benchAttribute('fixture-persist'),
		category: 'marketing',
		id: 'fixture-persist',
		persistAfterConsentRevoked: true,
		src: '/api/bench-script/fixture-persist',
	},
	'fixture-standard-body': {
		anonymizeId: false,
		attributes: benchAttribute('fixture-standard-body'),
		category: 'marketing',
		id: 'fixture-standard-body',
		src: '/api/bench-script/fixture-standard-body',
		target: 'body',
	},
	'fixture-standard-head': {
		anonymizeId: false,
		attributes: benchAttribute('fixture-standard-head'),
		category: 'measurement',
		id: 'fixture-standard-head',
		src: '/api/bench-script/fixture-standard-head',
		target: 'head',
	},
};

export const scenarioConfigs: Record<
	ScriptLifecycleScenarioName,
	ScriptLifecycleScenarioConfig
> = {
	'always-load-retain': {
		actionLabel: 'Revoke With alwaysLoad',
		completionMarker: 'always-load-retain-complete',
		expectedFinalActiveUI: 'none',
		expectedFinalDomIds: ['fixture-always-load'],
		expectedFinalLoadedIds: ['fixture-always-load'],
		expectedInitialActiveUI: 'none',
		expectedInitialDomIds: ['fixture-always-load', 'fixture-standard-head'],
		expectedInitialLoadedIds: ['fixture-always-load', 'fixture-standard-head'],
		initialConsent: 'all',
		metric: 'alwaysLoadRetentionMs',
		name: 'always-load-retain',
		scriptIds: ['fixture-standard-head', 'fixture-always-load'],
	},
	'callback-only-toggle': {
		actionLabel: 'Toggle Callback Script',
		completionMarker: 'callback-only-toggle-complete',
		expectedFinalActiveUI: 'none',
		expectedFinalDomIds: [],
		expectedFinalLoadedIds: ['fixture-callback-only'],
		expectedInitialActiveUI: 'banner',
		expectedInitialDomIds: [],
		expectedInitialLoadedIds: [],
		initialConsent: 'fresh',
		metric: 'callbackOnlyToggleMs',
		name: 'callback-only-toggle',
		scriptIds: ['fixture-callback-only'],
	},
	'grant-standard': {
		actionLabel: 'Grant Standard Scripts',
		completionMarker: 'grant-standard-complete',
		expectedFinalActiveUI: 'none',
		expectedFinalDomIds: [
			'fixture-inline',
			'fixture-standard-body',
			'fixture-standard-head',
		],
		expectedFinalLoadedIds: [
			'fixture-inline',
			'fixture-standard-body',
			'fixture-standard-head',
		],
		expectedInitialActiveUI: 'banner',
		expectedInitialDomIds: [],
		expectedInitialLoadedIds: [],
		initialConsent: 'fresh',
		metric: 'grantStandardLifecycleMs',
		name: 'grant-standard',
		scriptIds: [
			'fixture-standard-head',
			'fixture-standard-body',
			'fixture-inline',
		],
	},
	'persist-after-revoked': {
		actionLabel: 'Revoke Persisted Script',
		completionMarker: 'persist-after-revoked-complete',
		expectedFinalActiveUI: 'none',
		expectedFinalDomIds: ['fixture-persist'],
		expectedFinalLoadedIds: [],
		expectedInitialActiveUI: 'none',
		expectedInitialDomIds: ['fixture-persist'],
		expectedInitialLoadedIds: ['fixture-persist'],
		initialConsent: 'all',
		metric: 'persistAfterRevokedMs',
		name: 'persist-after-revoked',
		scriptIds: ['fixture-persist'],
	},
	'reload-single': {
		actionLabel: 'Reload Single Script',
		completionMarker: 'reload-single-complete',
		expectedFinalActiveUI: 'none',
		expectedFinalDomIds: ['fixture-standard-head'],
		expectedFinalLoadedIds: ['fixture-standard-head'],
		expectedInitialActiveUI: 'none',
		expectedInitialDomIds: ['fixture-standard-head'],
		expectedInitialLoadedIds: ['fixture-standard-head'],
		initialConsent: 'all',
		metric: 'reloadSingleScriptMs',
		name: 'reload-single',
		reloadTargetId: 'fixture-standard-head',
		scriptIds: ['fixture-standard-head'],
	},
	'revoke-standard': {
		actionLabel: 'Revoke Standard Scripts',
		completionMarker: 'revoke-standard-complete',
		expectedFinalActiveUI: 'none',
		expectedFinalDomIds: [],
		expectedFinalLoadedIds: [],
		expectedInitialActiveUI: 'none',
		expectedInitialDomIds: [
			'fixture-inline',
			'fixture-standard-body',
			'fixture-standard-head',
		],
		expectedInitialLoadedIds: [
			'fixture-inline',
			'fixture-standard-body',
			'fixture-standard-head',
		],
		initialConsent: 'all',
		metric: 'revokeStandardLifecycleMs',
		name: 'revoke-standard',
		scriptIds: [
			'fixture-standard-head',
			'fixture-standard-body',
			'fixture-inline',
		],
	},
};

export const getScenarioConfig = function getScenarioConfig(
	value: string | string[] | undefined
): ScriptLifecycleScenarioConfig {
	const name = Array.isArray(value) ? value[0] : value;
	return (
		scenarioConfigs[
			(name as ScriptLifecycleScenarioName) || 'grant-standard'
		] ?? scenarioConfigs['grant-standard']
	);
};

export const getScenarioScripts = function getScenarioScripts(
	config: ScriptLifecycleScenarioConfig
): Script[] {
	return config.scriptIds.map((id) => getDefined(scriptFixtures[id]));
};

export const allScenarioConfigs = Object.values(scenarioConfigs);
