import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from './types';

/**
 * Creates error handling utilities for the CLI context
 */
export function createErrorHandlers(context: CliContext) {
	const { logger } = context;

	return {
		/**
		 * Handles errors in a consistent way across the CLI
		 * @param error The error that occurred
		 * @param message A message describing the error context
		 */
		handleError: (error: unknown, message: string): never => {
			logger.error(message, error);
			p.log.error(message);

			if (error instanceof Error) {
				p.log.message(error.message);
			} else {
				p.log.message(String(error));
			}

			p.outro(`${color.red('Operation failed unexpectedly.')}`);
			process.exit(1);
		},

		/**
		 * Handles user cancellation in a consistent way
		 * @param message Optional message to display when cancelling
		 */
		handleCancel: (message = 'Operation cancelled.'): never => {
			logger.debug(`Handling cancellation: ${message}`);
			p.cancel(message);
			process.exit(0);
		},
	};
}
