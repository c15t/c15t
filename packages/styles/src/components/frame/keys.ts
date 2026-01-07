import type { ButtonCSSVariables } from '../../primitives/button/css-vars';
import type { ThemeValue } from '../../types/style-types';
import type {
	FramePlaceholderCSSVariables,
	FrameTitleCSSVariables,
} from './css-vars';

/**
 * Configuration object for styling different parts of the Frame component.
 * @public
 */
export type FrameTheme = Partial<{
	/** @remarks Styles for the placeholder container element */
	'frame.placeholder.root': ThemeValue<FramePlaceholderCSSVariables>;
	/** @remarks Styles for the placeholder title element */
	'frame.placeholder.title': ThemeValue<FrameTitleCSSVariables>;
	/** @remarks Styles for the placeholder button element */
	'frame.placeholder.button': ThemeValue<ButtonCSSVariables>;
}>;
