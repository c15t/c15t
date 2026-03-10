/**
 * @packageDocumentation
 * Provides the overlay backdrop component for the ConsentBanner.
 */

import styles from '@c15t/ui/styles/components/consent-banner.module.js';
import { forwardRef, type HTMLAttributes, useEffect, useState } from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import { cnExt as cn } from '~/utils/cn';

/**
 * Props for the Overlay component.
 *
 * @remarks
 * The overlay provides a semi-transparent backdrop behind the consent banner content.
 * It can be styled using the ConsentBanner theme system or through direct style props.
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
 * Overlay component that provides a backdrop for the ConsentBanner content.
 *
 * @remarks
 * This component handles:
 * - Rendering a semi-transparent backdrop
 * - Fade in/out animations (when animations are enabled)
 * - Proper z-indexing for modal behavior
 * - Theme-based styling
 *
 * The overlay visibility is controlled by the `activeUI` state from ConsentBanner context,
 * and its animation behavior is controlled by the `disableAnimation` flag.
 *
 * @public
 */
const ConsentBannerOverlay = forwardRef<HTMLDivElement, OverlayProps>(
	({ className, style, noStyle, asChild, ...props }, ref) => {
		const { activeUI } = useConsentManager();
		const {
			disableAnimation,
			noStyle: contextNoStyle,
			scrollLock,
		} = useTheme();

		const showBanner = activeUI === 'banner';
		const [isVisible, setIsVisible] = useState(false);

		// Handle animation visibility state
		useEffect(() => {
			if (showBanner) {
				setIsVisible(true);
			} else if (disableAnimation) {
				setIsVisible(false);
			} else {
				const animationDurationMs = Number.parseInt(
					getComputedStyle(document.documentElement).getPropertyValue(
						'--consent-banner-animation-duration'
					) || '200',
					10
				);
				const timer = setTimeout(() => {
					setIsVisible(false);
				}, animationDurationMs); // Match CSS animation duration
				return () => clearTimeout(timer);
			}
		}, [showBanner, disableAnimation]);

		// Apply theme styles
		const theme = useStyles('consentBannerOverlay', {
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
		const finalClassName = cn(theme.className, animationClass);

		useScrollLock(!!(showBanner && scrollLock));

		return showBanner && scrollLock ? (
			<div
				ref={ref}
				{...props}
				className={finalClassName}
				style={{ ...theme.style, ...style }}
				data-testid="consent-banner-overlay"
			/>
		) : null;
	}
);

const Overlay = ConsentBannerOverlay;

export { Overlay, ConsentBannerOverlay };
