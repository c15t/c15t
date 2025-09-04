import type { ComponentChildren } from 'preact';
import type { ThemeContextValue } from '~/context/theme-context';
import type { ConsentManagerWidgetTheme } from './theme';

export interface ConsentManagerWidgetRootProps
	extends ThemeContextValue<ConsentManagerWidgetTheme> {
	children?: ComponentChildren;
	useProvider?: boolean;
}

/**
 * Props for the ConsentManagerWidget component
 *
 * @remarks
 * Extends ThemeContextValue to provide comprehensive theming support
 * while maintaining type safety for consent management specific features.
 */
export interface ConsentManagerWidgetProps
	extends Omit<ConsentManagerWidgetRootProps, 'children'> {
	/** Hide product branding when true */
	hideBranding?: boolean;
}
