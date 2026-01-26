'use client';

import { Slot } from '@radix-ui/react-slot';
import { forwardRef, type HTMLAttributes } from 'react';

import { useStyles } from '~/hooks/use-styles';
import type { AllThemeKeys, ExtendThemeKeys } from '~/types/theme';

/**
 * Props for the description text component of the CookieBanner.
 * Extends standard HTML div attributes.
 *
 * @public
 */
export interface BoxProps
	extends Omit<HTMLAttributes<HTMLDivElement>, 'style'>,
		ExtendThemeKeys {
	asChild?: boolean;
}

/**
 * Renders the descriptive text content within a CookieBanner.
 *
 * @remarks
 * This component is responsible for displaying the explanatory text that:
 * - Informs users about the site's cookie usage
 * - Explains what cookies are used for
 * - Provides context for the cookie consent choices
 *
 * The component automatically inherits styles from the CookieBanner context
 * and can be customized through className and style props.
 *
 * @example
 * Basic usage:
 * ```tsx
 * <CookieBanner.Description>
 *   We use cookies to enhance your browsing experience and analyze site traffic.
 * </CookieBanner.Description>
 * ```
 *
 * @example
 * With custom styling:
 * ```tsx
 * <CookieBanner.Description
 *   className="text-gray-600"
 *   style={{ maxWidth: '500px' }}
 * >
 *   By using our site, you acknowledge that you have read and understand our
 *   Cookie Policy and Privacy Policy.
 * </CookieBanner.Description>
 * ```
 *
 * @public
 */
export const Box = forwardRef<HTMLDivElement, BoxProps>(
	(
		{ asChild, className, style, themeKey, baseClassName, noStyle, ...props },
		ref
	) => {
		/**
		 * Apply styles from the CookieBanner context and merge with local styles.
		 * Uses the 'description' style key for consistent theming.
		 */
		const descriptionStyle = useStyles(themeKey as AllThemeKeys, {
			baseClassName,
			className,
			style,
			noStyle,
		});

		const Comp = asChild ? Slot : 'div';
		return <Comp ref={ref} {...props} {...descriptionStyle} />;
	}
);

Box.displayName = 'Box';
