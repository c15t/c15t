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
		value: 'prebuilt' as const,
		label: 'Prebuilt (Recommended)',
		hint: 'Ready-to-use components',
		description:
			'Single file with ConsentBanner component - simple to set up and customize',
	},
	{
		value: 'expanded' as const,
		label: 'Compound components',
		hint: 'Full customization control',
		description:
			'Separate files in consent-manager/ directory using compound components - full customization control',
	},
] as const;

/**
 * Get UI style display info
 */
export function getUIStyleInfo(
	style: UIStyle
): (typeof UI_STYLE_OPTIONS)[number] | undefined {
	return UI_STYLE_OPTIONS.find((s) => s.value === style);
}

/**
 * Prompt user to select UI component style
 *
 * @param context - CLI context
 * @param handleCancel - Function to handle prompt cancellations
 * @returns The selected UI style ('prebuilt' or 'expanded')
 */
export async function promptForUIStyle(
	context: CliContext,
	handleCancel?: (value: unknown) => boolean
): Promise<UIStyle> {
	context.logger.info(
		'Choose how you want your consent UI components generated.'
	);
	context.logger.info(
		'Learn more: https://c15t.com/docs/frameworks/nextjs/customization'
	);

	const result = await p.select({
		message: 'UI component style:',
		options: UI_STYLE_OPTIONS.map((option) => ({
			value: option.value,
			label: option.label,
			hint: option.hint,
		})),
		initialValue: 'prebuilt' as UIStyle,
	});

	if (handleCancel?.(result)) {
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'ui_style_selection',
		});
	}

	return result as UIStyle;
}
