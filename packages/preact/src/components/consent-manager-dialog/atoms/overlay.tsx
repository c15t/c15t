/**
 * @packageDocumentation
 * Provides the overlay backdrop component for the consent management interface.
 * Implements accessible modal behaviour with animation support.
 */

import styles from '@c15t/styles/consent-manager-dialog';
import clsx from 'clsx';
import type { FunctionComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import type { ThemeValue } from '~/types/theme';

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
	/** Custom styles to override default overlay styling. */
	style?: ThemeValue;

	/** Disables default styling when true. */
	noStyle?: boolean;

	/** Opens the overlay when true. Useful for tests. */
	open?: boolean;
}

/**
 * Overlay component that provides a backdrop for the consent management interface.
 *
 * @public
 */
const ConsentManagerDialogOverlay: FunctionComponent<OverlayProps> = ({
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
			const animationDurationMs = Number.parseInt(
				getComputedStyle(document.documentElement).getPropertyValue(
					'--dialog-animation-duration'
				) || '200',
				10
			);
			const timer = setTimeout(() => {
				setIsVisible(false);
			}, animationDurationMs);
			return () => clearTimeout(timer);
		}
	}, [open, isPrivacyDialogOpen, disableAnimation]);

	// Extract custom className from style prop
	const customClassName = typeof style === 'string' ? style : style?.className;

	// Apply theme styles
	const theme = useStyles('dialog.overlay', {
		baseClassName: !(isThemeNoStyle || noStyle) && styles.overlay,
		className: customClassName,
		noStyle: isThemeNoStyle || noStyle,
	});

	// CSS animation classes
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
