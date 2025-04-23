/**
 * @packageDocumentation
 * Provides the overlay backdrop component for the CookieBanner.
 */

import { type HTMLAttributes, forwardRef, useEffect, useState } from 'react';

import { useConsentManager } from '~/hooks/use-consent-manager';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';

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
			} else {
				const timer = setTimeout(() => {
					setIsVisible(false);
				}, 200); // Match CSS animation duration
				return () => clearTimeout(timer);
			}
		}, [showPopup]);

		const theme = useStyles('banner.overlay', {
			baseClassName: !(contextNoStyle || noStyle) && styles.overlay,
			noStyle,
		});

		useScrollLock(!!(showPopup && scrollLock));

		return showPopup && scrollLock ? (
			disableAnimation ? (
				<div
					ref={ref}
					{...props}
					{...theme}
					data-testid="cookie-banner-overlay"
				/>
			) : (
				<div
					ref={ref}
					{...props}
					{...theme}
					className={`${theme.className || ''} ${isVisible ? styles.overlayVisible : styles.overlayHidden}`}
					data-testid="cookie-banner-overlay"
				/>
			)
		) : null;
	}
);

const Overlay = CookieBannerOverlay;

export { Overlay, CookieBannerOverlay };
