import type { ButtonCSSVariables } from '../../components/shared/ui/button';
import type { ThemeValue } from '../../types/theme';

/**
 * Configuration object for styling different parts of the Frame component.
 * @public
 */
export type FrameTheme = Partial<{
	/** @remarks Styles for the placeholder root container element */
	'frame.placeholder.root': ThemeValue<PlaceholderCSSVariables>;
	/** @remarks Styles for the placeholder content wrapper */
	'frame.placeholder.content': ThemeValue;
	/** @remarks Styles for the placeholder title */
	'frame.placeholder.title': ThemeValue;
	/** @remarks Styles for the placeholder description text */
	'frame.placeholder.description': ThemeValue;
	/** @remarks Styles for the placeholder button element */
	'frame.placeholder.button': ThemeValue<ButtonCSSVariables>;
}>;

/** Placeholder component CSS variables */
type PlaceholderCSSVariables = {
	/** Border properties */
	'--frame-placeholder-border-radius': string;
	'--frame-placeholder-border-width': string;
	'--frame-placeholder-border-color': string;
	'--frame-placeholder-border-color-dark': string;

	/** Background and text colors */
	'--frame-placeholder-background-color': string;
	'--frame-placeholder-background-color-dark': string;
	'--frame-placeholder-text-color': string;
	'--frame-placeholder-text-color-dark': string;

	/** Title and description colors */
	'--frame-placeholder-title-color': string;
	'--frame-placeholder-title-color-dark': string;
	'--frame-placeholder-description-color': string;
	'--frame-placeholder-description-color-dark': string;

	/** Shadow effects */
	'--frame-placeholder-shadow': string;
	'--frame-placeholder-shadow-dark': string;
};
