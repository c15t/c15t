import * as p from '@clack/prompts';

import type { CliContext } from './types';

/**
 * Creates user interaction utilities for the CLI context
 */
export const createUserInteraction = function createUserInteraction(
	context: CliContext
) {
	const { logger, error } = context;

	return {
		/**
		 * Confirm an action with the user
		 * @param message The message to display
		 * @param initialValue The initial value (true/false)
		 * @returns Whether the user confirmed
		 */
		confirm: async (
			message: string,
			initialValue: boolean
		): Promise<boolean> => {
			logger.debug(`Confirm action: "${message}", Initial: ${initialValue}`);

			const confirmed = await p.confirm({ initialValue, message });

			if (p.isCancel(confirmed)) {
				error.handleCancel();
				// Unreachable, but TypeScript doesn't know that
				return false;
			}

			logger.debug(`Confirmation result: ${confirmed}`);
			return confirmed;
		},
	};
};
