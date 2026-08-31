/**
 * Storage mode selection prompts
 */

import * as p from '@clack/prompts';
import color from 'picocolors';

import type { CliContext } from '~/context/types';

import { STORAGE_MODES } from '../../../constants';
import type { StorageMode } from '../../../constants';

/**
 * Mode option definitions with user-friendly labels
 */
export const MODE_OPTIONS = [
	{
		description:
			'Store consent data securely in the cloud with zero infrastructure',
		hint: 'Managed by inth.com (Recommended)',
		label: 'Cloud Hosted',
		value: STORAGE_MODES.HOSTED,
	},
	{
		description:
			'Store consent in browser cookies/localStorage (GDPR-compatible)',
		hint: 'No backend needed',
		label: 'Browser-Only',
		value: STORAGE_MODES.OFFLINE,
	},
	{
		description: 'Connect to your existing consent management API',
		hint: 'Existing API',
		label: 'Custom Backend',
		value: STORAGE_MODES.CUSTOM,
	},
] as const;

/**
 * Get mode display info
 */
export const getModeInfo = function getModeInfo(
	mode: StorageMode
): (typeof MODE_OPTIONS)[number] | undefined {
	return MODE_OPTIONS.find((m) => m.value === mode);
};

/**
 * Prompt user to select storage mode
 */
export const promptForMode = async function promptForMode(
	context: CliContext
): Promise<StorageMode> {
	const { logger } = context;

	logger.message('');
	logger.message(color.bold('How would you like to store consent data?'));
	logger.message('');

	const result = await p.select({
		message: 'Select a storage mode:',
		options: MODE_OPTIONS.map((option) => ({
			hint: option.hint,
			label: option.label,
			value: option.value,
		})),
	});

	if (p.isCancel(result)) {
		context.error.handleCancel('Mode selection cancelled');
	}

	return result as StorageMode;
};

/**
 * Display mode explanation
 */
export const explainMode = function explainMode(
	context: CliContext,
	mode: StorageMode
): void {
	const { logger } = context;
	const info = getModeInfo(mode);

	if (!info) {
		return;
	}

	logger.message('');
	logger.note(info.description, info.label);
};
