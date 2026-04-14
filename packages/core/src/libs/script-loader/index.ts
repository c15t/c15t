/**
 * Script loader module for managing scripts based on user consent.
 *
 * @packageDocumentation
 */

export type { IABConsentState, ScriptLoaderOptions } from './core';
export {
	clearAllScripts,
	getLoadedScriptIds,
	isScriptLoaded,
	loadScripts,
	reloadScript,
	unloadScripts,
	updateScripts,
} from './core';
export {
	emitScriptDebugEvent,
	subscribeToScriptDebugEvents,
} from './debug';
// Re-export store integration
export { createScriptManager } from './store';
// Re-export types
export type {
	Script,
	ScriptCallbackInfo,
	ScriptDebugAction,
	ScriptDebugEvent,
	ScriptDebugEventInput,
	ScriptDebugListener,
	ScriptDebugScope,
	ScriptDebugSource,
	ScriptLifecycleCallback,
	ScriptUpdateResult,
} from './types';
// Re-export utility functions
export { generateRandomScriptId } from './utils';
