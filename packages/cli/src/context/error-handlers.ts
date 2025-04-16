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
			// Log error with full details
			logger.error(message, error);

			// Show error message (don't need p.log as logger already handles this)
			if (error instanceof Error) {
				logger.error(error.message);
			} else {
				logger.error(String(error));
			}

			// Use logger.outro for the final goodbye message
			logger.failed(`${color.red('Operation failed unexpectedly.')}`);
			process.exit(1);
		},

		/**
		 * Handles user cancellation in a consistent way
		 * @param message Optional message to display when cancelling
		 */
		handleCancel: (message = 'Operation cancelled.'): never => {
			logger.debug(`Handling cancellation: ${message}`);
			// Still need p.cancel for visual feedback
			// p.cancel(message);
			logger.failed(message);
			process.exit(0);
		},
	};
}
