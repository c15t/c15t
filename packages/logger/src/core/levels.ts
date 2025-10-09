import type { LogLevel } from './types';

/**
 * The list of available log levels.
 *
 * @remarks
 * These are ordered from highest to lowest severity.
 *
 * @public
 */
export const levels: LogLevel[] = ['error', 'warn', 'info', 'success', 'debug'];

/**
 * Determines if a log message should be published based on configured log level.
 *
 * @param currentLogLevel - The configured threshold log level
 * @param logLevel - The level of the message being evaluated
 * @returns Whether the message should be published
 *
 * @example
 * ```ts
 * // With 'info' level configured
 * shouldPublishLog('info', 'error'); // true - errors are always published
 * shouldPublishLog('info', 'warn'); // true - warnings are higher severity than info
 * shouldPublishLog('info', 'info'); // true - same level
 * shouldPublishLog('info', 'debug'); // false - debug is lower severity than info
 * ```
 *
 * @public
 */
export const shouldPublishLog = (
	currentLogLevel: Exclude<LogLevel, 'success'>,
	logLevel: LogLevel
): boolean => {
	// Special case: 'success' is treated as 'info' for filtering
	const normalizedLogLevel = logLevel === 'success' ? 'info' : logLevel;

	// Get the index of each level (lower index = higher severity)
	const currentLevelIndex = levels.indexOf(currentLogLevel);
	const messageLevelIndex = levels.indexOf(normalizedLogLevel);

	// Allow if the message level is same or higher severity than current level
	return messageLevelIndex <= currentLevelIndex;
};
