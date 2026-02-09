/**
 * Core module exports
 */

// Context
export {
	type CreateContextOptions,
	createCliContext,
	createTestContext,
} from './context';
// Errors
export {
	CliError,
	createErrorHandlers,
	ERROR_CATALOG,
	type ErrorCode,
	isCliError,
	withErrorHandling,
} from './errors';
// Logger
export {
	color,
	colors,
	createCliLogger,
	createSpinner,
	formatLogMessage,
	formatStep,
	LOG_LEVELS,
	type LogLevel,
	type Spinner,
	withSpinner,
} from './logger';
// Parser
export {
	formatFlagHelp,
	generateFlagsHelp,
	getFlagValue,
	globalFlags,
	hasFlag,
	parseCliArgs,
	parseSubcommand,
} from './parser';

// Telemetry
export {
	createDisabledTelemetry,
	createTelemetry,
	TelemetryEventName,
	type TelemetryEventNameType,
	type TelemetryOptions,
} from './telemetry';
