/**
 * CLI Logger utilities
 *
 * Provides a consistent logging interface with CLI-specific formatting.
 */

import {
	color,
	createCliLogger as createHexbusCliLogger,
	createSpinner as createHexbusSpinner,
	formatLogMessage,
	logMessage,
} from 'hexbus';
import type { CliLogger } from '../types';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// --- Log Levels ---
export const LOG_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'debug'];
export { formatLogMessage, logMessage };

// --- Step Indicator ---

/**
 * Format a step progress indicator
 */
export function formatStep(
	current: number,
	total: number,
	label: string
): string {
	const filled = color.green('█'.repeat(current));
	const empty = color.dim('░'.repeat(total - current));
	return `[${filled}${empty}] Step ${current}/${total}: ${label}`;
}

// --- Logger Factory ---

/**
 * Create a CLI logger instance
 */
export function createCliLogger(level: LogLevel = 'info'): CliLogger {
	return createHexbusCliLogger(level);
}

// --- Spinner Utilities ---

export interface Spinner {
	start(message?: string): void;
	stop(message?: string): void;
	message(message: string): void;
}

/**
 * Create a spinner for long-running operations
 */
export function createSpinner(initialMessage?: string): Spinner {
	return createHexbusSpinner(initialMessage);
}

/**
 * Run an async task with a spinner
 */
export async function withSpinner<T>(
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
}

// --- Color Utilities ---

export { color };

export const colors = {
	success: color.green,
	error: color.red,
	warning: color.yellow,
	info: color.blue,
	muted: color.dim,
	highlight: color.cyan,
	bold: color.bold,
	underline: color.underline,
} as const;
