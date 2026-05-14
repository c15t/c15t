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
export { emitScriptDebugEvent, subscribeToScriptDebugEvents } from './debug';
export { createScriptManager } from './store';
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
export { generateRandomScriptId } from './utils';
