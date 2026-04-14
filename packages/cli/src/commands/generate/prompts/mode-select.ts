/**
 * Storage mode selection prompts
 */

import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '~/context/types';
import { STORAGE_MODES, type StorageMode } from '../../../constants';

/**
 * Mode option definitions with user-friendly labels
 */
export const MODE_OPTIONS = [
	{
		value: STORAGE_MODES.HOSTED,
		label: 'Cloud Hosted',
		hint: 'Managed by inth.com (Recommended)',
		description:
			'Store consent data securely in the cloud with zero infrastructure',
	},
	{
		value: STORAGE_MODES.OFFLINE,
		label: 'Browser-Only',
		hint: 'No backend needed',
		description:
			'Store consent in browser cookies/localStorage (GDPR-compatible)',
	},
	{
		value: STORAGE_MODES.CUSTOM,
		label: 'Custom Backend',
		hint: 'Existing API',
		description: 'Connect to your existing consent management API',
	},
] as const;

/**
 * Get mode display info
 */
export function getModeInfo(
	mode: StorageMode
): (typeof MODE_OPTIONS)[number] | undefined {
	return MODE_OPTIONS.find((m) => m.value === mode);
}

/**
 * Prompt user to select storage mode
 */
export async function promptForMode(context: CliContext): Promise<StorageMode> {
	const { logger } = context;

	logger.message('');
	logger.message(color.bold('How would you like to store consent data?'));
	logger.message('');

	const result = await p.select({
		message: 'Select a storage mode:',
		options: MODE_OPTIONS.map((option) => ({
			value: option.value,
			label: option.label,
			hint: option.hint,
		})),
	});

	if (p.isCancel(result)) {
		context.error.handleCancel('Mode selection cancelled');
	}

	return result as StorageMode;
}

/**
 * Display mode explanation
 */
export function explainMode(context: CliContext, mode: StorageMode): void {
	const { logger } = context;
	const info = getModeInfo(mode);

	if (!info) return;

	logger.message('');
	logger.note(info.description, info.label);
}
