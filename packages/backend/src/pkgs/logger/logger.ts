/**
 * Represents the available log severity levels
 *
 * These levels determine the priority and visibility of log messages.
 * The order from highest to lowest severity is typically:
 * error > warn > info > success > debug
 */
export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';

/**
 * Array of all available log levels in order of importance
 *
 * This const array ensures type safety when working with log levels
 * and provides a reference for level comparisons.
 */
export const levels = ['info', 'success', 'warn', 'error', 'debug'] as const;

/**
 * Determines if a log message should be published based on configured log level
 *
 * @param currentLogLevel - The configured log level threshold for the logger
 * @param logLevel - The level of the message being evaluated
 * @returns Boolean indicating whether the message should be published
 *
 * @example
 * ```ts
 * // Only publish if error level is at or above the current log level
 * if (shouldPublishLog('warn', 'error')) {
 *   // This will return true as error is more severe than warn
 * }
 * ```
 */
export function shouldPublishLog(
	currentLogLevel: LogLevel,
	logLevel: LogLevel
): boolean {
	return levels.indexOf(logLevel) <= levels.indexOf(currentLogLevel);
}

/**
 * Configuration interface for logger instances
 *
 * Provides options to customize logger behavior including
 * disabling logs, setting log levels, and custom log handlers.
 */
export interface Logger {
	/**
	 * Whether logging is disabled
	 *
	 * When true, no logs will be published regardless of log level
	 */
	disabled?: boolean;

	/**
	 * The minimum log level to publish
	 *
	 * Only logs with this level or higher severity will be published
	 * Note that 'success' is excluded as it's typically handled as 'info'
	 */
	level?: Exclude<LogLevel, 'success'>;

	/**
	 * Custom log handler function
	 *
	 * When provided, this function will be called instead of console methods
	 *
	 * @param level - The severity level of the log message
	 * @param message - The message to log
	 * @param args - Additional data to include in the log
	 */
	log?: (
		level: Exclude<LogLevel, 'success'>,
		message: string,
		...args: unknown[]
	) => void;
}

/**
 * Type representing the parameters for log handlers
 *
 * This utility type extracts parameter types from the Logger.log function,
 * excluding the first parameter (log level).
 */
export type LogHandlerParams = Parameters<NonNullable<Logger['log']>> extends [
	LogLevel,
	...infer Rest,
]
	? Rest
	: never;

/**
 * ANSI color codes for terminal output formatting
 *
 * Used to add color and styling to log messages in terminal environments
 *
 * @internal
 */
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	dim: '\x1b[2m',
	underscore: '\x1b[4m',
	blink: '\x1b[5m',
	reverse: '\x1b[7m',
	hidden: '\x1b[8m',
	fg: {
		black: '\x1b[30m',
		red: '\x1b[31m',
		green: '\x1b[32m',
		yellow: '\x1b[33m',
		blue: '\x1b[34m',
		magenta: '\x1b[35m',
		cyan: '\x1b[36m',
		white: '\x1b[37m',
	},
	bg: {
		black: '\x1b[40m',
		red: '\x1b[41m',
		green: '\x1b[42m',
		yellow: '\x1b[43m',
		blue: '\x1b[44m',
		magenta: '\x1b[45m',
		cyan: '\x1b[46m',
		white: '\x1b[47m',
	},
};

/**
 * Mapping of log levels to their corresponding colors
 *
 * @internal
 */
const levelColors: Record<LogLevel, string> = {
	info: colors.fg.blue,
	success: colors.fg.green,
	warn: colors.fg.yellow,
	error: colors.fg.red,
	debug: colors.fg.magenta,
};

/**
 * Formats a log message with timestamp, level indicator, and styling
 *
 * @param level - The severity level of the message
 * @param message - The message content to format
 * @returns The formatted message string with ANSI color codes
 *
 * @internal
 */
const formatMessage = (level: LogLevel, message: string): string => {
	const timestamp = new Date().toISOString();
	return `${colors.dim}${timestamp}${colors.reset} ${
		levelColors[level]
	}${level.toUpperCase()}${colors.reset} ${colors.bright}[c15t]:${
		colors.reset
	} ${message}`;
};

/**
 * Creates a configured logger instance with methods for each log level
 *
 * @param options - Configuration options for the logger
 * @returns An object with methods for each log level
 *
 * @example
 * ```ts
 * // Create a logger that only shows warnings and errors
 * const logger = createLogger({ level: 'warn' });
 *
 * // These will be output
 * logger.error('This is an error');
 * logger.warn('This is a warning');
 *
 * // These will be suppressed
 * logger.info('This info won\'t be shown');
 * logger.debug('This debug message won\'t be shown');
 * ```
 */
export const createLogger = (
	options?: Logger
): Record<LogLevel, (...params: LogHandlerParams) => void> => {
	const enabled = options?.disabled !== true;
	const logLevel = options?.level ?? 'error';

	/**
	 * Internal function that handles the actual logging logic
	 *
	 * @param level - The severity level of the log
	 * @param message - The message to log
	 * @param args - Additional data to include in the log
	 *
	 * @internal
	 */
	const LogFunc = (
		level: LogLevel,
		message: string,
		args: unknown[] = []
	): void => {
		if (!enabled || !shouldPublishLog(logLevel, level)) {
			return;
		}

		const formattedMessage = formatMessage(level, message);

		if (!options || typeof options.log !== 'function') {
			if (level === 'error') {
				// biome-ignore lint/suspicious/noConsole: Logger implementation
				console.error(formattedMessage, ...args);
			} else if (level === 'warn') {
				// biome-ignore lint/suspicious/noConsole: Logger implementation
				console.warn(formattedMessage, ...args);
			} else if (level === 'info') {
				// biome-ignore lint/suspicious/noConsole: Logger implementation
				// biome-ignore lint/suspicious/noConsoleLog: Logger implementation
				console.log(formattedMessage, ...args);
			} else if (level === 'debug') {
				// biome-ignore lint/suspicious/noConsole: Logger implementation
				console.debug(formattedMessage, ...args);
			} else if (level === 'success') {
				// biome-ignore lint/suspicious/noConsole: Logger implementation
				// biome-ignore lint/suspicious/noConsoleLog: Logger implementation
				console.log(formattedMessage, ...args);
			}
			return;
		}

		options.log(level === 'success' ? 'info' : level, message, ...args);
	};

	return Object.fromEntries(
		levels.map((level) => [
			level,
			(...[message, ...args]: LogHandlerParams) =>
				LogFunc(level, message, args),
		])
	) as Record<LogLevel, (...params: LogHandlerParams) => void>;
};

/**
 * Default logger instance with standard configuration
 *
 * Ready-to-use logger with default settings (logs errors only)
 *
 * @example
 * ```ts
 * import { logger } from './logger';
 *
 * logger.error('Something went wrong');
 * logger.info('This won\'t be shown with default settings');
 * ```
 */
export const logger = createLogger();
