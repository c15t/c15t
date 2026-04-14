/**
 * Error catalog and error handling utilities for the c15t CLI
 *
 * All CLI errors should use the CliError class with a code from ERROR_CATALOG.
 * This ensures consistent, actionable error messages with helpful hints.
 */

import { URLS } from '../constants';
import type { CliLogger } from '../types';

// --- Error Catalog ---
export const ERROR_CATALOG = {
	// --- Auth Errors ---
	AUTH_FAILED: {
		code: 'AUTH_FAILED',
		message: 'Authentication failed',
		hint: 'Try running `c15t login` again',
		docs: `${URLS.CLI_DOCS}/auth`,
	},
	AUTH_EXPIRED: {
		code: 'AUTH_EXPIRED',
		message: 'Session expired',
		hint: 'Run `c15t login` to refresh your session',
	},
	AUTH_NOT_LOGGED_IN: {
		code: 'AUTH_NOT_LOGGED_IN',
		message: 'Not logged in',
		hint: 'Run `c15t login` to authenticate',
	},
	AUTH_TOKEN_INVALID: {
		code: 'AUTH_TOKEN_INVALID',
		message: 'Invalid authentication token',
		hint: 'Try logging out with `c15t logout` and logging in again',
	},

	// --- Device Flow Errors ---
	DEVICE_FLOW_TIMEOUT: {
		code: 'DEVICE_FLOW_TIMEOUT',
		message: 'Authentication timed out',
		hint: 'The login request expired. Run `c15t login` to try again',
	},
	DEVICE_FLOW_DENIED: {
		code: 'DEVICE_FLOW_DENIED',
		message: 'Authentication denied',
		hint: 'The login request was denied. Run `c15t login` to try again',
	},
	DEVICE_FLOW_PENDING: {
		code: 'DEVICE_FLOW_PENDING',
		message: 'Waiting for authentication',
		hint: 'Please complete the login in your browser',
	},

	// --- Project Errors ---
	NOT_A_PROJECT: {
		code: 'NOT_A_PROJECT',
		message: 'No package.json found',
		hint: 'Make sure you are in a JavaScript/TypeScript project directory',
	},
	FRAMEWORK_NOT_DETECTED: {
		code: 'FRAMEWORK_NOT_DETECTED',
		message: 'Could not detect framework',
		hint: 'Supported frameworks: Next.js, React, Remix, Vite',
		docs: `${URLS.CLI_DOCS}/frameworks`,
	},
	LAYOUT_NOT_FOUND: {
		code: 'LAYOUT_NOT_FOUND',
		message: 'Could not find layout file',
		hint: 'Make sure you have app/layout.tsx or pages/_app.tsx',
	},
	CONFIG_EXISTS: {
		code: 'CONFIG_EXISTS',
		message: 'c15t configuration already exists',
		hint: 'Use --force to overwrite existing configuration',
	},
	CONFIG_NOT_FOUND: {
		code: 'CONFIG_NOT_FOUND',
		message: 'c15t configuration not found',
		hint: 'Run `c15t generate` to create a configuration',
	},
	CONFIG_INVALID: {
		code: 'CONFIG_INVALID',
		message: 'Invalid c15t configuration',
		hint: 'Check your c15t.config.ts file for errors',
		docs: `${URLS.DOCS}/configuration`,
	},

	// --- Network Errors ---
	NETWORK_ERROR: {
		code: 'NETWORK_ERROR',
		message: 'Network request failed',
		hint: 'Check your internet connection',
	},
	CONTROL_PLANE_CONNECTION_FAILED: {
		code: 'CONTROL_PLANE_CONNECTION_FAILED',
		message: 'Could not connect to consent.io',
		hint: `Check if ${URLS.CONSENT_IO} is accessible`,
	},
	API_ERROR: {
		code: 'API_ERROR',
		message: 'API request failed',
		hint: 'Check the error details and try again',
	},

	// --- Validation Errors ---
	URL_INVALID: {
		code: 'URL_INVALID',
		message: 'Invalid URL format',
		hint: 'Expected format: https://your-project.inth.app',
	},
	INSTANCE_NOT_FOUND: {
		code: 'INSTANCE_NOT_FOUND',
		message: 'Project not found',
		hint: 'Run `c15t projects list` to see available projects',
	},
	INSTANCE_NAME_INVALID: {
		code: 'INSTANCE_NAME_INVALID',
		message: 'Invalid project slug',
		hint: 'Project slugs must be alphanumeric with hyphens',
	},

	// --- File System Errors ---
	FILE_NOT_FOUND: {
		code: 'FILE_NOT_FOUND',
		message: 'File not found',
	},
	FILE_READ_ERROR: {
		code: 'FILE_READ_ERROR',
		message: 'Could not read file',
		hint: 'Check file permissions',
	},
	FILE_WRITE_ERROR: {
		code: 'FILE_WRITE_ERROR',
		message: 'Could not write file',
		hint: 'Check file permissions and disk space',
	},
	DIRECTORY_NOT_FOUND: {
		code: 'DIRECTORY_NOT_FOUND',
		message: 'Directory not found',
	},

	// --- Command Errors ---
	COMMAND_NOT_FOUND: {
		code: 'COMMAND_NOT_FOUND',
		message: 'Unknown command',
		hint: 'Run `c15t --help` to see available commands',
	},
	SUBCOMMAND_REQUIRED: {
		code: 'SUBCOMMAND_REQUIRED',
		message: 'Subcommand required',
		hint: 'Run the command with --help to see available subcommands',
	},
	FLAG_VALUE_REQUIRED: {
		code: 'FLAG_VALUE_REQUIRED',
		message: 'Flag requires a value',
	},

	// --- Install Errors ---
	INSTALL_FAILED: {
		code: 'INSTALL_FAILED',
		message: 'Package installation failed',
		hint: 'Try running the install command manually',
	},
	PACKAGE_MANAGER_NOT_FOUND: {
		code: 'PACKAGE_MANAGER_NOT_FOUND',
		message: 'Could not detect package manager',
		hint: 'Make sure npm, yarn, pnpm, or bun is installed',
	},

	// --- Migration Errors ---
	MIGRATION_FAILED: {
		code: 'MIGRATION_FAILED',
		message: 'Database migration failed',
		hint: 'Check the error details and database connection',
	},
	MIGRATION_CONFIG_MISSING: {
		code: 'MIGRATION_CONFIG_MISSING',
		message: 'Migration configuration missing',
		hint: 'Make sure your c15t.config.ts includes database configuration',
	},

	// --- Generic Errors ---
	UNKNOWN_ERROR: {
		code: 'UNKNOWN_ERROR',
		message: 'An unexpected error occurred',
		hint: `Please report this issue at ${URLS.GITHUB}/issues`,
	},
	CANCELLED: {
		code: 'CANCELLED',
		message: 'Operation cancelled',
	},
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

// --- CLI Error Class ---
export class CliError extends Error {
	/** Error code from the catalog */
	readonly code: ErrorCode;
	/** Additional context for the error */
	readonly context?: Record<string, unknown>;
	/** The error catalog entry */
	readonly entry: (typeof ERROR_CATALOG)[ErrorCode];

	constructor(code: ErrorCode, context?: Record<string, unknown>) {
		const entry = ERROR_CATALOG[code];
		super(entry.message);
		this.name = 'CliError';
		this.code = code;
		this.context = context;
		this.entry = entry;

		// Maintain proper stack trace in V8
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, CliError);
		}
	}

	/**
	 * Display the error with hints and documentation links
	 */
	display(logger: CliLogger): void {
		const entry = this.entry;

		// Build message with context
		let message = entry.message;
		if (this.context?.details) {
			message += `: ${this.context.details}`;
		}

		logger.error(message);

		if ('hint' in entry && entry.hint) {
			logger.info(`Hint: ${entry.hint}`);
		}

		if ('docs' in entry && entry.docs) {
			logger.info(`Docs: ${entry.docs}`);
		}
	}

	/**
	 * Create a CliError from an unknown error
	 */
	static from(
		error: unknown,
		fallbackCode: ErrorCode = 'UNKNOWN_ERROR'
	): CliError {
		if (error instanceof CliError) {
			return error;
		}

		const message = error instanceof Error ? error.message : String(error);
		return new CliError(fallbackCode, {
			details: message,
			originalError: error,
		});
	}
}

