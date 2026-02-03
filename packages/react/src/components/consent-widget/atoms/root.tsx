'use client';

/**
 * @packageDocumentation
 * Provides the root component for the consent management interface.
 * Implements context provider pattern with theme support and state management.
 */

import type { FC, ReactNode } from 'react';
import { Box } from '~/components/shared/primitives/box';
import {
	LocalThemeContext,
	type ThemeContextValue,
} from '~/context/theme-context';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useTextDirection } from '~/hooks/use-text-direction';

/**
 * Props for the ConsentWidgetRoot component.
 *
 * @remarks
 * Extends ThemeContextValue to provide comprehensive theming support
 * while maintaining type safety for consent management specific features.
 *
 * @public
 */
export interface ConsentWidgetRootProps extends ThemeContextValue {
	/**
	 * Child components to be rendered within the consent manager context.
	 *
	 * @remarks
	 * - Should include ConsentWidget.Content and related components
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
 * Root component of the ConsentWidget that provides context and styling.
 *
 * @remarks
 * Key features:
 * - Provides the ConsentWidget context to all child components
 * - Manages consent state through the consent manager
 * - Handles theme distribution to child components
 * - Supports animation toggling
 * - Allows complete style customization
 *
 * @example
 * Basic usage:
 * ```tsx
 * <ConsentWidget.Root>
 *   <ConsentWidget.Content>
 *     {Banner content}
 *   </ConsentWidget.Content>
 * </ConsentWidget.Root>
 * ```
 *
 * @example
 * With custom styling:
 * ```tsx
 * <ConsentWidget.Root
 *   styles={{
 *     root: "fixed bottom-0 w-full bg-white",
 *     content: "max-w-4xl mx-auto p-4",
 *     title: "text-xl font-bold",
 *     description: "mt-2 text-gray-600"
 *   }}
 * >
 *   {Banner content}
 * </ConsentWidget.Root>
 * ```
 *
 * @public
 */
const ConsentWidgetRoot: FC<ConsentWidgetRootProps> = ({
	children,
	noStyle = false,
	disableAnimation = false,
	useProvider = true,
}) => {
	const { translationConfig } = useConsentManager();
	const textDirection = useTextDirection(translationConfig.defaultLanguage);
	/**
	 * Combine consent manager state with styling configuration
	 * to create the context value for child components
	 */
	const contextValue = {
		disableAnimation,
		noStyle,
	};

	const content = (
		<Box
			data-testid="consent-widget-root"
			themeKey="consentWidget"
			dir={textDirection}
		>
			{children}
		</Box>
	);

	if (useProvider) {
		return (
			<LocalThemeContext.Provider value={contextValue}>
				{content}
			</LocalThemeContext.Provider>
		);
	}

	return content;
};

const Root = ConsentWidgetRoot;

export { Root, ConsentWidgetRoot };
