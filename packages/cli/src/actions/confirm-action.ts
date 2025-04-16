import * as p from '@clack/prompts';
import logger from '../utils/logger'; // Import the logger
import { HandleCancel } from './handle-cancel'; // Use kebab-case import

/**
 * Helper to confirm an action with the user
 */
export async function confirmAction(
	message: string,
	initialValue: boolean
): Promise<boolean> {
	logger.debug(`Confirm action: "${message}", Initial: ${initialValue}`); // Add debug log
	const confirmed = await p.confirm({ message, initialValue });
	if (p.isCancel(confirmed)) {
		logger.debug('Confirmation cancelled by user.'); // Add debug log
		HandleCancel();
		return false; // Unreachable
	}
	logger.debug(`Confirmation result: ${confirmed}`); // Add debug log
	return confirmed;
}
