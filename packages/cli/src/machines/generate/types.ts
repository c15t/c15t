/**
 * Type definitions for the generate command state machine
 *
 * Defines context, events, and state types for the generate flow.
 */

import type { StorageMode } from '~/constants';
import type { AvailablePackages } from '~/context/framework-detection';
import type { PackageManagerResult } from '~/context/package-manager-detection';
import type { CliContext } from '~/context/types';
import type {
	BaseMachineContext,
	FileModification,
	MachineError,
	StateHistoryEntry,
} from '../types';

/**
 * UI style selection for component generation
 */
export type UIStyle = 'prebuilt' | 'expanded';

/**
 * Theme preset
 */
export type ExpandedTheme = 'none' | 'minimal' | 'dark' | 'tailwind';

/**
 * Context for the generate state machine
 */
export interface GenerateMachineContext extends BaseMachineContext {
	// --- CLI Context Reference ---
	/** Reference to the CLI context (not serializable, set on init) */
	cliContext: CliContext | null;

	// --- Environment (from preflight) ---
	/** Project root directory */
	projectRoot: string;
	/** Detected framework information */
	framework: {
		name: string | null;
		version: string | null;
		pkg: AvailablePackages;
		hasReact: boolean;
		reactVersion: string | null;
		tailwindVersion: string | null;
	} | null;
	/** Detected package manager */
	packageManager: PackageManagerResult | null;

	// --- Preflight Results ---
	/** Whether preflight checks passed */
	preflightPassed: boolean;
	/** Preflight check details */
	preflightChecks: PreflightCheckResult[];

	// --- Mode Configuration ---
	/** Selected storage mode */
	selectedMode: StorageMode | null;
	/** Mode passed as CLI argument */
	modeArg: StorageMode | null;
	/** Hosted provider selection when mode is hosted */
	hostedProvider: 'consent.io' | 'self-hosted' | null;

	// --- Backend Options ---
	/** Backend URL for hosted mode (consent.io or self-hosted provider) */
	backendURL: string | null;
	/** Whether to store backend URL in .env file */
	useEnvFile: boolean;
	/** Whether to proxy requests via Next.js rewrites */
	proxyNextjs: boolean;

	// --- Frontend UI Options ---
	/** Whether to enable SSR for initial data fetch */
	enableSSR: boolean;
	/** Whether to install and enable c15t DevTools */
	enableDevTools: boolean;
	/** UI component style selection */
	uiStyle: UIStyle;
	/** Theme preset for expanded components */
	expandedTheme: ExpandedTheme | null;

	// --- Scripts Options ---
	/** Whether to add c15t scripts package */
	addScripts: boolean;
	/** Selected scripts to pre-configure */
	selectedScripts: string[];

	// --- File Tracking (for rollback) ---
	/** Paths to files created during generation */
	filesCreated: string[];
	/** Files modified with backup for rollback */
	filesModified: FileModification[];

	// --- Dependency Installation ---
	/** Dependencies to install */
	dependenciesToAdd: string[];
	/** Whether user confirmed dependency installation */
	installConfirmed: boolean;
	/** Whether installation was attempted */
	installAttempted: boolean;
	/** Whether installation succeeded */
	installSucceeded: boolean;

	// --- Self-hosted Specific ---
	/** Whether to run database migrations (self-hosted mode) */
	runMigrations: boolean;

	// --- Skills ---
	/** Whether agent skills were installed */
	skillsInstalled: boolean;

	// --- Cancellation/Cleanup ---
	/** Reason for cancellation if cancelled */
	cancelReason: string | null;
	/** Whether cleanup has been performed */
	cleanupDone: boolean;
}

/**
 * Result of a preflight check
 */
export interface PreflightCheckResult {
	name: string;
	status: 'pass' | 'warn' | 'fail';
	message: string;
	hint?: string;
}

/**
 * Events for the generate state machine
 */
