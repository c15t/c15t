/**
 * Theme and styling utilities for Svelte components.
 */

import type {
	AllThemeKeys,
	ClassNameStyle,
	Theme,
	ThemeCSSVariables,
	ThemeValue,
} from '@c15t/ui/theme';
import {
	defaultTheme as baseDefaultTheme,
	generateThemeCSS as baseGenerateThemeCSS,
	themeToVars as baseThemeToVars,
} from '@c15t/ui/theme';
import { resolveStyles as baseResolveStyles } from '@c15t/ui/utils';

/**
 * Default design tokens for the theme system.
 */
export const defaultTheme = baseDefaultTheme as Required<Omit<Theme, 'slots'>>;

/**
 * Maps theme tokens to CSS variables.
 */
export function themeToVars(theme: Theme, isDark = false): ThemeCSSVariables {
	return baseThemeToVars(theme, isDark);
}

/**
 * Generates a CSS string for the theme variables.
 */
export function generateThemeCSS(theme: Theme): string {
	return baseGenerateThemeCSS(theme);
}

/**
 * Resolves styles for a component, merging theme slot styles with component styles.
 */
export function resolveComponentStyles(
	themeKey: AllThemeKeys,
	theme: Theme | undefined,
	componentStyle: ClassNameStyle | undefined,
	noStyle: boolean | undefined
): ClassNameStyle {
	return baseResolveStyles(
		themeKey,
		theme,
		componentStyle as ThemeValue | undefined,
		noStyle
	) as ClassNameStyle;
}
