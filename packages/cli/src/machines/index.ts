/**
 * State machines for CLI commands
 *
 * Exports all state machines and utilities.
 */

export { actions as generateActions } from './generate/actions';
export {
	checkDependenciesActor,
	dependencyInstallActor,
	getManualInstallCommand,
} from './generate/actors/dependencies';
export {
	fileGenerationActor,
	rollbackActor,
} from './generate/actors/file-generation';
// Generate actors
export {
	displayPreflightFailure,
	displayPreflightResults,
	preflightActor,
} from './generate/actors/preflight';
export {
	backendOptionsActor,
	frontendOptionsActor,
	githubStarActor,
	hostedModeActor,
	installConfirmActor,
	modeSelectionActor,
	PromptCancelledError,
	scriptsOptionActor,
} from './generate/actors/prompts';
export { guards as generateGuards } from './generate/guards';
// Generate machine
export { type GenerateMachine, generateMachine } from './generate/machine';
export type { RunGenerateOptions } from './generate/runner';

// Generate runner
export { runGenerateMachine, setupCancelHandler } from './generate/runner';
export type {
	ExpandedTheme,
	GenerateMachineContext,
	GenerateMachineEvent,
	GenerateMachineStateValue,
	PreflightCheckResult,
	UIStyle,
} from './generate/types';
export { createInitialContext } from './generate/types';
export * from './persistence';
export * from './telemetry-plugin';
// Core types and utilities
export * from './types';
