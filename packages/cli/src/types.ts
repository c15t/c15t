/**
 * Shared type definitions for the c15t CLI
 */

import type {
	AvailablePackage as AvailablePackageType,
	StorageMode as StorageModeType,
} from './constants';
import type { CliLogger as SharedCliLogger } from './utils/logger';

// Re-export for use in other modules
export type StorageMode = StorageModeType;
export type AvailablePackage = AvailablePackageType;

// CLI execution types have one definition, shared by commands and adapters.
export type {
	CliCommand,
	CliContext,
	CliFlag,
	ConfigManagement,
	ErrorHandlers,
	FileSystemUtils,
	FlagType,
	PackageInfo,
	ParsedArgs,
} from './context/types';

// --- Framework Detection ---
export interface FrameworkDetectionResult {
	/** Detected framework name */
	framework: string | null;
	/** Framework version */
	frameworkVersion: string | null;
	/** Recommended c15t package */
	pkg: AvailablePackage;
	/** Whether React is detected */
	hasReact: boolean;
	/** React version if detected */
	reactVersion: string | null;
	/** Tailwind version if detected */
	tailwindVersion: string | null;
}

// --- Layout Detection ---
export interface LayoutDetectionResult {
	/** Path to the layout file relative to project root */
	path: string;
	/** Type of router */
	type: 'app' | 'pages';
	/** Whether the layout is in a dynamic segment (e.g., [locale]) */
	hasLocaleSegment: boolean;
	/** The locale segment name if present (e.g., "[locale]") */
	localeSegment?: string;
	/** The app directory path */
	appDirectory: string;
}

// --- Package Manager ---
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

export interface PackageManagerResult {
	/** Detected package manager */
	name: PackageManager;
	/** Install command */
	installCommand: string;
	/** Add package command */
	addCommand: string;
	/** Run script command */
	runCommand: string;
	/** Execute command (npx, bunx, etc.) */
	execCommand: string;
}

// --- Logger Interface ---
export type CliLogger = SharedCliLogger;

// --- Telemetry Interface ---
export interface Telemetry {
	/** Track an event */
	trackEvent: (eventName: string, properties?: Record<string, unknown>) => void;
	/** Track a command execution */
	trackCommand: (
		command: string,
		args?: string[],
		flags?: Record<string, string | number | boolean | undefined>
	) => void;
	/** Track an error */
	trackError: (error: Error, command?: string) => void;
	/** Flush pending events */
	flushSync: () => void;
	/** Shutdown the telemetry client */
	shutdown: () => Promise<void>;
	/** Check if telemetry is disabled */
	isDisabled: () => boolean;
}

// --- Generate Options ---
export interface GenerateOptions {
	/** Storage mode */
	mode: StorageMode;
	/** Backend URL (for hosted or self-hosted mode) */
	backendUrl?: string;
	/** Project ID (for hosted mode) */
	instanceId?: string;
	/** Selected scripts to configure */
	scripts?: string[];
	/** Theme preset */
	theme?: string;
	/** Whether to skip dependency installation */
	skipInstall?: boolean;
	/** Whether to skip confirmation prompts */
	skipConfirm?: boolean;
}

// --- Execution Plan ---
export interface ExecutionPlan {
	/** Storage mode */
	mode: StorageMode;
	/** Backend URL if applicable */
	backendUrl?: string;
	/** Files that will be created */
	filesToCreate: string[];
	/** Files that will be modified */
	filesToModify: string[];
	/** Dependencies to install */
	dependencies: string[];
	/** Dev dependencies to install */
	devDependencies?: string[];
}

// --- Pre-flight Check Result ---
export interface PreflightResult {
	/** Whether all required checks passed */
	passed: boolean;
	/** Individual check results */
	checks: PreflightCheck[];
}

export interface PreflightCheck {
	/** Check name */
	name: string;
	/** Check status */
	status: 'pass' | 'warn' | 'fail';
	/** Status message */
	message: string;
	/** Optional hint for fixing */
	hint?: string;
}

// --- Project (from control plane) ---
export interface Instance {
	/** Project ID */
	id: string;
	/** Project name */
	name: string;
	/** Organization slug */
	organizationSlug?: string;
	/** Provisioning region */
	region?: string;
	/** Project backend URL */
	url: string;
	/** Created timestamp */
	createdAt?: string;
	/** Project status */
	status: 'active' | 'inactive' | 'pending';
}

// --- Recovery Options ---
export type RecoveryAction =
	| 'retry'
	| 'skip'
	| 'manual'
	| 'troubleshoot'
	| 'abort';

export interface RecoveryOption {
	/** Action identifier */
	action: RecoveryAction;
	/** Display label */
	label: string;
	/** Description */
	description: string;
}
