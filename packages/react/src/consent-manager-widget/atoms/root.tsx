'use client';

/**
 * @packageDocumentation
 * Provides the root component for the consent management interface.
 * Implements context provider pattern with theme support and state management.
 */

import type { FC, ReactNode } from 'react';
import { useConsentManager } from '../../common';
import { createThemeContextValue } from '../../common/utils/theme';
import { Box } from '../../primitives/box';
import { ThemeContext, type ThemeContextValue } from '../../theme';
import type { ConsentManagerWidgetTheme } from '../theme';

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
	 *
	 * @remarks
	 * - Should include ConsentManagerWidget.Content and related components
	 * - Receives context and theming from the root provider
	 */
	children: ReactNode;

	/**
	 * Determines whether to use the context provider.
	 * If false, the component will not wrap children in a context provider.
	 *
	 * @defaultValue true
	 */
	useProvider?: boolean;

	/**
	 * @remarks
	 * When true, removes all default styling from the banner and its children.
	 * Useful when implementing completely custom styles.
	 */
	noStyle?: boolean;
}

/**
 * Root component of the ConsentManagerWidget that provides context and styling.
 *
 * @remarks
 * Key features:
 * - Provides the ConsentManagerWidget context to all child components
 * - Manages consent state through the consent manager
 * - Handles theme distribution to child components
 * - Supports animation toggling
 * - Allows complete style customization
 *
 * @example
 * Basic usage:
 * ```tsx
 * <ConsentManagerWidget.Root>
 *   <ConsentManagerWidget.Content>
 *     {Banner content}
 *   </ConsentManagerWidget.Content>
 * </ConsentManagerWidget.Root>
 * ```
 *
 * @example
 * With custom styling:
 * ```tsx
 * <ConsentManagerWidget.Root
 *   styles={{
 *     root: "fixed bottom-0 w-full bg-white",
 *     content: "max-w-4xl mx-auto p-4",
 *     title: "text-xl font-bold",
 *     description: "mt-2 text-gray-600"
 *   }}
 * >
 *   {Banner content}
 * </ConsentManagerWidget.Root>
 * ```
 *
 * @public
 */
const ConsentManagerWidgetRoot: FC<ConsentManagerWidgetRootProps> = ({
	children,
	noStyle = false,
	disableAnimation = false,
	theme,
	useProvider = true,
	...props
}) => {
	/** Access the consent manager for handling cookie preferences */
	const consentManager = useConsentManager();

	/**
	 * Combine consent manager state with styling configuration
	 * to create the context value for child components
	 */
	const contextValue = {
		disableAnimation,
		noStyle,
		theme,
	};

	const mergedContextValue = createThemeContextValue(
		consentManager,
		contextValue
	);
	const content = (
		<Box
			baseClassName="c15t-consent-manager-widget"
			data-testid="consent-manager-widget-root"
			themeKey="consent-manager-widget.root"
			{...props}
		>
			{children}
		</Box>
	);

	if (useProvider) {
		return (
			<ThemeContext.Provider value={mergedContextValue}>
				{content}
			</ThemeContext.Provider>
		);
	}

	return content;
};

const Root = ConsentManagerWidgetRoot;

export { Root, ConsentManagerWidgetRoot };
