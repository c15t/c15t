import { LogLevel } from './types';

/**
 * Array of all available log levels in order of importance.
 *
 * @remarks
 * This const array ensures type safety when working with log levels
 * and provides a reference for level comparisons.
 *
 * @public
 */
export const levels = ['error', 'warn', 'info', 'success', 'debug'] as const;

/**
 * Determines if a log message should be published based on configured log level.
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
 *
 * @public
 */
export function shouldPublishLog(
	currentLogLevel: LogLevel,
	logLevel: LogLevel
): boolean {
	// Lower indexes are more severe (error is first)
	const currentLevelIndex = levels.indexOf(currentLogLevel);
	const messageLevelIndex = levels.indexOf(logLevel);

	// For 'debug' level, only show debug messages
	if (currentLogLevel === 'debug') {
		return logLevel === 'debug';
	}

	// For other levels, show messages that are at the same level or more severe
	// Lower index = more important.
	return messageLevelIndex <= currentLevelIndex;
}
