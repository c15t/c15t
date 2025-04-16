import * as p from '@clack/prompts';
import type { CliContext } from '~/context/types';

/**
 * Handles CLI cancellation.
 */
export function HandleCancel(
	context: CliContext,
	message = 'Operation cancelled.'
) {
	context.logger.debug(`Handling cancellation: ${message}`);
	p.cancel(message);
	process.exit(0);
}
