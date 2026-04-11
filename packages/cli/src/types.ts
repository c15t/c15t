/**
 * Shared type definitions for the c15t CLI
 */

import type {
	AvailablePackage as AvailablePackageType,
	StorageMode as StorageModeType,
} from './constants';

// Re-export for use in other modules
export type StorageMode = StorageModeType;
export type AvailablePackage = AvailablePackageType;

// --- Command Definition ---
export interface CliCommand {
	/** Command name used in CLI invocation */
	name: string;
	/** Label shown in interactive prompts */
	label: string;
	/** Short hint shown alongside the label */
	hint: string;
	/** Longer description for help text */
	description: string;
	/** Command handler function */
	action: (context: CliContext) => Promise<void>;
	/** Optional subcommands */
	subcommands?: CliCommand[];
	/** Whether this command is hidden from help */
	hidden?: boolean;
}

// --- Flag Definition ---
export type FlagType = 'boolean' | 'string' | 'special';

export interface CliFlag {
	/** Flag names (e.g., ['--help', '-h']) */
	names: string[];
	/** Description for help text */
	description: string;
	/** Flag type */
	type: FlagType;
	/** Whether the flag expects a value */
	expectsValue: boolean;
	/** Default value */
	defaultValue?: string | boolean;
}

// --- Parsed Arguments ---
export interface ParsedArgs {
	/** The command name if provided */
	commandName: string | undefined;
	/** Arguments passed after the command */
	commandArgs: string[];
	/** Parsed flags by their primary name */
	parsedFlags: Record<string, string | boolean | undefined>;
}

// --- Package Info ---
export interface PackageInfo {
	name: string;
	version: string;
	[key: string]: unknown;
}

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
export interface CliLogger {
	// Standard log levels
	debug(message: string, ...args: unknown[]): void;
	info(message: string, ...args: unknown[]): void;
	warn(message: string, ...args: unknown[]): void;
	error(message: string, ...args: unknown[]): void;

	// CLI-specific methods
	message(message: string): void;
	note(content: string, title?: string): void;
	success(message: string): void;
	failed(message: string): never;
	outro(message: string): void;
	step(current: number, total: number, label: string): void;
}

// --- Error Handlers ---
export interface ErrorHandlers {
	/** Handle an error and exit */
	handleError: (error: unknown, message: string) => never;
	/** Handle user cancellation */
	handleCancel: (
		message?: string,
		context?: { command?: string; stage?: string }
	) => never;
}

// --- Config Management ---
export interface ConfigManagement {
	/** Load c15t config from the project */
	loadConfig: () => Promise<unknown | null>;
	/** Load config or throw if not found */
	requireConfig: () => Promise<unknown>;
	/** Get path aliases from tsconfig/jsconfig */
	getPathAliases: (configPath?: string) => Record<string, string> | null;
}

// --- File System Utilities ---
export interface FileSystemUtils {
	/** Get package.json info */
	getPackageInfo: () => PackageInfo;
	/** Check if a file exists */
	exists: (path: string) => Promise<boolean>;
	/** Read a file */
	read: (path: string) => Promise<string>;
	/** Write a file */
	write: (path: string, content: string) => Promise<void>;
	/** Create a directory */
	mkdir: (path: string) => Promise<void>;
}

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

// --- CLI Context ---
export interface CliContext {
	/** Logger instance */
	logger: CliLogger;
	/** Parsed command flags */
	flags: ParsedArgs['parsedFlags'];
	/** Current command name */
	commandName: string | undefined;
	/** Command arguments */
	commandArgs: string[];
	/** Current working directory */
	cwd: string;

	// Utilities
	/** Error handling utilities */
	error: ErrorHandlers;
	/** Config management utilities */
	config: ConfigManagement;
	/** File system utilities */
	fs: FileSystemUtils;
	/** Telemetry instance */
	telemetry: Telemetry;

	// User interaction
	/** Show a confirmation prompt */
	confirm: (message: string, initialValue?: boolean) => Promise<boolean>;

	// Detection results
	/** Project root directory */
	projectRoot: string;
	/** Detected framework info */
	framework: FrameworkDetectionResult;
	/** Detected package manager */
	packageManager: PackageManagerResult;
}

// --- Generate Options ---
export interface GenerateOptions {
	/** Storage mode */
	mode: StorageMode;
	/** Backend URL (for hosted or self-hosted mode) */
	backendUrl?: string;
	/** Instance ID (for hosted mode) */
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

// --- Instance (from control plane) ---
export interface Instance {
	/** Instance ID */
	id: string;
	/** Instance name */
	name: string;
	/** Organization slug */
	organizationSlug?: string;
	/** Provisioning region */
	region?: string;
	/** Instance URL */
	url: string;
	/** Created timestamp */
	createdAt: string;
	/** Instance status */
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
