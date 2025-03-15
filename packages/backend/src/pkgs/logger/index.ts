/**
 * @packageDocumentation
 * DoubleTie Logger Package
 *
 * A lightweight, customizable logging utility for Node.js and TypeScript applications.
 * It provides structured logging capabilities, error logging utilities for the Result pattern,
 * and flexible configuration options.
 *
 * @remarks
 * This package is designed to work standalone or as part of the DoubleTie SDK.
 * It includes:
 * - Configurable log levels and filters
 * - Color-coded console output
 * - Error logging for Result/ResultAsync types from neverthrow
 * - Custom log handlers
 *
 * @example
 * ```ts
 * import { createLogger, logError } from '@doubletie/logger';
 *
 * // Create a custom logger
 * const logger = createLogger({ level: 'debug' });
 *
 * // Log messages at different levels
 * logger.info('Application started');
 * logger.debug('Initializing components', { component: 'database' });
 * logger.warn('Configuration missing, using defaults');
 * logger.error('Failed to connect', { retry: true });
 * ```
 */

// Types
export type {
	LogLevel,
	Logger,
	LoggerOptions,
	LogHandlerParams,
	BaseError,
} from './types';

// Log level handling
export {
	levels,
	shouldPublishLog,
} from './log-levels';

// Logger creation
export {
	createLogger,
	logger,
} from './logger-factory';

// Result-based error logging
export {
	logError,
	logErrorAsync,
} from './result-logging';
