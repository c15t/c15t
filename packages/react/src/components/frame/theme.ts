import type { ButtonCSSVariables } from '../../components/shared/ui/button';
import type { ThemeValue } from '../../types/theme';

/**
 * Configuration object for styling different parts of the Frame component.
 * @public
 */
export type FrameTheme = Partial<{
	/** @remarks Styles for the fallback root container element */
	'frame.fallback.root': ThemeValue<FallbackCSSVariables>;
	/** @remarks Styles for the fallback content wrapper */
	'frame.fallback.content': ThemeValue;
	/** @remarks Styles for the fallback title */
	'frame.fallback.title': ThemeValue;
	/** @remarks Styles for the fallback description text */
	'frame.fallback.description': ThemeValue;
	/** @remarks Styles for the fallback button element */
	'frame.fallback.button': ThemeValue<ButtonCSSVariables>;
}>;

/** Fallback component CSS variables */
type FallbackCSSVariables = {
	'--frame-fallback-border-radius': string;
	'--frame-fallback-border-width': string;
	'--frame-fallback-border-color': string;
	'--frame-fallback-border-color-dark': string;
	'--frame-fallback-background-color': string;
	'--frame-fallback-background-color-dark': string;
	'--frame-fallback-text-color': string;
	'--frame-fallback-text-color-dark': string;
	'--frame-fallback-title-color': string;
	'--frame-fallback-title-color-dark': string;
	'--frame-fallback-description-color': string;
	'--frame-fallback-description-color-dark': string;
	'--frame-fallback-shadow': string;
	'--frame-fallback-shadow-dark': string;
};
