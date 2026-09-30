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
export const themeToVars = function themeToVars(
	theme: Theme,
	isDark = false
): ThemeCSSVariables {
	return baseThemeToVars(theme, isDark);
};

/**
 * Generates a CSS string for the theme variables.
 */
export const generateThemeCSS = function generateThemeCSS(
	theme: Theme,
	colorScheme?: Parameters<typeof baseGenerateThemeCSS>[1]
): string {
	return baseGenerateThemeCSS(theme, colorScheme);
};

/**
 * Resolves styles for a component, merging theme slot styles with component styles.
 */
export const resolveComponentStyles = function resolveComponentStyles(
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
};

/**
 * Serialize a slot's `style` object for a `style` attribute.
 *
 * Svelte writes the attribute as text, so the keys have to be CSS property
 * names. camelCase keys, the form React and Vue slot styles use, become
 * kebab-case (`backgroundColor` to `background-color`, `WebkitMask` to
 * `-webkit-mask`, `msFlex` to `-ms-flex`). Custom properties (`--brand`)
 * are kept as written, and empty values are dropped.
 *
 * @param style - The resolved slot style.
 * @returns The attribute value, or `undefined` when there is nothing to set.
 * @internal
 */
export const toStyleAttribute = function toStyleAttribute(
	style: ClassNameStyle['style'] | undefined
): string | undefined {
	if (!style) {
		return undefined;
	}
	const declarations = Object.entries(style)
		.filter(
			([, value]) => value !== undefined && value !== null && value !== ''
		)
		.map(([key, value]) => {
			const property = key.startsWith('--')
				? key
				: key
						.replace(/^ms(?=[A-Z])/u, '-ms')
						.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
			return `${property}:${String(value)}`;
		});
	return declarations.length > 0 ? declarations.join(';') : undefined;
};

/** Resolve only host appearance; policy action constraints remain in core. */
export const resolveConsentActionStyle = (
	theme: Theme | undefined,
	action: 'accept' | 'reject' | 'customize' | 'dismiss' | 'save'
) => {
	const specific =
		action === 'save' ? undefined : theme?.consentActions?.[action];
	return { ...theme?.consentActions?.default, ...specific };
};
