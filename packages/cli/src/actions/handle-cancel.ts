import * as p from '@clack/prompts';

/**
 * Handles CLI cancellation.
 */
export function HandleCancel(message = 'Operation cancelled.') {
	p.cancel(message);
	process.exit(0);
}
