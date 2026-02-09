/**
 * Actions for the generate state machine
 *
 * Actions are side-effect functions executed during state transitions.
 */

import type {
	FileModification,
	MachineError,
	StateHistoryEntry,
} from '../types';
import type { GenerateMachineContext, GenerateMachineEvent } from './types';

/**
 * Action arguments passed to assign functions
 */
interface ActionArgs {
	context: GenerateMachineContext;
	event: GenerateMachineEvent;
}

/**
 * Record state entry in history
 */
export function recordStateEntry({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	const entry: StateHistoryEntry = {
		state: 'unknown', // Will be set by the machine
		timestamp: Date.now(),
		event: event.type,
	};

	return {
		stateHistory: [...context.stateHistory, entry],
	};
}

/**
 * Set preflight results in context
 */
export function setPreflightResults({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'PREFLIGHT_COMPLETE') {
		return {};
	}

	return {
		preflightPassed: event.result.passed,
		preflightChecks: event.result.checks,
		projectRoot: event.result.projectRoot,
		framework: event.result.framework,
		packageManager: event.result.packageManager,
	};
}

/**
 * Set selected mode
 */
export function setSelectedMode({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'SELECT_MODE' && event.type !== 'MODE_SELECTED') {
		return {};
	}

	const mode = event.type === 'SELECT_MODE' ? event.mode : event.mode;

	return {
		selectedMode: mode,
	};
}

/**
 * Use mode from CLI argument
 */
export function useModeArg({
	context,
}: ActionArgs): Partial<GenerateMachineContext> {
	return {
		selectedMode: context.modeArg,
	};
}

/**
 * Set backend URL
 */
export function setBackendURL({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'BACKEND_URL_ENTERED') {
		return {};
	}

	return {
		backendURL: event.url,
	};
}

/**
 * Set backend options
 */
export function setBackendOptions({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'BACKEND_OPTIONS_COMPLETE') {
		return {};
	}

	return {
		useEnvFile: event.useEnvFile,
		proxyNextjs: event.proxyNextjs,
	};
}

/**
 * Set frontend UI options
 */
export function setFrontendOptions({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'FRONTEND_OPTIONS_COMPLETE') {
		return {};
	}

	return {
		enableSSR: event.enableSSR ?? context.enableSSR,
		enableDevTools: event.enableDevTools ?? context.enableDevTools,
		uiStyle: event.uiStyle,
		expandedTheme: event.expandedTheme ?? null,
	};
}

/**
 * Set scripts option
 */
export function setScriptsOption({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'SCRIPTS_OPTION_COMPLETE') {
		return {};
	}

	return {
		addScripts: event.addScripts,
	};
}

/**
 * Record files created/modified for potential rollback
 */
export function recordFiles({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'FILES_GENERATED') {
		return {};
	}

	return {
		filesCreated: [...context.filesCreated, ...event.filesCreated],
		filesModified: [...context.filesModified, ...event.filesModified],
	};
}

/**
 * Add dependencies to install
 */
export function addDependencies({
	context,
}: ActionArgs): Partial<GenerateMachineContext> {
	const deps: string[] = [];

	// Add framework package
	if (context.framework?.pkg) {
		deps.push(context.framework.pkg);
	}

	// Add scripts package if selected
	if (context.addScripts) {
		deps.push('@c15t/scripts');
	}

	// Add dev tools package if selected
	if (context.enableDevTools) {
		deps.push('@c15t/dev-tools');
	}

	return {
		dependenciesToAdd: [...new Set([...context.dependenciesToAdd, ...deps])],
	};
}

/**
 * Set install confirmation
 */
export function setInstallConfirmation({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'CONFIRM_INSTALL') {
		return {};
	}

	return {
		installConfirmed: event.confirmed,
		installAttempted: event.confirmed,
	};
}

/**
 * Set install result
 */
export function setInstallResult({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'INSTALL_COMPLETE') {
		return {};
	}

	return {
		installSucceeded: event.success,
	};
}

/**
 * Record an error
 */
export function recordError({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'FILE_GENERATION_ERROR') {
		return {};
	}

	const error: MachineError = {
		state: 'fileGeneration',
		error: event.error,
		timestamp: Date.now(),
	};

	return {
		errors: [...context.errors, error],
	};
}

/**
 * Set cancel reason
 */
export function setCancelReason({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'CANCEL') {
		return {};
	}

	return {
		cancelReason: event.reason ?? 'User cancelled',
	};
}

/**
 * Mark cleanup as done
 */
export function markCleanupDone({
	context,
}: ActionArgs): Partial<GenerateMachineContext> {
	return {
		cleanupDone: true,
	};
}

/**
 * Clear files after rollback
 */
export function clearFiles({
	context,
}: ActionArgs): Partial<GenerateMachineContext> {
	return {
		filesCreated: [],
		filesModified: [],
	};
}

/**
 * Reset context for retry
 */
export function resetForRetry({
	context,
}: ActionArgs): Partial<GenerateMachineContext> {
	return {
		preflightPassed: false,
		preflightChecks: [],
		errors: [],
	};
}

/**
 * All actions exported for use in machine definition
 */
export const actions = {
	recordStateEntry,
	setPreflightResults,
	setSelectedMode,
	useModeArg,
	setBackendURL,
	setBackendOptions,
	setFrontendOptions,
	setScriptsOption,
	recordFiles,
	addDependencies,
	setInstallConfirmation,
	setInstallResult,
	recordError,
	setCancelReason,
	markCleanupDone,
	clearFiles,
	resetForRetry,
};

/**
 * Perform file rollback - restore modified files and delete created files
 *
 * This is an async action that should be called as a service/actor
 */
export async function performRollback(
	filesCreated: string[],
	filesModified: FileModification[]
): Promise<void> {
	const fs = await import('node:fs/promises');

	// Delete created files
	for (const filePath of filesCreated) {
		try {
			await fs.unlink(filePath);
		} catch {
			// File may not exist, ignore
		}
	}

	// Restore modified files from backup
	for (const mod of filesModified) {
		try {
			await fs.writeFile(mod.path, mod.backup, 'utf-8');
		} catch {
			// Best effort restore
		}
	}
}

/**
 * Perform cleanup - clear any temporary state
 */
export async function performCleanup(
	filesCreated: string[],
	filesModified: FileModification[]
): Promise<void> {
	// Rollback is the cleanup for now
	await performRollback(filesCreated, filesModified);
}
