/**
 * Theme selection prompts
 */

import * as p from '@clack/prompts';
import color from 'picocolors';

import type { CliContext } from '~/context/types';

/**
 * Theme preset options
 */
export const THEME_OPTIONS = [
	{
		description: 'Modern look with c15t branding',
		hint: 'c15t branded theme',
		label: 'Default',
		value: 'default',
	},
	{
		description: 'Clean design that fits any site',
		hint: 'Clean, simple styling',
		label: 'Minimal',
		value: 'minimal',
	},
	{
		description: "Automatically matches your users' system preference",
		hint: 'Follows OS light/dark mode',
		label: 'System',
		value: 'system',
	},
	{
		description: 'No styles included - bring your own CSS',
		hint: 'BYO CSS',
		label: 'Unstyled',
		value: 'none',
	},
] as const;

export type ThemeId = (typeof THEME_OPTIONS)[number]['value'];

/**
 * Get theme info by ID
 */
export const getThemeInfo = function getThemeInfo(
	id: ThemeId
): (typeof THEME_OPTIONS)[number] | undefined {
	return THEME_OPTIONS.find((t) => t.value === id);
};

/**
 * Prompt user to select a theme
 */
export const promptForTheme = async function promptForTheme(
	context: CliContext
): Promise<ThemeId> {
	const { logger } = context;

	logger.message('');
	logger.message(color.bold('Choose a theme for your consent banner:'));
	logger.message('');

	const result = await p.select({
		message: 'Select a theme:',
		options: THEME_OPTIONS.map((option) => ({
			hint: option.hint,
			label: option.label,
			value: option.value,
		})),
	});

	if (p.isCancel(result)) {
		// Default to 'default' theme
		return 'default';
	}

	return result as ThemeId;
};

/**
 * Generate theme configuration
 */
export const generateThemeConfig = function generateThemeConfig(
	theme: ThemeId
): string {
	switch (theme) {
		case 'default':
			return `theme: {
		colorMode: 'light',
		accentColor: '#0ea5e9',
		borderRadius: 'md',
	}`;
		case 'minimal':
			return `theme: {
		colorMode: 'light',
		accentColor: '#000000',
		borderRadius: 'sm',
	}`;
		case 'system':
			return `theme: {
		colorMode: 'system',
		accentColor: '#0ea5e9',
		borderRadius: 'md',
	}`;
		case 'none':
			return `theme: {
		unstyled: true,
	}`;
		default:
			return '';
	}
};

/**
 * Generate CSS import for theme
 */
export const getThemeCssImport = function getThemeCssImport(
	theme: ThemeId,
	framework?: 'react' | 'nextjs'
): string | null {
	const pkg = framework === 'nextjs' ? 'c15t/next' : 'c15t/react';

	switch (theme) {
		case 'default':
		case 'minimal':
		case 'system':
			return `${pkg}/styles.css`;
		case 'none':
			return null;
		default:
			return `${pkg}/styles.css`;
	}
};
