'use client';

import type { ConsentComponentSlotKey } from '@c15t/schema/config';
import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';

import { Slot } from '~/v3/components/shared/libs/slot';
import { useTheme } from '~/v3/hooks/use-theme';
import type { ExtendThemeKeys } from '~/v3/types/theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { getSlotProps, mergeSlotProps } from '~/v3/utils/merge-slot-props';

/**
 * Props for the description text component of the CookieBanner.
 * Extends standard HTML div attributes.
 *
 * @public
 */
export interface BoxProps
	extends Omit<HTMLAttributes<HTMLDivElement>, 'style'>, ExtendThemeKeys {
	asChild?: boolean;
	slotKey?: ConsentComponentSlotKey;
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
export const Box = forwardRef<HTMLDivElement, BoxProps>(function (
	{ asChild, className, style, slotKey, baseClassName, noStyle, ...props },
	ref
) {
	const { components } = useUIConfig();
	const { noStyle: contextNoStyle } = useTheme();
	const slotProps = getSlotProps(components, slotKey);
	const mergedProps = mergeSlotProps(slotProps, {
		baseClassName,
		className,
		noStyle: noStyle ?? contextNoStyle,
		style,
		...props,
	});
	const Comp = asChild ? Slot : 'div';
	return (
		<Comp
			ref={ref}
			{...mergedProps}
		/>
	);
});

Box.displayName = 'Box';
