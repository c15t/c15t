/**
 * UI style selection prompts
 * Allows users to choose between prebuilt components (single file) or expanded components (directory structure)
 */

import * as p from '@clack/prompts';

import type { CliContext } from '~/context/types';

/**
 * Available UI style options
 */
export type UIStyle = 'prebuilt' | 'expanded';

/**
 * UI style option definitions with user-friendly labels
 */
export const UI_STYLE_OPTIONS = [
	{
		description:
			'Single file with ConsentBanner component - simple to set up and customize',
		hint: 'Ready-to-use components',
		label: 'Prebuilt (Recommended)',
		value: 'prebuilt' as const,
	},
	{
		description:
			'Separate files in consent-manager/ directory using compound components - full customization control',
		hint: 'Full customization control',
		label: 'Compound components',
		value: 'expanded' as const,
	},
] as const;

/**
 * Get UI style display info
 */
export const getUIStyleInfo = function getUIStyleInfo(
	style: UIStyle
): (typeof UI_STYLE_OPTIONS)[number] | undefined {
	return UI_STYLE_OPTIONS.find((s) => s.value === style);
};

/**
 * Prompt user to select UI component style
 *
 * @param context - CLI context
 * @param handleCancel - Function to handle prompt cancellations
 * @returns The selected UI style ('prebuilt' or 'expanded')
 */
export const promptForUIStyle = async function promptForUIStyle(
	context: CliContext,
	handleCancel?: (value: unknown) => boolean
): Promise<UIStyle> {
	context.logger.info(
		'Choose how you want your consent UI components generated.'
	);
	context.logger.info(
		'Learn more: https://c15t.com/docs/frameworks/next/styling/overview'
	);

	const result = await p.select({
		initialValue: 'prebuilt' as UIStyle,
		message: 'UI component style:',
		options: UI_STYLE_OPTIONS.map((option) => ({
			hint: option.hint,

			label: option.label,
			value: option.value,
		})),
	});

	if (handleCancel?.(result)) {
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'ui_style_selection',
		});
	}

	return result as UIStyle;
};
