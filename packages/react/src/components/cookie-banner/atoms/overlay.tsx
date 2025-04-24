/**
 * @packageDocumentation
 * Provides the overlay backdrop component for the CookieBanner.
 */

import { type HTMLAttributes, forwardRef, useEffect, useState } from 'react';

import { useConsentManager } from '~/hooks/use-consent-manager';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';

import clsx from 'clsx';
import styles from '../cookie-banner.module.css';

/**
 * Props for the Overlay component.
 *
 * @remarks
 * The overlay provides a semi-transparent backdrop behind the cookie banner content.
 * It can be styled using the CookieBanner theme system or through direct style props.
 *
 * @public
 */
interface OverlayProps extends HTMLAttributes<HTMLDivElement> {
	/**
	 * @remarks
	 * When true, the component will not apply any styles.
	 */
	noStyle?: boolean;
	/**
	 * @remarks
	 * When true, the component will render its children directly without wrapping them in a DOM element.
	 * This enables better composition with other components.
	 */
	asChild?: boolean;
}

/**
 * Overlay component that provides a backdrop for the CookieBanner content.
 *
 * @remarks
 * This component handles:
 * - Rendering a semi-transparent backdrop
 * - Fade in/out animations (when animations are enabled)
 * - Proper z-indexing for modal behavior
 * - Theme-based styling
 *
 * The overlay visibility is controlled by the `showPopup` state from CookieBanner context,
 * and its animation behavior is controlled by the `disableAnimation` flag.
 *
 * @public
 */
const CookieBannerOverlay = forwardRef<HTMLDivElement, OverlayProps>(
	({ className, style, noStyle, asChild, ...props }, ref) => {
		const { showPopup } = useConsentManager();
		const {
			disableAnimation,
			noStyle: contextNoStyle,
			scrollLock,
		} = useTheme();

		const [isVisible, setIsVisible] = useState(false);

		// Handle animation visibility state
		useEffect(() => {
			if (showPopup) {
				setIsVisible(true);
			} else if (disableAnimation) {
				setIsVisible(false);
			} else {
				const animationDurationMs = Number.parseInt(
					getComputedStyle(document.documentElement).getPropertyValue(
						'--banner-animation-duration'
					) || '200',
					10
				);
				const timer = setTimeout(() => {
					setIsVisible(false);
				}, animationDurationMs); // Match CSS animation duration
				return () => clearTimeout(timer);
			}
		}, [showPopup, disableAnimation]);

		// Apply theme styles
		const theme = useStyles('banner.overlay', {
			baseClassName: !(contextNoStyle || noStyle) && styles.overlay,
			className, // Always pass custom className
			noStyle: contextNoStyle || noStyle,
		});

		// Animations are handled with CSS classes
		const shouldApplyAnimation =
			!(contextNoStyle || noStyle) && !disableAnimation;

		let animationClass: string | undefined;
		if (shouldApplyAnimation) {
			animationClass = isVisible ? styles.overlayVisible : styles.overlayHidden;
		} else {
			animationClass = undefined;
		}

		// Combine theme className with animation class if needed
		const finalClassName = clsx(theme.className, animationClass);

		useScrollLock(!!(showPopup && scrollLock));

		return showPopup && scrollLock ? (
			<div
				ref={ref}
				{...props}
				className={finalClassName}
				style={{ ...theme.style, ...style }}
				data-testid="cookie-banner-overlay"
			/>
		) : null;
	}
);

const Overlay = CookieBannerOverlay;

export { Overlay, CookieBannerOverlay };
