/**
 * @packageDocumentation
 * Provides the overlay backdrop component for the ConsentBanner.
 */

import styles from '@c15t/ui/styles/v3/consent-banner';
import { forwardRef, useEffect, useState } from 'react';
import type { HTMLAttributes } from 'react';

import { useActiveUI } from '~/v3/hooks';
import { useScrollLock } from '~/v3/hooks/use-scroll-lock';
import { useTheme } from '~/v3/hooks/use-theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { cnExt as cn } from '~/v3/utils/cn';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

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
		const activeUI = useActiveUI();
		const {
			disableAnimation,
			noStyle: contextNoStyle,
			scrollLock,
		} = useTheme();
		const { components } = useUIConfig();

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

		const theme = mergeSlotProps(components?.banner?.overlay, {
			baseClassName: styles.overlay,
			className, // Always pass custom className
			noStyle: contextNoStyle || noStyle,
			style,
			...props,
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
				{...theme}
				className={finalClassName}
				data-testid="consent-banner-overlay"
			/>
		) : null;
	}
);

const Overlay = ConsentBannerOverlay;

export { ConsentBannerOverlay, Overlay };
