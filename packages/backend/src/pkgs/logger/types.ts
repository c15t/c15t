import type { Tracer } from '@opentelemetry/api';

/**
 * Represents the available log severity levels.
 *
 * @remarks
 * These levels determine the priority and visibility of log messages.
 * The order from highest to lowest severity is:
 * error > warn > info > success > debug
 *
 * @public
 */
export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';

/**
 * Configuration interface for logger instances.
 *
 * @remarks
 * Provides options to customize logger behavior including
 * disabling logs, setting log levels, and custom log handlers.
 *
 * @public
 */
export interface LoggerOptions {
	/**
	 * Whether logging is disabled.
	 *
	 * @remarks
	 * When true, no logs will be published regardless of log level.
	 */
	disabled?: boolean;

	/**
	 * The minimum log level to publish.
	 *
	 * @remarks
	 * Only logs with this level or higher severity will be published.
	 * Note that 'success' is treated as 'info' when using custom log handlers.
	 */
	level?: Exclude<LogLevel, 'success'>;

	/**
	 * Custom log handler function.
	 *
	 * @remarks
	 * When provided, this function will be called instead of console methods.
	 *
	 * @param level - The severity level of the log message
	 * @param message - The message to log
	 * @param args - Additional data to include in the log
	 */
	log?: (
		level: LogLevel,
		message: string,
		...args: unknown[]
	) => void;

	/**
	 * Custom application name to display in log messages.
	 *
	 * @remarks
	 * When provided, this will override the default app name in the log format.
	 *
	 * @default '🪢 doubletie'
	 */
	appName?: string;

	/**
	 * OpenTelemetry configuration options
	 */
	telemetry?: {
		/**
		 * Custom tracer to use for OpenTelemetry integration
		 */
		tracer?: Tracer;

		/**
		 * Whether to disable OpenTelemetry tracing
		 */
		disabled?: boolean;

		/**
		 * Additional attributes to add to all spans
		 */
		defaultAttributes?: Record<string, string | number | boolean>;
	};
}

/**
 * Type representing the parameters for log handlers.
 *
 * @remarks
 * This utility type extracts parameter types from the Logger.log function,
 * excluding the first parameter (log level).
 *
 * @internal
 */
export type LogEntry = Parameters<NonNullable<LoggerOptions['log']>> extends [
	LogLevel,
	...infer Rest,
]
	? Rest
	: never;

/**
 * Type representing a logger instance with methods for each log level.
 *
 * @remarks
 * Each method corresponds to a log level and accepts a message and optional arguments.
 *
 * @public
 */
export type Logger = Record<LogLevel, (...params: LogEntry) => void>;

/**
 * Base error interface that must be implemented by errors used with the logger.
 *
 * @remarks
 * This interface defines the minimum properties an error object should have
 * to work properly with the logging utilities.
 *
 * @public
 */
export interface LoggableError {
	/** The error message */
	message: string;

	/** Optional error code */
	code?: string | number;

	/** Optional HTTP status code */
	status?: number;

	/** Optional additional error metadata */
	meta?: Record<string, unknown>;

	/** Optional error category */
	category?: string;

	/** Error stack trace */
	stack?: string;
}
