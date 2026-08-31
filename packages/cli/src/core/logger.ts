/**
 * CLI Logger utilities
 *
 * Provides a consistent logging interface with CLI-specific formatting
 * using @clack/prompts for styled output.
 */

import * as p from '@clack/prompts';
import color from 'picocolors';

import type { CliLogger } from '../types';

// --- Log Levels ---
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export const LOG_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'debug'];

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 3,
	error: 0,
	info: 2,
	warn: 1,
};

// --- Message Formatting ---

/**
 * Format additional arguments for logging
 */
const formatArgs = function formatArgs(args: unknown[]): string {
	if (args.length === 0) {
		return '';
	}
	return `\n${args.map((arg) => `  - ${JSON.stringify(arg, null, 2)}`).join('\n')}`;
};

/**
 * Format a log message with appropriate styling based on log level
 */
export const formatLogMessage = function formatLogMessage(
	logLevel: LogLevel | 'success' | 'failed',
	message: unknown,
	args: unknown[] = []
): string {
	const messageStr = typeof message === 'string' ? message : String(message);
	const formattedArgs = formatArgs(args);

	switch (logLevel) {
		case 'error':
			return `${color.bgRed(color.black(' error '))} ${messageStr}${formattedArgs}`;
		case 'warn':
			return `${color.bgYellow(color.black(' warning '))} ${messageStr}${formattedArgs}`;
		case 'info':
			return `${color.bgGreen(color.black(' info '))} ${messageStr}${formattedArgs}`;
		case 'debug':
			return `${color.bgBlack(color.white(' debug '))} ${messageStr}${formattedArgs}`;
		case 'success':
			return `${color.bgGreen(color.white(' success '))} ${messageStr}${formattedArgs}`;
		case 'failed':
			return `${color.bgRed(color.white(' failed '))} ${messageStr}${formattedArgs}`;
		default:
			return `[${String(logLevel).toUpperCase()}] ${messageStr}${formattedArgs}`;
	}
};

/**
 * Log a message with the appropriate clack prompt styling
 */
const logMessage = function logMessage(
	logLevel: LogLevel | 'success' | 'failed',
	message: unknown,
	...args: unknown[]
): void {
	const formattedMessage = formatLogMessage(logLevel, message, args);

	switch (logLevel) {
		case 'error':
			p.log.error(formattedMessage);
			break;
		case 'warn':
			p.log.warn(formattedMessage);
			break;
		case 'info':
		case 'debug':
			p.log.info(formattedMessage);
			break;
		case 'success':
		case 'failed':
			p.outro(formattedMessage);
			break;
		default:
			p.log.message(formattedMessage);
	}
};

// --- Step Indicator ---

/**
 * Format a step progress indicator
 */
export const formatStep = function formatStep(
	current: number,
	total: number,
	label: string
): string {
	const filled = color.green('█'.repeat(current));
	const empty = color.dim('░'.repeat(total - current));
	return `[${filled}${empty}] Step ${current}/${total}: ${label}`;
};

// --- Logger Factory ---

/**
 * Create a CLI logger instance
 */
export const createCliLogger = function createCliLogger(
	level: LogLevel = 'info'
): CliLogger {
	const currentLevelPriority = LOG_LEVEL_PRIORITY[level];

	const shouldLog = (targetLevel: LogLevel): boolean =>
		LOG_LEVEL_PRIORITY[targetLevel] <= currentLevelPriority;

	// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
	return {
		// Standard log levels
		debug(message: string, ...args: unknown[]): void {
			if (shouldLog('debug')) {
				logMessage('debug', message, ...args);
			}
		},

		info(message: string, ...args: unknown[]): void {
			if (shouldLog('info')) {
				logMessage('info', message, ...args);
			}
		},

		warn(message: string, ...args: unknown[]): void {
			if (shouldLog('warn')) {
				logMessage('warn', message, ...args);
			}
		},

		error(message: string, ...args: unknown[]): void {
			if (shouldLog('error')) {
				logMessage('error', message, ...args);
			}
		},

		// CLI-specific methods
		message(message: string): void {
			p.log.message(message);
		},

		note(content: string, title?: string): void {
			p.note(content, title, {
				format: (line: string) => line,
			});
		},

		success(message: string): void {
			logMessage('success', message);
		},

		failed(message: string): never {
			logMessage('failed', message);
			process.exit(1);
		},

		outro(message: string): void {
			p.outro(message);
		},

		step(current: number, total: number, label: string): void {
			p.log.step(formatStep(current, total, label));
		},
	};
};

// --- Spinner Utilities ---

export interface Spinner {
	start: (message?: string) => void;
	stop: (message?: string) => void;
	message: (message: string) => void;
}

/**
 * Create a spinner for long-running operations
 */
export const createSpinner = function createSpinner(
	initialMessage?: string
): Spinner {
	const spinner = p.spinner();

	return {
		message(message: string): void {
			spinner.message(message);
		},

		start(message?: string): void {
			spinner.start(message || initialMessage || 'Processing...');
		},

		stop(message?: string): void {
			spinner.stop(message || 'Done');
		},
	};
};

/**
 * Run an async task with a spinner
 */
export const withSpinner = async function withSpinner<T>(
	message: string,
	task: () => Promise<T>,
	options?: {
		successMessage?: string;
		errorMessage?: string;
	}
): Promise<T> {
	const spinner = createSpinner(message);
	spinner.start();

	try {
		const result = await task();
		spinner.stop(options?.successMessage || 'Done');
		return result;
	} catch (error) {
		spinner.stop(options?.errorMessage || 'Failed');
		throw error;
	}
};

// --- Color Utilities ---

export { color };

export const colors = {
	bold: color.bold,
	error: color.red,
	highlight: color.cyan,
	info: color.blue,
	muted: color.dim,
	success: color.green,
	underline: color.underline,
	warning: color.yellow,
} as const;
