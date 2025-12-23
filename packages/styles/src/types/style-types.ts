import type { ClassValue } from 'clsx';
import type { AllThemeKeys } from './style-keys';

/**
 * Represents CSS properties with optional CSS variables
 * @public
 */
export type CSSPropertiesWithVars<
	EntityType = Record<string, string | number>,
	StyleProperties = Record<string, any>,
> = StyleProperties & Partial<EntityType>;

/**
 * Represents a style configuration that can include both inline styles and class names.
 * @public
 */
export type ClassNameStyle<EntityType = Record<string, string | number>> = {
	/** CSS properties to be applied inline to the component */
	style?: CSSPropertiesWithVars<EntityType>;
	/** CSS class names to be applied to the component */
	className?: string;
	/** Whether to disable default styles */
	noStyle?: boolean;
	/** @internal used to pass default class names to the component */
	baseClassName?: ClassValue;
};

/**
 * Represents a style value that can be either a class name string or a {@link ClassNameStyle} object.
 * @public
 */
export type ThemeValue<EntityType = Record<string, string | number>> =
	| string
	| ClassNameStyle<EntityType>;

export interface ExtendThemeKeys<EntityType = CSSVariables>
	extends ClassNameStyle<EntityType> {
	themeKey: AllThemeKeys;
}

export type CSSVariables = {
	[key: string]: string | number;
};
