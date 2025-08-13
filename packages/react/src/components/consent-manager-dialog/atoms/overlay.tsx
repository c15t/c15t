/**
 * @packageDocumentation
 * Provides the overlay backdrop component for the consent management interface.
 * Implements accessible modal behavior with animation support.
 */

import clsx from 'clsx';
import { type FC, type PropsWithChildren, useEffect, useState } from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import type { ThemeValue } from '~/types/theme';
import styles from '../consent-manager-dialog.module.css';

/**
 * Props for the Overlay component.
 *
 * @remarks
 * The overlay provides a semi-transparent backdrop behind the consent dialog.
 * It helps focus user attention on the privacy settings interface and prevents
 * interaction with the main content while the dialog is open.
 *
 * @public
 */

/**
 * Props for the Overlay component.
 *
 * @remarks
 * Extends {@link PropsWithChildren} so that the overlay can optionally wrap
 * its compound components (e.g. `ConsentManagerDialog.Card`). This resolves
 * TypeScript errors when consumers nest elements inside
 * `<ConsentManagerDialog.Root>`.
 */
export type OverlayProps = PropsWithChildren<{
	/**
	 * Custom styles to override default overlay styling.
	 *
	 * @remarks
	 * - Can be a string class name or an object with className and style properties
	 * - Styles are merged with theme styles and default styles
	 * - Useful for customizing overlay appearance while maintaining functionality
	 */
	style?: ThemeValue;

	/**
	 * Disables default styling when true.
	 *
	 * @remarks
	 * - When enabled, removes all default styles
	 * - Useful for implementing completely custom overlay styling
	 * - Maintains functionality without visual opinions
	 */
	noStyle?: boolean;
}>;

const ConsentManagerDialogOverlay: FC<OverlayProps> = ({ noStyle, style }) => {
	const { isPrivacyDialogOpen } = useConsentManager();
	const {
		disableAnimation,
		noStyle: isThemeNoStyle,
		scrollLock = true,
	} = useTheme();

	const [isVisible, setIsVisible] = useState(false);

	// Handle animation visibility state
	useEffect(() => {
		if (isPrivacyDialogOpen) {
			setIsVisible(true);
		} else if (disableAnimation) {
			setIsVisible(false);
		} else {
			const animationDurationMs = Number.parseInt(
				getComputedStyle(document.documentElement).getPropertyValue(
					'--dialog-animation-duration'
				) || '200',
				10
			);
			const timer = setTimeout(() => {
				setIsVisible(false);
			}, animationDurationMs); // Match CSS animation duration
			return () => clearTimeout(timer);
		}
	}, [isPrivacyDialogOpen, disableAnimation]);

	// Get custom className from style prop
	const customClassName = typeof style === 'string' ? style : style?.className;

	// Apply theme styles
	const theme = useStyles('dialog.overlay', {
		baseClassName: !(isThemeNoStyle || noStyle) && styles.overlay,
		className: customClassName,
		noStyle: isThemeNoStyle || noStyle,
	});

	// Animations are handled with CSS classes
	const shouldApplyAnimation =
		!(isThemeNoStyle || noStyle) && !disableAnimation;

	// Use conditional assignment instead of nested ternaries
	let animationClass: string | undefined;
	if (shouldApplyAnimation) {
		animationClass = isVisible ? styles.overlayVisible : styles.overlayHidden;
	} else {
		animationClass = undefined;
	}

	// Combine theme className with animation class if needed
	const finalClassName = clsx(theme.className, animationClass);

	const shouldLockScroll = !!(open || isPrivacyDialogOpen) && scrollLock;

	useScrollLock(shouldLockScroll);

	return shouldLockScroll ? (
		<div
			style={
				typeof style === 'object' && 'style' in style
					? { ...theme.style, ...style.style }
					: theme.style
			}
			className={finalClassName}
			data-testid="consent-manager-dialog-overlay"
		/>
	) : null;
};

const Overlay = ConsentManagerDialogOverlay;

export { Overlay, ConsentManagerDialogOverlay };
