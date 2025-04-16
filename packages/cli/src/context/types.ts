import type { Logger } from '@c15t/backend/pkgs/logger';

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

// --- CLI Context Definition ---
export interface CliContext {
	logger: Logger;
	flags: ParsedArgs['parsedFlags'];
	commandName: string | undefined;
	commandArgs: string[];
	cwd: string;
	// Add commands and flags to context if needed by actions
	// commands: CliCommand[];
	// globalFlags: CliFlag[];
}
