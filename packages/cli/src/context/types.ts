import type {
	CliFlag,
	CliLogger,
	ErrorHandlers,
	FileSystemUtils,
	FlagType,
	CliCommand as HexbusCliCommand,
	CliContext as HexbusCliContext,
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

export type CliCommand = HexbusCliCommand<CliContext>;

// --- CLI Context Definition ---
export interface CliContext extends HexbusCliContext<AvailablePackages> {
	framework: FrameworkDetectionResult;
	telemetry: Telemetry;
}
