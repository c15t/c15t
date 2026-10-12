/**
 * Guard functions for the generate state machine
 *
 * Guards are pure functions that determine whether a transition should occur.
 */

import type { GenerateMachineContext } from './types';

/**
 * Check if preflight checks passed
 */
export const preflightPassed = function preflightPassed({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.preflightPassed;
};

/**
 * Check if preflight checks failed
 */
export const preflightFailed = function preflightFailed({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return !context.preflightPassed;
};

/**
 * Check if mode was provided as CLI argument
 */
export const hasModeArg = function hasModeArg({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.modeArg !== null;
};

/**
 * Check if selected mode is hosted (including legacy aliases)
 */
export const isHostedMode = function isHostedMode({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return (
		context.selectedMode === 'hosted' ||
		context.selectedMode === 'c15t' ||
		context.selectedMode === 'self-hosted'
	);
};

/**
 * Check if selected mode is offline
 */
export const isOfflineMode = function isOfflineMode({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.selectedMode === 'offline';
};

/**
 * Check if selected mode is self-hosted
 */
export const isSelfHostedMode = function isSelfHostedMode({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.selectedMode === 'self-hosted';
};

/**
 * Check if selected mode is custom
 */
export const isCustomMode = function isCustomMode({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.selectedMode === 'custom';
};

/**
 * Check if mode requires a backend URL (hosted, legacy c15t, or self-hosted)
 */
export const modeRequiresBackend = function modeRequiresBackend({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return (
		context.selectedMode === 'hosted' ||
		context.selectedMode === 'c15t' ||
		context.selectedMode === 'self-hosted'
	);
};

/**
 * Check if mode doesn't require a backend URL (offline or custom)
 */
export const modeNoBackend = function modeNoBackend({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return (
		context.selectedMode === 'offline' || context.selectedMode === 'custom'
	);
};

/**
 * Check if framework is Next.js
 */
export const isNextjs = function isNextjs({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.framework?.pkg === 'c15t/next';
};

/**
 * Check if framework is React (not Next.js)
 */
export const isReact = function isReact({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.framework?.pkg === 'c15t/react';
};

/**
 * Check if framework is core c15t (no React)
 */
export const isCore = function isCore({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.framework?.pkg === 'c15t';
};

/**
 * Check if framework has React
 */
export const hasReact = function hasReact({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.framework?.hasReact ?? false;
};

/**
 * Check if project has Tailwind CSS
 */
export const hasTailwind = function hasTailwind({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.framework?.tailwindVersion !== null;
};

/**
 * Check if backend URL has been set
 */
export const hasBackendURL = function hasBackendURL({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.backendURL !== null && context.backendURL !== '';
};

/**
 * Check if user selected expanded UI style
 */
export const isExpandedUIStyle = function isExpandedUIStyle({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.uiStyle === 'expanded';
};

/**
 * Check if user confirmed dependency installation
 */
export const installConfirmed = function installConfirmed({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.installConfirmed;
};

/**
 * Check if installation succeeded
 */
export const installSucceeded = function installSucceeded({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.installSucceeded;
};

/**
 * Check if there are files to rollback
 */
export const hasFilesToRollback = function hasFilesToRollback({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.filesCreated.length > 0 || context.filesModified.length > 0;
};

/**
 * Check if there are dependencies to install
 */
export const hasDependencies = function hasDependencies({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.dependenciesToAdd.length > 0;
};

/**
 * Check if there are errors recorded
 */
export const hasErrors = function hasErrors({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.errors.length > 0;
};

/**
 * Check if cleanup is needed (files created or modified)
 */
export const needsCleanup = function needsCleanup({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return (
		!context.cleanupDone &&
		(context.filesCreated.length > 0 || context.filesModified.length > 0)
	);
};

/**
 * Check if SSR should be prompted (Next.js with backend)
 */
export const shouldPromptSSR = function shouldPromptSSR({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return (
		context.framework?.pkg === 'c15t/next' && modeRequiresBackend({ context })
	);
};

/**
 * Check if UI style should be prompted (Next.js or React)
 */
export const shouldPromptUIStyle = function shouldPromptUIStyle({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return (
		context.framework?.pkg === 'c15t/next' ||
		context.framework?.pkg === 'c15t/react'
	);
};

/**
 * All guards exported as a single object for use in machine definition
 */
export const guards = {
	hasBackendURL,
	hasDependencies,
	hasErrors,
	hasFilesToRollback,
	hasModeArg,
	hasReact,
	hasTailwind,
	installConfirmed,
	installSucceeded,
	isCore,
	isCustomMode,
	isExpandedUIStyle,
	isHostedMode,
	isNextjs,
	isOfflineMode,
	isReact,
	isSelfHostedMode,
	modeNoBackend,
	modeRequiresBackend,
	needsCleanup,
	preflightFailed,
	preflightPassed,
	shouldPromptSSR,
	shouldPromptUIStyle,
};
