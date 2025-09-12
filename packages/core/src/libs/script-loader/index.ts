/**
 * Script loader module for managing scripts based on user consent.
 *
 * @packageDocumentation
 */

export { googleTagManager } from '../../scripts/google-tag-manager';
// Re-export script utilities
export { metaPixel } from '../../scripts/meta-pixel';
export { posthogConsent } from '../../scripts/posthog';
// Re-export core functionality
export {
	clearAllScripts,
	getLoadedScriptIds,
	isScriptLoaded,
	loadScripts,
	reloadScript,
	unloadScripts,
	updateScripts,
} from './core';
// Re-export store integration
export { createScriptManager } from './store';
// Re-export types
export type { Script, ScriptCallbackInfo, ScriptUpdateResult } from './types';
// Re-export utility functions
export { generateRandomScriptId } from './utils';
