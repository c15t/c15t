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
	API_ERROR: {
		code: 'API_ERROR',
		hint: 'Check the error details and try again',
		message: 'API request failed',
	},
	AUTH_EXPIRED: {
		code: 'AUTH_EXPIRED',
		hint: 'Run `c15t login` to refresh your session',
		message: 'Session expired',
	},
	// --- Auth Errors ---
	AUTH_FAILED: {
		code: 'AUTH_FAILED',
		docs: `${URLS.CLI_DOCS}/auth`,
		hint: 'Try running `c15t login` again',
		message: 'Authentication failed',
	},
	AUTH_NOT_LOGGED_IN: {
		code: 'AUTH_NOT_LOGGED_IN',
		hint: 'Run `c15t login` to authenticate',
		message: 'Not logged in',
	},
	AUTH_TOKEN_INVALID: {
		code: 'AUTH_TOKEN_INVALID',
		hint: 'Try logging out with `c15t logout` and logging in again',
		message: 'Invalid authentication token',
	},
	CANCELLED: {
		code: 'CANCELLED',
		message: 'Operation cancelled',
	},

	// --- Command Errors ---
	COMMAND_NOT_FOUND: {
		code: 'COMMAND_NOT_FOUND',
		hint: 'Run `c15t --help` to see available commands',
		message: 'Unknown command',
	},
	CONFIG_EXISTS: {
		code: 'CONFIG_EXISTS',
		hint: 'Use --force to overwrite existing configuration',
		message: 'c15t configuration already exists',
	},
	CONFIG_INVALID: {
		code: 'CONFIG_INVALID',
		docs: `${URLS.DOCS}/configuration`,
		hint: 'Check your c15t.config.ts file for errors',
		message: 'Invalid c15t configuration',
	},
	CONFIG_NOT_FOUND: {
		code: 'CONFIG_NOT_FOUND',
		hint: 'Run `c15t generate` to create a configuration',
		message: 'c15t configuration not found',
	},
	CONTROL_PLANE_CONNECTION_FAILED: {
		code: 'CONTROL_PLANE_CONNECTION_FAILED',
		hint: `Check if ${URLS.CONSENT_IO} is accessible`,
		message: 'Could not connect to inth.com',
	},
	DEVICE_FLOW_DENIED: {
		code: 'DEVICE_FLOW_DENIED',
		hint: 'The login request was denied. Run `c15t login` to try again',
		message: 'Authentication denied',
	},
	DEVICE_FLOW_PENDING: {
		code: 'DEVICE_FLOW_PENDING',
		hint: 'Please complete the login in your browser',
		message: 'Waiting for authentication',
	},

	// --- Device Flow Errors ---
	DEVICE_FLOW_TIMEOUT: {
		code: 'DEVICE_FLOW_TIMEOUT',
		hint: 'The login request expired. Run `c15t login` to try again',
		message: 'Authentication timed out',
	},
	DIRECTORY_NOT_FOUND: {
		code: 'DIRECTORY_NOT_FOUND',
		message: 'Directory not found',
	},

	// --- File System Errors ---
	FILE_NOT_FOUND: {
		code: 'FILE_NOT_FOUND',
		message: 'File not found',
	},
	FILE_READ_ERROR: {
		code: 'FILE_READ_ERROR',
		hint: 'Check file permissions',
		message: 'Could not read file',
	},
	FILE_WRITE_ERROR: {
		code: 'FILE_WRITE_ERROR',
		hint: 'Check file permissions and disk space',
		message: 'Could not write file',
	},
	FLAG_VALUE_REQUIRED: {
		code: 'FLAG_VALUE_REQUIRED',
		message: 'Flag requires a value',
	},
	FRAMEWORK_NOT_DETECTED: {
		code: 'FRAMEWORK_NOT_DETECTED',
		docs: `${URLS.CLI_DOCS}/frameworks`,
		hint: 'Supported frameworks: Next.js, React, Remix, Vite',
		message: 'Could not detect framework',
	},

	// --- Install Errors ---
	INSTALL_FAILED: {
		code: 'INSTALL_FAILED',
		hint: 'Try running the install command manually',
		message: 'Package installation failed',
	},
	INSTANCE_NAME_INVALID: {
		code: 'INSTANCE_NAME_INVALID',
		hint: 'Project slugs must be alphanumeric with hyphens',
		message: 'Invalid project slug',
	},
	INSTANCE_NOT_FOUND: {
		code: 'INSTANCE_NOT_FOUND',
		hint: 'Run `c15t projects list` to see available projects',
		message: 'Project not found',
	},
	LAYOUT_NOT_FOUND: {
		code: 'LAYOUT_NOT_FOUND',
		hint: 'Make sure you have app/layout.tsx or pages/_app.tsx',
		message: 'Could not find layout file',
	},
	MIGRATION_CONFIG_MISSING: {
		code: 'MIGRATION_CONFIG_MISSING',
		hint: 'Make sure your c15t.config.ts includes database configuration',
		message: 'Migration configuration missing',
	},

	// --- Migration Errors ---
	MIGRATION_FAILED: {
		code: 'MIGRATION_FAILED',
		hint: 'Check the error details and database connection',
		message: 'Database migration failed',
	},

	// --- Network Errors ---
	NETWORK_ERROR: {
		code: 'NETWORK_ERROR',
		hint: 'Check your internet connection',
		message: 'Network request failed',
	},

	// --- Project Errors ---
	NOT_A_PROJECT: {
		code: 'NOT_A_PROJECT',
		hint: 'Make sure you are in a JavaScript/TypeScript project directory',
		message: 'No package.json found',
	},
	PACKAGE_MANAGER_NOT_FOUND: {
		code: 'PACKAGE_MANAGER_NOT_FOUND',
		hint: 'Make sure npm, yarn, pnpm, or bun is installed',
		message: 'Could not detect package manager',
	},
	SUBCOMMAND_REQUIRED: {
		code: 'SUBCOMMAND_REQUIRED',
		hint: 'Run the command with --help to see available subcommands',
		message: 'Subcommand required',
	},

	// --- Generic Errors ---
	UNKNOWN_ERROR: {
		code: 'UNKNOWN_ERROR',
		hint: `Please report this issue at ${URLS.GITHUB}/issues`,
		message: 'An unexpected error occurred',
	},

	// --- Validation Errors ---
	URL_INVALID: {
		code: 'URL_INVALID',
		hint: 'Expected format: https://your-project.inth.app',
		message: 'Invalid URL format',
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
		const { entry } = this;

		// Build message with context
		let { message } = entry;
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
export const isCliError = function isCliError(
	error: unknown,
	code?: ErrorCode
): error is CliError {
	if (!(error instanceof CliError)) {
		return false;
	}
	return code ? error.code === code : true;
};

/**
 * Create error handlers for the CLI context
 */
export const createErrorHandlers = function createErrorHandlers(
	logger: CliLogger,
	telemetry?: { trackError: (error: Error, command?: string) => void }
) {
	return {
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
	};
};

/**
 * Wrap an async function with error handling
 */
export const withErrorHandling = function withErrorHandling<
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
};
