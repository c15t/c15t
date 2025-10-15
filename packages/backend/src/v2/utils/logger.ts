import { createLogger, type LoggerOptions } from '@c15t/logger';

let globalLogger: ReturnType<typeof createLogger>;

/**
 * Gets or creates a global logger instance
 *
 * @param options - Optional logger configuration options
 * @returns The global logger instance
 */
export function getLogger(
	options?: LoggerOptions
): ReturnType<typeof createLogger> {
	if (!globalLogger) {
		globalLogger = createLogger({
			level: 'info',
			appName: 'c15t',
			...options,
		});
	}
	return globalLogger;
}

/**
 * Initializes the global logger with specific options
 *
 * @param options - Logger configuration options
 * @returns The initialized global logger instance
 */
export function initLogger(
	options: LoggerOptions
): ReturnType<typeof createLogger> {
	globalLogger = createLogger(options);
	return globalLogger;
}
