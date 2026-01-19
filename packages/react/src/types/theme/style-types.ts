import type {
	ClassNameStyle as BaseClassNameStyle,
	CSSPropertiesWithVars as BaseCSSPropertiesWithVars,
	Theme as BaseTheme,
	ThemeValue as BaseThemeValue,
} from '@c15t/ui/theme';
import type { CSSProperties } from 'react';
import type { AllThemeKeys } from './style-keys';

export type {
	ColorTokens,
	ComponentSlots,
	CSSVariables,
	MotionTokens,
	RadiusTokens,
	ShadowTokens,
	SlotStyle,
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
export interface ClassNameStyle<VariableMap = Record<string, string | number>>
	extends Omit<BaseClassNameStyle<VariableMap>, 'style'> {
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
export interface ExtendThemeKeys<VariableMap = Record<string, string | number>>
	extends ClassNameStyle<VariableMap> {
	/** Optional key to reference a specific part of the global theme. */
	themeKey?: AllThemeKeys;
}

/**
 * Complete theme configuration for c15t consent components (v2).
 * @public
 */
export interface Theme extends Omit<BaseTheme, 'slots'> {
	/** Component-specific style overrides. */
	slots?: BaseTheme['slots'];
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
