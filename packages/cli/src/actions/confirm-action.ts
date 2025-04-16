import * as p from '@clack/prompts';
import { HandleCancel } from './handle-cancel'; // Use kebab-case import

/**
 * Helper to confirm an action with the user
 */
export async function confirmAction(
	message: string,
	initialValue: boolean
): Promise<boolean> {
	const confirmed = await p.confirm({ message, initialValue });
	if (p.isCancel(confirmed)) {
		HandleCancel();
		return false; // Unreachable
	}
	return confirmed;
}
