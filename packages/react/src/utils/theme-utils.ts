/**
 * Utility functions for processing the v2 theme system.
 * Handles token-to-CSS variable conversion and dark mode overrides.
 */

import {
	defaultTheme as baseDefaultTheme,
	generateThemeCSS as baseGenerateThemeCSS,
	themeToVars as baseThemeToVars,
} from '@c15t/ui/theme';
import type { Theme } from '../types/theme/style-types';

/**
 * Default design tokens for the v2 theme system.
 */
export const defaultTheme = baseDefaultTheme as Required<
	Omit<Theme, 'slots' | 'dark'>
>;

/**
 * Maps theme tokens to CSS variables.
 */
export function themeToVars(
	theme: Theme,
	isDark = false
): Record<string, string> {
	return baseThemeToVars(theme as any, isDark);
}

/**
 * Generates a CSS string for the theme variables.
 */
export function generateThemeCSS(theme: Theme): string {
	return baseGenerateThemeCSS(theme as any);
}
