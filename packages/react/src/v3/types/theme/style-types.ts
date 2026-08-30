import type {
	ClassNameStyle as BaseClassNameStyle,
	CSSPropertiesWithVars as BaseCSSPropertiesWithVars,
	Theme as BaseTheme,
	ThemeValue as BaseThemeValue,
} from '@c15t/ui/theme';
import type { CSSProperties } from 'react';

export type {
	ColorTokens,
	CSSVariables,
	MotionTokens,
	RadiusTokens,
	ShadowTokens,
	SpacingTokens,
	TypographyTokens,
} from '@c15t/ui/theme';

/**
 * Represents CSS properties with optional CSS variables.
 * @public
 */
export type CSSPropertiesWithVars<
	VariableMap = Record<string, string | number>,
> = CSSProperties & Partial<VariableMap>;

/**
 * Represents a style configuration that can include both inline styles and class names.
 * @public
 */
export interface ClassNameStyle<
	VariableMap = Record<string, string | number>,
> extends Omit<BaseClassNameStyle<VariableMap>, 'style'> {
	/** CSS properties to be applied inline to the component. */
	style?: CSSPropertiesWithVars<VariableMap>;
}

/**
 * Represents a style value that can be either a class name string or a {@link ClassNameStyle} object.
 * @public
 */
export type ThemeValue<VariableMap = Record<string, string | number>> =
	| string
	| ClassNameStyle<VariableMap>;

/**
 * Extends styling options with a reference to a global theme key.
 * @public
 */
export type ExtendThemeKeys<VariableMap = Record<string, string | number>> =
	ClassNameStyle<VariableMap>;

/**
 * Complete theme configuration for c15t consent components (v2).
 * @public
 */
export interface Theme extends Omit<BaseTheme, 'slots'> {
	/** Semantic button styling for consent actions. */
	consentActions?: BaseTheme['consentActions'];
}

/**
 * Helper function to define a theme with full TypeScript autocompletion and validation.
 * @public
 */
export function defineTheme<ThemeType extends Theme>(
	theme: ThemeType
): ThemeType {
	return theme;
}
