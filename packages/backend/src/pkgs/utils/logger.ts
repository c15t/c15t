import {
	type LoggerOptions,
	createLogger as createDTLogger,
} from '@doubletie/logger';

let globalLogger: ReturnType<typeof createDTLogger>;

/**
 * Gets or creates a global logger instance
 *
 * @param options - Optional logger configuration options
 * @returns The global logger instance
 */
export function getLogger(
	options?: LoggerOptions
): ReturnType<typeof createDTLogger> {
	if (!globalLogger) {
		globalLogger = createDTLogger({
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
): ReturnType<typeof createDTLogger> {
	globalLogger = createDTLogger(options);
	return globalLogger;
}
