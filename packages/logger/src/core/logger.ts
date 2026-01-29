import { getFormatter } from '../formatting/formatter';
import { levels, shouldPublishLog } from './levels';
import type {
	ExtendedLogger,
	LogEntry,
	Logger,
	LoggerExtensions,
	LoggerOptions,
	LogLevel,
} from './types';

/**
 * Creates a configured logger instance with methods for each log level.
 *
 * @param options - Configuration options for the logger or an existing logger instance
 * @returns An object with methods for each log level
 *
 * @example
 * ```ts
 * // Create a logger that only shows warnings and errors
 * const logger = createLogger({ level: 'warn', appName: 'c15t' });
 *
 * // These will be output
 * logger.error('This is an error');
 * logger.warn('This is a warning');
 *
 * // These will be suppressed
 * logger.info('This info won\'t be shown');
 * logger.debug('This debug message won\'t be shown');
 * ```
 *
 * @example
 * ```ts
 * // Create a logger with trace context for log correlation
 * import { getTraceContext } from '@c15t/backend/telemetry';
 *
 * const logger = createLogger({
 *   level: 'info',
 *   getTraceContext: () => getTraceContext(),
 * });
 *
 * // Logs will include traceId and spanId when available
 * logger.info('Request processed', { userId: 123 });
 * // Output includes: { traceId: '...', spanId: '...', userId: 123 }
 * ```
 *
 * @public
 */
export const createLogger = (options?: LoggerOptions | Logger): Logger => {
	// If options is already a Logger instance, return it
	if (
		options &&
		typeof options === 'object' &&
		levels.every((level) => typeof (options as Logger)[level] === 'function')
	) {
		return options as Logger;
	}

	// Otherwise, treat options as LoggerOptions
	const loggerOptions = options as LoggerOptions;
	const enabled = loggerOptions?.disabled !== true;
	const logLevel = loggerOptions?.level ?? 'error';
	const appName = loggerOptions?.appName ?? 'c15t';
	const getTraceContext = loggerOptions?.getTraceContext;

	/**
	 * Internal function that handles the actual logging logic.
	 *
	 * @param level - The severity level of the log
	 * @param message - The message to log
	 * @param args - Additional data to include in the log
	 *
	 * @internal
	 */
	// Map log levels to console methods
	const consoleMethods: Record<LogLevel, (...args: unknown[]) => void> = {
		error: console.error.bind(console),
		warn: console.warn.bind(console),
		info: console.log.bind(console),
		debug: console.debug.bind(console),
		success: console.log.bind(console),
	};

	/**
	 * Enriches log args with trace context if available.
	 */
	const enrichArgsWithTraceContext = (args: unknown[]): unknown[] => {
		if (!getTraceContext) {
			return args;
		}

		const traceContext = getTraceContext();
		if (!traceContext) {
			return args;
		}

		// If first arg is an object, merge trace context into it
		if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
			return [{ ...traceContext, ...(args[0] as object) }, ...args.slice(1)];
		}

		// Otherwise, prepend trace context as first arg
		return [traceContext, ...args];
	};

	const logFunc = (
		level: LogLevel,
		message: string,
		args: unknown[] = []
	): void => {
		if (!enabled || !shouldPublishLog(logLevel, level)) {
			return;
		}

		// Enrich args with trace context for log correlation
		const enrichedArgs = enrichArgsWithTraceContext(args);

		const formatter = getFormatter('default');
		const formattedMessage = formatter(level, message, enrichedArgs, appName);

		if (!loggerOptions || typeof loggerOptions.log !== 'function') {
			const consoleMethod = consoleMethods[level];
			consoleMethod(formattedMessage, ...enrichedArgs);
			return;
		}

		loggerOptions.log(
			level === 'success' ? 'info' : level,
			message,
			...enrichedArgs
		);
	};

	return Object.fromEntries(
		levels.map((level) => [
			level,
			(...[message, ...args]: LogEntry) => {
				logFunc(level, message, args);
			},
		])
	) as unknown as Logger;
};

/**
 * Default logger instance with standard configuration.
 *
 * @remarks
 * Ready-to-use logger with default settings (logs errors only).
 *
 * @example
 * ```ts
 * import { logger } from '@c15t/logger';
 *
 * logger.error('Something went wrong');
 * logger.info('This won\'t be shown with default settings');
 * ```
 *
 * @public
 */
export const logger = createLogger();

/**
 * Extends a logger with additional methods.
 *
 * @param baseLogger - The logger to extend
 * @param extensions - Object containing extension methods
 * @returns Extended logger with added functionality
 *
 * @example
 * ```typescript
 * // Create a logger with custom methods
 * const logger = createLogger({ level: 'info' });
 * const extendedLogger = extendLogger(logger, {
 *   http: (message, ...args) => logger.info(`HTTP: ${message}`, ...args),
 *   database: (message, ...args) => logger.info(`DB: ${message}`, ...args)
 * });
 *
 * // Now you can use the extended methods
 * extendedLogger.http('GET /users');
 * extendedLogger.database('Query executed in 10ms');
 * ```
 *
 * @public
 */
export function extendLogger<T extends LoggerExtensions>(
	baseLogger: Logger,
	extensions: T
): ExtendedLogger<T> {
	return Object.assign({}, baseLogger, extensions);
}
