/**
 * @packageDocumentation
 * C15T Logger Package
 *
 * A lightweight, customizable logging utility for Node.js and TypeScript applications.
 * It provides structured logging capabilities, error logging utilities for the Result pattern,
 * flexible configuration options, and logger extension support.
 *
 * @remarks
 * This package is designed for use in c15t CLI and backend applications.
 * It includes:
 * - Configurable log levels and filters
 * - Color-coded console output
 * - Error logging for Result/ResultAsync types from neverthrow
 * - Custom log handlers
 *
 * @example
 * ```ts
 * import { createLogger, logResult } from '@c15t/logger';
 *
 * // Create a custom logger
 * const logger = createLogger({ level: 'debug', appName: 'c15t' });
 *
 * // Log messages at different levels
 * logger.info('Application started');
 * logger.debug('Initializing components', { component: 'database' });
 * logger.warn('Configuration missing, using defaults');
 * logger.error('Failed to connect', { retry: true });
 * ```
 */

export {
	levels,
	shouldPublishLog,
} from './core/levels';
export {
	createLogger,
	extendLogger,
	logger,
} from './core/logger';
// Export from core with explicit imports instead of wildcard
export type {
	ExtendedLogger,
	LogEntry,
	LoggableError,
	Logger,
	LoggerExtensions,
	LoggerOptions,
	LogLevel,
} from './core/types';

// Export formatting utilities
export {
	formatArgs,
	formatMessage,
	getFormatter,
	registerFormatter,
} from './formatting';

// Export result logging utilities
export {
	logResult,
	logResult as logError,
	logResultAsync,
	logResultAsync as logErrorAsync,
} from './utils';
