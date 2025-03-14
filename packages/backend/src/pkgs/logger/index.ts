/**
 * Logger Package
 *
 * This package provides logging utilities for C15T applications.
 * It includes error logging utilities that work with the Result pattern.
 */

export {
	logError,
	logErrorAsync,
} from './logging';

export {
	createLogger,
	logger,
	type LogLevel,
	levels,
	shouldPublishLog,
	type Logger,
} from './logger';
