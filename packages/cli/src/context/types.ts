import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import type { Logger } from '@c15t/backend/pkgs/logger';
import type { CliExtensions } from '../utils/logger';
import type { Telemetry } from '../utils/telemetry';

// Re-export Logger if needed elsewhere, or keep specific to context
export type { Logger };

// --- Command Definition ---
export interface CliCommand {
	name: string;
	label: string; // For prompts
	hint: string; // For prompts
	description: string; // For help text (optional)
	// Action now takes CliContext
	action: (context: CliContext) => Promise<void>;
}

// --- Flag Definition ---
export type FlagType = 'boolean' | 'string' | 'special'; // 'special' for help/version

export interface CliFlag {
	names: string[]; // e.g., ['--help', '-h']
	description: string;
	type: FlagType;
	expectsValue: boolean;
}

// --- Parsed Args Definition ---
export interface ParsedArgs {
	commandName: string | undefined;
	commandArgs: string[];
	// Store flags by their primary name (e.g., 'help', 'logger')
	parsedFlags: Record<string, string | boolean | undefined>;
}

// --- Package Info ---
export interface PackageInfo {
	name: string;
	version: string;
	[key: string]: unknown;
}

// --- Error Handling Helpers ---
export interface ErrorHandlers {
	handleError: (error: unknown, message: string) => never;
	handleCancel: (message?: string) => never;
}

// --- Config Management ---
export interface ConfigManagement {
	loadConfig: () => Promise<C15TOptions<C15TPlugin[]> | null>;
	requireConfig: () => Promise<C15TOptions<C15TPlugin[]>>;
	getPathAliases: (configPath?: string) => Record<string, string> | null;
}

// --- File System Utilities ---
export interface FileSystemUtils {
	getPackageInfo: () => PackageInfo;
}

// --- CLI Context Definition ---
export interface CliContext {
	logger: Logger & CliExtensions;
	flags: ParsedArgs['parsedFlags'];
	commandName: string | undefined;
	commandArgs: string[];
	cwd: string;

	// Shared utilities
	error: ErrorHandlers;
	config: ConfigManagement;
	fs: FileSystemUtils;
	
	// Telemetry for tracking CLI command usage
	telemetry: Telemetry;

	// Utilities for user interaction
	confirm: (message: string, initialValue: boolean) => Promise<boolean>;
}