export type GenerateMachineEvent =
	// Lifecycle events
	| { type: 'START' }
	| { type: 'CANCEL'; reason?: string }
	| { type: 'RETRY' }
	| { type: 'RESET' }

	// Preflight events
	| {
			type: 'PREFLIGHT_COMPLETE';
			result: {
				passed: boolean;
				checks: PreflightCheckResult[];
				projectRoot: string;
				framework: GenerateMachineContext['framework'];
				packageManager: PackageManagerResult;
			};
	  }
	| { type: 'PREFLIGHT_RETRY' }

	// Mode selection events
	| { type: 'SELECT_MODE'; mode: StorageMode }
	| { type: 'MODE_SELECTED'; mode: StorageMode }

	// Hosted mode events
	| { type: 'ACCOUNT_CREATION_COMPLETE'; needsAccount: boolean }
	| { type: 'BROWSER_OPENED' }
	| { type: 'BACKEND_URL_ENTERED'; url: string }

	// Backend options events
	| {
			type: 'BACKEND_OPTIONS_COMPLETE';
			useEnvFile: boolean;
			proxyNextjs: boolean;
	  }

	// Frontend UI options events
	| {
			type: 'FRONTEND_OPTIONS_COMPLETE';
			enableSSR?: boolean;
			enableDevTools?: boolean;
			uiStyle: UIStyle;
			expandedTheme?: ExpandedTheme;
	  }

	// Scripts options events
	| { type: 'SCRIPTS_OPTION_COMPLETE'; addScripts: boolean }

	// File generation events
	| {
			type: 'FILES_GENERATED';
			filesCreated: string[];
			filesModified: FileModification[];
	  }
	| { type: 'FILE_GENERATION_ERROR'; error: Error }

	// Dependency installation events
	| { type: 'CONFIRM_INSTALL'; confirmed: boolean }
	| { type: 'INSTALL_COMPLETE'; success: boolean }
	| { type: 'SKIP_INSTALL' }

	// Completion events
	| { type: 'SHOW_SUMMARY' }
	| { type: 'GITHUB_STAR_PROMPT'; opened: boolean }
	| { type: 'COMPLETE' }

	// Rollback events
	| { type: 'ROLLBACK_COMPLETE' }
	| { type: 'CLEANUP_COMPLETE' };

/**
 * State value types for the generate machine
 */
export type GenerateMachineStateValue =
	| 'idle'
	| 'preflight'
	| 'preflightError'
	| 'modeSelection'
	| 'hostedMode'
	| 'offlineMode'
	| 'customMode'
	| 'backendOptions'
	| 'frontendOptions'
	| 'scriptsOptions'
	| 'fileGeneration'
	| 'dependencyInstall'
	| 'summary'
	| 'skillsInstall'
	| 'githubStar'
	| 'complete'
	| 'error'
	| 'cancelling'
	| 'cleanup'
	| 'exited';

/**
 * Initial context for the generate machine
 */
export function createInitialContext(
	cliContext?: CliContext,
	modeArg?: StorageMode
): GenerateMachineContext {
	return {
		// CLI Context
		cliContext: cliContext ?? null,

		// Environment
		projectRoot: cliContext?.projectRoot ?? '',
		framework: null,
		packageManager: null,

		// Preflight
		preflightPassed: false,
		preflightChecks: [],

		// Mode
		selectedMode: null,
		modeArg: modeArg ?? null,
		hostedProvider: null,

		// Backend options
		backendURL: null,
		useEnvFile: true,
		proxyNextjs: true,

		// Frontend options
		enableSSR: false,
		enableDevTools: false,
		uiStyle: 'prebuilt',
		expandedTheme: null,

		// Scripts
		addScripts: false,
		selectedScripts: [],

		// File tracking
		filesCreated: [],
		filesModified: [],

		// Dependencies
		dependenciesToAdd: [],
		installConfirmed: false,
		installAttempted: false,
		installSucceeded: false,

		// Self-hosted
		runMigrations: false,

		// Skills
		skillsInstalled: false,

		// Cancellation
		cancelReason: null,
		cleanupDone: false,

		// Base context
		errors: [],
		stateHistory: [],
	};
}

/**
 * Type guard for checking if a mode requires backend URL
 */
export function modeRequiresBackend(mode: StorageMode): boolean {
	return mode === 'hosted' || mode === 'c15t' || mode === 'self-hosted';
}

/**
 * Type guard for checking if framework is Next.js
 */
export function isNextjsFramework(
	framework: GenerateMachineContext['framework']
): boolean {
	return framework?.pkg === '@c15t/nextjs';
}

/**
 * Type guard for checking if framework has React
 */
export function hasReactFramework(
	framework: GenerateMachineContext['framework']
): boolean {
	return framework?.hasReact ?? false;
}
