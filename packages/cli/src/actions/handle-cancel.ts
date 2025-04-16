import * as p from '@clack/prompts';
import logger from '~/utils/logger';

/**
 * Handles CLI cancellation.
 */
export function HandleCancel(message = 'Operation cancelled.') {
	logger.debug(`Handling cancellation: ${message}`);
	p.cancel(message);
	process.exit(0);
}
