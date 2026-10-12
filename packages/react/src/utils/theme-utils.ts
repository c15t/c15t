/**
 * Utility functions for processing the v2 theme system.
 * Handles token-to-CSS variable conversion and dark mode overrides.
 */

import type { ThemeCSSVariables } from '@c15t/ui/theme';
import {
	defaultTheme as baseDefaultTheme,
	generateThemeCSS as baseGenerateThemeCSS,
	themeToVars as baseThemeToVars,
} from '@c15t/ui/theme';

import type { Theme } from '../types/theme/style-types';

/**
 * Default design tokens for the v2 theme system.
 */
export const defaultTheme = baseDefaultTheme as Required<Omit<Theme, 'slots'>>;

/**
 * Maps theme tokens to CSS variables.
 */
export const themeToVars = function themeToVars(
	theme: Theme,
	isDark = false
): ThemeCSSVariables {
	return baseThemeToVars(theme, isDark);
};

/**
 * Generates a CSS string for the theme variables, the same CSS as
 * `generateThemeCSS` from `@c15t/ui/theme`.
 *
 * @param theme - Theme tokens to serialize.
 * @param colorScheme - `'dark'` makes the dark tokens the default,
 * `'system'` follows `prefers-color-scheme`, and `'light'` adds the stock
 * dark palette under the dark classes. Omit it, or pass `null`, to write
 * only the theme's own tokens.
 * @returns Theme CSS for a `<style>` element or a stylesheet.
 * @example
 * ```ts
 * import { generateThemeCSS } from '@c15t/react/utils';
 *
 * const css = generateThemeCSS({ dark: { primary: '#7fd1a8' } }, 'system');
 * ```
 */
export const generateThemeCSS = function generateThemeCSS(
	theme: Theme,
	colorScheme?: Parameters<typeof baseGenerateThemeCSS>[1]
): string {
	return baseGenerateThemeCSS(theme, colorScheme);
};
