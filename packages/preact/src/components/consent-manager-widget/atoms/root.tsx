/**
 * @packageDocumentation
 * Provides the root component for the consent management interface.
 * Implements context provider pattern with theme support and state management.
 */
import type { ConsentManagerWidgetTheme } from '@c15t/styles/components/consent-manager-widget';
import type { ComponentChildren, FunctionComponent } from 'preact';
import { Box } from '~/components/shared/primitives/box';
import {
  LocalThemeContext,
  type ThemeContextValue,
} from '~/context/theme-context';

/**
 * Props for the ConsentManagerWidgetRoot component.
 *
 * @remarks
 * Extends ThemeContextValue to provide comprehensive theming support
 * while maintaining type safety for consent management specific features.
 *
 * @public
 */
export interface ConsentManagerWidgetRootProps
	extends ThemeContextValue<ConsentManagerWidgetTheme> {
	/**
	 * Child components to be rendered within the consent manager context.
	 */
	children?: ComponentChildren;

	/**
	 * Determines whether to use the context provider.
	 * If false, the component will not wrap children in a context provider.
	 *
	 * @defaultValue true
	 */
	useProvider?: boolean;

	/**
	 * When true, removes all default styling from the banner and its children.
	 * Useful when implementing completely custom styles.
	 */
	noStyle?: boolean;
}

/**
 * Root component of the ConsentManagerWidget that provides context and styling.
 *
 * @public
 */
const ConsentManagerWidgetRoot: FunctionComponent<
	ConsentManagerWidgetRootProps
> = ({
	children,
	noStyle = false,
	disableAnimation = false,
	theme,
	useProvider = true,
}) => {
	// Build the theme context value for children
	const contextValue: ThemeContextValue<ConsentManagerWidgetTheme> = {
		disableAnimation,
		noStyle,
		theme,
	};

	const content = (
		<Box data-testid="consent-manager-widget-root" themeKey="widget.root">
			{children}
		</Box>
	);

	return useProvider ? (
		<LocalThemeContext.Provider value={contextValue}>
			{content}
		</LocalThemeContext.Provider>
	) : (
		content
	);
};

const Root = ConsentManagerWidgetRoot;

export { Root, ConsentManagerWidgetRoot };
