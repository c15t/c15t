import {
	type CliLogger,
	createCliLogger as createHexbusCliLogger,
	formatLogMessage as formatHexbusLogMessage,
	logMessage as logHexbusMessage,
} from 'hexbus';

// Define standard log levels
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export const validLogLevels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
export type { CliLogger };

// Define CLI-specific extension levels with their method signatures
export interface CliExtensions {
	message: (message: string) => void;
	note: (content: string, title?: string) => void;
	outro: (message: string) => void;
	success: (message: string) => void;
	failed: (message: string) => never;
	step: (current: number, total: number, label: string) => void;
}

/**
 * Formats a log message with appropriate styling based on log level
 *
 * @param logLevel - The log level to format for
 * @param message - The message to format
 * @param args - Additional arguments to format
 * @returns The formatted message string
 */
export const formatLogMessage = (
	logLevel: LogLevel | string,
	message: unknown,
	args: unknown[] = []
): string => {
	return formatHexbusLogMessage(logLevel, message, args);
};

/**
 * Logs a message with the appropriate clack prompt styling
 * Can be used before logger initialization
 *
 * @param logLevel - The log level to use
 * @param message - The message to log
 * @param args - Additional arguments to include
 */
export const logMessage = (
	logLevel: LogLevel | 'success' | 'failed' | string,
	message: unknown,
	...args: unknown[]
): void => {
	logHexbusMessage(logLevel, message, ...args);
};

// This function creates a logger instance based on the provided level
// It includes the custom log handler for clack integration.
export const createCliLogger = (level: LogLevel): CliLogger => {
	return createHexbusCliLogger(level);
};
