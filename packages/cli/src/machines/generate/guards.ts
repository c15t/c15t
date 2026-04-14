/**
 * Guard functions for the generate state machine
 *
 * Guards are pure functions that determine whether a transition should occur.
 */

import type { GenerateMachineContext, GenerateMachineEvent } from './types';

/**
 * Check if preflight checks passed
 */
export function preflightPassed({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.preflightPassed;
}

/**
 * Check if preflight checks failed
 */
export function preflightFailed({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return !context.preflightPassed;
}

/**
 * Check if mode was provided as CLI argument
 */
export function hasModeArg({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.modeArg !== null;
}

/**
 * Check if selected mode is hosted (including legacy aliases)
 */
export function isHostedMode({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return (
		context.selectedMode === 'hosted' ||
		context.selectedMode === 'c15t' ||
		context.selectedMode === 'self-hosted'
	);
}

/**
 * Check if selected mode is offline
 */
export function isOfflineMode({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.selectedMode === 'offline';
}

/**
 * Check if selected mode is self-hosted
 */
export function isSelfHostedMode({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.selectedMode === 'self-hosted';
}

/**
 * Check if selected mode is custom
 */
export function isCustomMode({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.selectedMode === 'custom';
}

/**
 * Check if mode requires a backend URL (hosted, legacy c15t, or self-hosted)
 */
export function modeRequiresBackend({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return (
		context.selectedMode === 'hosted' ||
		context.selectedMode === 'c15t' ||
		context.selectedMode === 'self-hosted'
	);
}

/**
 * Check if mode doesn't require a backend URL (offline or custom)
 */
export function modeNoBackend({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return (
		context.selectedMode === 'offline' || context.selectedMode === 'custom'
	);
}

/**
 * Check if framework is Next.js
 */
export function isNextjs({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.framework?.pkg === '@c15t/nextjs';
}

/**
 * Check if framework is React (not Next.js)
 */
export function isReact({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.framework?.pkg === '@c15t/react';
}

/**
 * Check if framework is core c15t (no React)
 */
export function isCore({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.framework?.pkg === 'c15t';
}

/**
 * Check if framework has React
 */
export function hasReact({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.framework?.hasReact ?? false;
}

/**
 * Check if project has Tailwind CSS
 */
export function hasTailwind({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.framework?.tailwindVersion !== null;
}

/**
 * Check if backend URL has been set
 */
export function hasBackendURL({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.backendURL !== null && context.backendURL !== '';
}

/**
 * Check if user selected expanded UI style
 */
export function isExpandedUIStyle({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.uiStyle === 'expanded';
}

/**
 * Check if user confirmed dependency installation
 */
export function installConfirmed({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.installConfirmed;
}

/**
 * Check if installation succeeded
 */
export function installSucceeded({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.installSucceeded;
}

/**
 * Check if there are files to rollback
 */
export function hasFilesToRollback({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.filesCreated.length > 0 || context.filesModified.length > 0;
}

/**
 * Check if there are dependencies to install
 */
export function hasDependencies({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.dependenciesToAdd.length > 0;
}

/**
 * Check if there are errors recorded
 */
export function hasErrors({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return context.errors.length > 0;
}

/**
 * Check if cleanup is needed (files created or modified)
 */
export function needsCleanup({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return (
		!context.cleanupDone &&
		(context.filesCreated.length > 0 || context.filesModified.length > 0)
	);
}

/**
 * Check if SSR should be prompted (Next.js with backend)
 */
export function shouldPromptSSR({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return (
		context.framework?.pkg === '@c15t/nextjs' &&
		modeRequiresBackend({ context })
	);
}

/**
 * Check if UI style should be prompted (Next.js or React)
 */
export function shouldPromptUIStyle({
	context,
}: {
	context: GenerateMachineContext;
}): boolean {
	return (
		context.framework?.pkg === '@c15t/nextjs' ||
		context.framework?.pkg === '@c15t/react'
	);
}

/**
 * All guards exported as a single object for use in machine definition
 */
export const guards = {
	preflightPassed,
	preflightFailed,
	hasModeArg,
	isHostedMode,
	isOfflineMode,
	isSelfHostedMode,
	isCustomMode,
	modeRequiresBackend,
	modeNoBackend,
	isNextjs,
	isReact,
	isCore,
	hasReact,
	hasTailwind,
	hasBackendURL,
	isExpandedUIStyle,
	installConfirmed,
	installSucceeded,
	hasFilesToRollback,
	hasDependencies,
	hasErrors,
	needsCleanup,
	shouldPromptSSR,
	shouldPromptUIStyle,
};
