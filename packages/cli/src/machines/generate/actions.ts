/**
 * Actions for the generate state machine
 *
 * Actions are side-effect functions executed during state transitions.
 */

import { UMBRELLA_PACKAGE } from '~/constants';

import type {
	FileModification,
	MachineError,
	StateHistoryEntry,
} from '../types';
import type { GenerateMachineContext, GenerateMachineEvent } from './types';

const normalizeMode = function normalizeMode(
	mode: GenerateMachineContext['selectedMode']
): GenerateMachineContext['selectedMode'] {
	if (mode === 'c15t') {
		return 'hosted';
	}

	return mode;
};

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
export const recordStateEntry = function recordStateEntry({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	const entry: StateHistoryEntry = {
		event: event.type,
		// Will be set by the machine
		state: 'unknown',
		timestamp: Date.now(),
	};

	return {
		stateHistory: [...context.stateHistory, entry],
	};
};

/**
 * Set preflight results in context
 */
export const setPreflightResults = function setPreflightResults({
	context: _context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'PREFLIGHT_COMPLETE') {
		return {};
	}

	return {
		framework: event.result.framework,
		packageManager: event.result.packageManager,
		preflightChecks: event.result.checks,
		preflightPassed: event.result.passed,
		projectRoot: event.result.projectRoot,
	};
};

/**
 * Set selected mode
 */
export const setSelectedMode = function setSelectedMode({
	context: _context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'SELECT_MODE' && event.type !== 'MODE_SELECTED') {
		return {};
	}

	const mode = event.type === 'SELECT_MODE' ? event.mode : event.mode;

	return {
		selectedMode: normalizeMode(mode),
	};
};

/**
 * Use mode from CLI argument
 */
export const useModeArg = function useModeArg({
	context,
}: ActionArgs): Partial<GenerateMachineContext> {
	return {
		selectedMode: normalizeMode(context.modeArg),
	};
};

/**
 * Set backend URL
 */
export const setBackendURL = function setBackendURL({
	context: _context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'BACKEND_URL_ENTERED') {
		return {};
	}

	return {
		backendURL: event.url,
	};
};

/**
 * Set backend options
 */
export const setBackendOptions = function setBackendOptions({
	context: _context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'BACKEND_OPTIONS_COMPLETE') {
		return {};
	}

	return {
		proxyNextjs: event.proxyNextjs,
		useEnvFile: event.useEnvFile,
	};
};

/**
 * Set frontend UI options
 */
export const setFrontendOptions = function setFrontendOptions({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'FRONTEND_OPTIONS_COMPLETE') {
		return {};
	}

	return {
		enableDevTools: event.enableDevTools ?? context.enableDevTools,
		enableSSR: event.enableSSR ?? context.enableSSR,
		expandedTheme: event.expandedTheme ?? null,
		uiStyle: event.uiStyle,
	};
};

/**
 * Set scripts option
 */
export const setScriptsOption = function setScriptsOption({
	context: _context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'SCRIPTS_OPTION_COMPLETE') {
		return {};
	}

	return {
		addScripts: event.addScripts,
	};
};

/**
 * Record files created/modified for potential rollback
 */
export const recordFiles = function recordFiles({
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
};

/**
 * Add dependencies to install
 */
export const addDependencies = function addDependencies({
	context,
}: ActionArgs): Partial<GenerateMachineContext> {
	const deps: string[] = [];

	// Every framework target installs the single c15t umbrella package;
	// framework.pkg only selects the entry point generated code imports from.
	if (context.framework?.pkg) {
		deps.push(UMBRELLA_PACKAGE);
	}

	// Add scripts package if selected
	if (context.addScripts) {
		deps.push('@c15t/scripts');
	}

	// Add dev tools package if selected
	if (context.enableDevTools && context.framework?.pkg === 'c15t') {
		deps.push('@c15t/dev-tools');
	}

	return {
		dependenciesToAdd: [...new Set([...context.dependenciesToAdd, ...deps])],
	};
};

/**
 * Set install confirmation
 */
export const setInstallConfirmation = function setInstallConfirmation({
	context: _context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'CONFIRM_INSTALL') {
		return {};
	}

	return {
		installAttempted: event.confirmed,
		installConfirmed: event.confirmed,
	};
};

/**
 * Set install result
 */
export const setInstallResult = function setInstallResult({
	context: _context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'INSTALL_COMPLETE') {
		return {};
	}

	return {
		installSucceeded: event.success,
	};
};

/**
 * Record an error
 */
export const recordError = function recordError({
	context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'FILE_GENERATION_ERROR') {
		return {};
	}

	const error: MachineError = {
		error: event.error,
		state: 'fileGeneration',
		timestamp: Date.now(),
	};

	return {
		errors: [...context.errors, error],
	};
};

/**
 * Set cancel reason
 */
export const setCancelReason = function setCancelReason({
	context: _context,
	event,
}: ActionArgs): Partial<GenerateMachineContext> {
	if (event.type !== 'CANCEL') {
		return {};
	}

	return {
		cancelReason: event.reason ?? 'User cancelled',
	};
};

/**
 * Mark cleanup as done
 */
export const markCleanupDone = function markCleanupDone({
	context: _context,
}: ActionArgs): Partial<GenerateMachineContext> {
	return {
		cleanupDone: true,
	};
};

/**
 * Clear files after rollback
 */
export const clearFiles = function clearFiles({
	context: _context,
}: ActionArgs): Partial<GenerateMachineContext> {
	return {
		filesCreated: [],
		filesModified: [],
	};
};

/**
 * Reset context for retry
 */
export const resetForRetry = function resetForRetry({
	context: _context,
}: ActionArgs): Partial<GenerateMachineContext> {
	return {
		errors: [],
		preflightChecks: [],
		preflightPassed: false,
	};
};

/**
 * All actions exported for use in machine definition
 */
export const actions = {
	addDependencies,
	clearFiles,
	markCleanupDone,
	recordError,
	recordFiles,
	recordStateEntry,
	resetForRetry,
	setBackendOptions,
	setBackendURL,
	setCancelReason,
	setFrontendOptions,
	setInstallConfirmation,
	setInstallResult,
	setPreflightResults,
	setScriptsOption,
	setSelectedMode,
	useModeArg,
};

/**
 * Perform file rollback - restore modified files and delete created files
 *
 * This is an async action that should be called as a service/actor
 */
export const performRollback = async function performRollback(
	filesCreated: string[],
	filesModified: FileModification[]
): Promise<void> {
	const fs = await import('node:fs/promises');

	// Delete created files
	await Array.from(filesCreated).reduce(async (previousIteration, filePath) => {
		await previousIteration;
		try {
			await fs.unlink(filePath);
		} catch {
			// File may not exist, ignore
		}
	}, Promise.resolve());

	// Restore modified files from backup
	await Array.from(filesModified).reduce(async (previousIteration, mod) => {
		await previousIteration;
		try {
			await fs.writeFile(mod.path, mod.backup, 'utf-8');
		} catch {
			// Best effort restore
		}
	}, Promise.resolve());
};

/**
 * Perform cleanup - clear any temporary state
 */
export const performCleanup = async function performCleanup(
	filesCreated: string[],
	filesModified: FileModification[]
): Promise<void> {
	// Rollback is the cleanup for now
	await performRollback(filesCreated, filesModified);
};
