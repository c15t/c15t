/**
 * Expanded theme selection prompts
 * Allows users to choose a theme preset when using expanded UI components
 */

import * as p from '@clack/prompts';

import type { CliContext } from '~/context/types';

/**
 * Available expanded theme options
 */
export type ExpandedTheme = 'none' | 'minimal' | 'dark' | 'tailwind';

/**
 * Expanded theme option definitions with user-friendly labels
 */
export const EXPANDED_THEME_OPTIONS = [
	{
		description: 'No preset styling - you control the theme completely',
		hint: 'No preset styling',
		label: 'None',
		value: 'none' as const,
	},
	{
		description:
			'Clean, light theme with subtle grays and refined typography - uses standard CSS',
		hint: 'Clean light theme',
		label: 'Minimal',
		value: 'minimal' as const,
	},
	{
		description:
			'Vercel-style black and white high contrast theme - stays dark regardless of system preference',
		hint: 'High contrast dark mode',
		label: 'Dark',
		value: 'dark' as const,
	},
	{
		description:
			'Standard Tailwind colors (blue/slate), backdrop blur effects, utility class-based styling',
		hint: 'Uses Tailwind utility classes',
		label: 'Tailwind',
		value: 'tailwind' as const,
	},
] as const;

/**
 * Get expanded theme display info
 */
export const getExpandedThemeInfo = function getExpandedThemeInfo(
	theme: ExpandedTheme
): (typeof EXPANDED_THEME_OPTIONS)[number] | undefined {
	return EXPANDED_THEME_OPTIONS.find((t) => t.value === theme);
};

/**
 * Prompt user to select expanded theme preset
 *
 * @param context - CLI context
 * @param handleCancel - Function to handle prompt cancellations
 * @returns The selected expanded theme ('none', 'minimal', 'dark', or 'tailwind')
 */
export const promptForExpandedTheme = async function promptForExpandedTheme(
	context: CliContext,
	handleCancel?: (value: unknown) => boolean
): Promise<ExpandedTheme> {
	context.logger.info('Choose a theme preset for your compound components.');
	context.logger.info(
		'You can customize the theme further by editing the generated theme.ts file.'
	);

	const result = await p.select({
		initialValue: 'none' as ExpandedTheme,
		message: 'Theme preset:',
		options: EXPANDED_THEME_OPTIONS.map((option) => ({
			hint: option.hint,

			label: option.label,
			value: option.value,
		})),
	});

	if (handleCancel?.(result)) {
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'expanded_theme_selection',
		});
	}

	return result as ExpandedTheme;
};
