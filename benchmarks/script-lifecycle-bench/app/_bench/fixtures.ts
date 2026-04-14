import type { Script } from 'c15t';

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
	'fixture-standard-head': {
		id: 'fixture-standard-head',
		src: '/api/bench-script/fixture-standard-head',
		category: 'measurement',
		target: 'head',
		anonymizeId: false,
		attributes: benchAttribute('fixture-standard-head'),
	},
	'fixture-standard-body': {
		id: 'fixture-standard-body',
		src: '/api/bench-script/fixture-standard-body',
		category: 'marketing',
		target: 'body',
		anonymizeId: false,
		attributes: benchAttribute('fixture-standard-body'),
	},
	'fixture-inline': {
		id: 'fixture-inline',
		textContent:
			'window.__c15tScriptBench?.recordScriptExecution?.("fixture-inline");',
		category: 'functionality',
		anonymizeId: false,
		attributes: benchAttribute('fixture-inline'),
	},
	'fixture-callback-only': {
		id: 'fixture-callback-only',
		callbackOnly: true,
		category: 'experience',
		anonymizeId: false,
	},
	'fixture-persist': {
		id: 'fixture-persist',
		src: '/api/bench-script/fixture-persist',
		category: 'marketing',
		persistAfterConsentRevoked: true,
		anonymizeId: false,
		attributes: benchAttribute('fixture-persist'),
	},
	'fixture-always-load': {
		id: 'fixture-always-load',
		src: '/api/bench-script/fixture-always-load',
		category: 'measurement',
		alwaysLoad: true,
		anonymizeId: false,
		attributes: benchAttribute('fixture-always-load'),
	},
};

export const scenarioConfigs: Record<
	ScriptLifecycleScenarioName,
	ScriptLifecycleScenarioConfig
> = {
	'grant-standard': {
		name: 'grant-standard',
		metric: 'grantStandardLifecycleMs',
		initialConsent: 'fresh',
		actionLabel: 'Grant Standard Scripts',
		completionMarker: 'grant-standard-complete',
		scriptIds: [
			'fixture-standard-head',
			'fixture-standard-body',
			'fixture-inline',
		],
		expectedInitialLoadedIds: [],
		expectedInitialDomIds: [],
		expectedFinalLoadedIds: [
			'fixture-inline',
			'fixture-standard-body',
			'fixture-standard-head',
		],
		expectedFinalDomIds: [
			'fixture-inline',
			'fixture-standard-body',
			'fixture-standard-head',
		],
		expectedInitialActiveUI: 'banner',
		expectedFinalActiveUI: 'none',
	},
	'revoke-standard': {
		name: 'revoke-standard',
		metric: 'revokeStandardLifecycleMs',
		initialConsent: 'all',
		actionLabel: 'Revoke Standard Scripts',
		completionMarker: 'revoke-standard-complete',
		scriptIds: [
			'fixture-standard-head',
			'fixture-standard-body',
			'fixture-inline',
		],
		expectedInitialLoadedIds: [
			'fixture-inline',
			'fixture-standard-body',
			'fixture-standard-head',
		],
		expectedInitialDomIds: [
			'fixture-inline',
			'fixture-standard-body',
			'fixture-standard-head',
		],
		expectedFinalLoadedIds: [],
		expectedFinalDomIds: [],
		expectedInitialActiveUI: 'none',
		expectedFinalActiveUI: 'none',
	},
	'reload-single': {
		name: 'reload-single',
		metric: 'reloadSingleScriptMs',
		initialConsent: 'all',
		actionLabel: 'Reload Single Script',
		completionMarker: 'reload-single-complete',
		scriptIds: ['fixture-standard-head'],
		expectedInitialLoadedIds: ['fixture-standard-head'],
		expectedInitialDomIds: ['fixture-standard-head'],
		expectedFinalLoadedIds: ['fixture-standard-head'],
		expectedFinalDomIds: ['fixture-standard-head'],
		expectedInitialActiveUI: 'none',
		expectedFinalActiveUI: 'none',
		reloadTargetId: 'fixture-standard-head',
	},
	'callback-only-toggle': {
		name: 'callback-only-toggle',
		metric: 'callbackOnlyToggleMs',
		initialConsent: 'fresh',
		actionLabel: 'Toggle Callback Script',
		completionMarker: 'callback-only-toggle-complete',
		scriptIds: ['fixture-callback-only'],
		expectedInitialLoadedIds: [],
		expectedInitialDomIds: [],
		expectedFinalLoadedIds: ['fixture-callback-only'],
		expectedFinalDomIds: [],
		expectedInitialActiveUI: 'banner',
		expectedFinalActiveUI: 'none',
	},
	'always-load-retain': {
		name: 'always-load-retain',
		metric: 'alwaysLoadRetentionMs',
		initialConsent: 'all',
		actionLabel: 'Revoke With alwaysLoad',
		completionMarker: 'always-load-retain-complete',
		scriptIds: ['fixture-standard-head', 'fixture-always-load'],
		expectedInitialLoadedIds: ['fixture-always-load', 'fixture-standard-head'],
		expectedInitialDomIds: ['fixture-always-load', 'fixture-standard-head'],
		expectedFinalLoadedIds: ['fixture-always-load'],
		expectedFinalDomIds: ['fixture-always-load'],
		expectedInitialActiveUI: 'none',
		expectedFinalActiveUI: 'none',
	},
	'persist-after-revoked': {
		name: 'persist-after-revoked',
		metric: 'persistAfterRevokedMs',
		initialConsent: 'all',
		actionLabel: 'Revoke Persisted Script',
		completionMarker: 'persist-after-revoked-complete',
		scriptIds: ['fixture-persist'],
		expectedInitialLoadedIds: ['fixture-persist'],
		expectedInitialDomIds: ['fixture-persist'],
		expectedFinalLoadedIds: [],
		expectedFinalDomIds: ['fixture-persist'],
		expectedInitialActiveUI: 'none',
		expectedFinalActiveUI: 'none',
	},
};

export function getScenarioConfig(
	value: string | string[] | undefined
): ScriptLifecycleScenarioConfig {
	const name = Array.isArray(value) ? value[0] : value;
	return (
		scenarioConfigs[
			(name as ScriptLifecycleScenarioName) || 'grant-standard'
		] ?? scenarioConfigs['grant-standard']
	);
}

export function getScenarioScripts(
	config: ScriptLifecycleScenarioConfig
): Script[] {
	return config.scriptIds.map((id) => scriptFixtures[id]!);
}

export const allScenarioConfigs = Object.values(scenarioConfigs);
