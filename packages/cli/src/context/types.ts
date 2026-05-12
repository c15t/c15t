import type { C15TOptions } from '@c15t/backend';
import type {
	CliFlag,
	CliLogger,
	ErrorHandlers,
	FileSystemUtils,
	FlagType,
	FrameworkDetectionResult as HexbusFrameworkDetectionResult,
	PackageInfo,
	PackageManager,
	PackageManagerResult,
	ParsedArgs,
} from 'hexbus';
import type { Telemetry } from '../utils/telemetry';

export type {
	CliFlag,
	CliLogger,
	ErrorHandlers,
	FileSystemUtils,
	FlagType,
	PackageInfo,
	PackageManager,
	PackageManagerResult,
	ParsedArgs,
};

export type AvailablePackages = 'c15t' | '@c15t/react' | '@c15t/nextjs';

export type FrameworkDetectionResult = Omit<
	HexbusFrameworkDetectionResult<AvailablePackages>,
	'pkg'
> & {
	pkg: AvailablePackages;
};

export interface CliCommand {
	name: string;
	label: string;
	hint: string;
	description: string;
	action: (context: CliContext) => Promise<void>;
	subcommands?: CliCommand[];
	hidden?: boolean;
}

// --- Config Management ---
export interface ConfigManagement {
	loadConfig: () => Promise<C15TOptions | null>;
	requireConfig: () => Promise<C15TOptions>;
	getPathAliases: (configPath?: string) => Record<string, string> | null;
}

// --- CLI Context Definition ---
export interface CliContext {
	logger: CliLogger;
	flags: ParsedArgs['parsedFlags'];
	commandName: string | undefined;
	commandArgs: string[];
	cwd: string;
	error: ErrorHandlers;
	config: ConfigManagement;
	fs: FileSystemUtils;
	framework: FrameworkDetectionResult;
	telemetry: Telemetry;
	confirm: (message: string, initialValue?: boolean) => Promise<boolean>;
	projectRoot: string;
	packageManager: PackageManagerResult;
}
