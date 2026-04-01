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
		value: 'default',
		label: 'Default',
		hint: 'c15t branded theme',
		description: 'Modern look with c15t branding',
	},
	{
		value: 'minimal',
		label: 'Minimal',
		hint: 'Clean, simple styling',
		description: 'Clean design that fits any site',
	},
	{
		value: 'system',
		label: 'System',
		hint: 'Follows OS light/dark mode',
		description: "Automatically matches your users' system preference",
	},
	{
		value: 'none',
		label: 'Unstyled',
		hint: 'BYO CSS',
		description: 'No styles included - bring your own CSS',
	},
] as const;

export type ThemeId = (typeof THEME_OPTIONS)[number]['value'];

/**
 * Get theme info by ID
 */
export function getThemeInfo(
	id: ThemeId
): (typeof THEME_OPTIONS)[number] | undefined {
	return THEME_OPTIONS.find((t) => t.value === id);
}

/**
 * Prompt user to select a theme
 */
export async function promptForTheme(context: CliContext): Promise<ThemeId> {
	const { logger } = context;

	logger.message('');
	logger.message(color.bold('Choose a theme for your consent banner:'));
	logger.message('');

	const result = await p.select({
		message: 'Select a theme:',
		options: THEME_OPTIONS.map((option) => ({
			value: option.value,
			label: option.label,
			hint: option.hint,
		})),
	});

	if (p.isCancel(result)) {
		// Default to 'default' theme
		return 'default';
	}

	return result as ThemeId;
}

/**
 * Generate theme configuration
 */
export function generateThemeConfig(theme: ThemeId): string {
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
}

/**
 * Generate CSS import for theme
 */
export function getThemeCssImport(
	theme: ThemeId,
	framework?: 'react' | 'nextjs'
): string | null {
	const pkg = framework === 'nextjs' ? '@c15t/nextjs' : '@c15t/react';

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
}