// --- Error Helpers ---

/**
 * Check if an error is a CliError with a specific code
 */
export function isCliError(
	error: unknown,
	code?: ErrorCode
): error is CliError {
	if (!(error instanceof CliError)) {
		return false;
	}
	return code ? error.code === code : true;
}

/**
 * Create error handlers for the CLI context
 */
export function createErrorHandlers(
	logger: CliLogger,
	telemetry?: { trackError: (error: Error, command?: string) => void }
) {
	return {
		handleError: (error: unknown, message: string): never => {
			const cliError = CliError.from(error);

			// Track the error
			if (telemetry) {
				telemetry.trackError(cliError, message);
			}

			// Display the error
			cliError.display(logger);

			process.exit(1);
		},

		handleCancel: (
			message?: string,
			context?: { command?: string; stage?: string }
		): never => {
			const cancelMessage = message || 'Operation cancelled';
			logger.warn(cancelMessage);

			if (context?.command) {
				logger.info(`Command: ${context.command}`);
			}

			process.exit(0);
		},
	};
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<
	T extends (...args: unknown[]) => Promise<unknown>,
>(fn: T, logger: CliLogger, context?: { command?: string }): T {
	return (async (...args: Parameters<T>) => {
		try {
			return await fn(...args);
		} catch (error) {
			const cliError = CliError.from(error);
			cliError.display(logger);
			if (context?.command) {
				logger.info(`Command: ${context.command}`);
			}
			process.exit(1);
		}
	}) as T;
}
