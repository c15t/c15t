/**
 * @packageDocumentation
 * Provides the overlay backdrop component for the consent management interface.
 * Implements accessible modal behavior with animation support.
 */

import clsx from 'clsx';
import { type FC, useEffect, useState } from 'react';
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
interface OverlayProps {
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

	/**
	 * Opens the overlay when true.
	 *
	 * @remarks
	 * - Useful for testing purposes
	 */
	open?: boolean;
}

/**
 * Overlay component that provides a backdrop for the consent management interface.
 *
 * @remarks
 * Key features:
 * - Renders a semi-transparent backdrop
 * - Implements fade in/out animations (when enabled)
 * - Manages proper z-indexing for modal behavior
 * - Supports theme-based styling
 * - Automatically handles visibility based on dialog state
 *
 * @example
 * ```tsx
 * <ConsentManager>
 *   <Overlay />
 *   <DialogCard>
 *     // Dialog content
 *   </DialogCard>
 * </ConsentManager>
 * ```
 *
 * @public
 */
const ConsentManagerDialogOverlay: FC<OverlayProps> = ({
	noStyle,
	style,
	open = false,
}) => {
	const { isPrivacyDialogOpen } = useConsentManager();
	const {
		disableAnimation,
		noStyle: isThemeNoStyle,
		scrollLock = true,
	} = useTheme();

	const [isVisible, setIsVisible] = useState(false);

	// Handle animation visibility state
	useEffect(() => {
		if (open || isPrivacyDialogOpen) {
			setIsVisible(true);
		} else if (disableAnimation) {
			setIsVisible(false);
		} else {
			const timer = setTimeout(() => {
				setIsVisible(false);
			}, 200); // Match CSS animation duration
			return () => clearTimeout(timer);
		}
	}, [open, isPrivacyDialogOpen, disableAnimation]);

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
	const animationClass = shouldApplyAnimation
		? isVisible
			? styles.overlayVisible
			: styles.overlayHidden
		: undefined;

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
