'use client';

/**
 * @packageDocumentation
 * Provides the overlay backdrop component for the CookieBanner.
 */

import { useSignal } from '@preact/signals';
import clsx from 'clsx';
import type { JSX } from 'preact';
import { forwardRef } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import styles from '../cookie-banner.module.css';

/**
 * Props for the Overlay component.
 *
 * @public
 */
interface OverlayProps extends JSX.HTMLAttributes<HTMLDivElement> {
	/** When true, do not apply default styles. */
	noStyle?: boolean;
	/**
	 * Reserved for parity with other primitives.
	 * Not used here because the overlay is always a positioned element.
	 */
	asChild?: boolean;
}

/**
 * Overlay component that provides a backdrop for the CookieBanner content.
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
				const timer = setTimeout(
					() => setIsVisible(false),
					animationDurationMs
				);
				return () => clearTimeout(timer);
			}
		}, [showPopup, disableAnimation]);

		// Apply theme styles
		const theme = useStyles('banner.overlay', {
			baseClassName: !(contextNoStyle || noStyle) && styles.overlay,
			className: className?.toString(),
			noStyle: contextNoStyle || noStyle,
		});

		// Animations are handled with CSS classes
		const shouldAnimate = !(contextNoStyle || noStyle) && !disableAnimation;
		const animationClass = shouldAnimate
			? isVisible
				? styles.overlayVisible
				: styles.overlayHidden
			: undefined;

		const classNameValue = useSignal(className).value;
		const finalClassName = clsx(
			theme.className,
			animationClass,
			classNameValue
		);

		// Lock body scroll while the banner is active (if enabled)
		useScrollLock(Boolean(showPopup && scrollLock));

		return showPopup && scrollLock ? (
			<div
				ref={ref}
				{...props}
				className={finalClassName}
				style={{ ...theme.style, ...(style as unknown as JSX.CSSProperties) }}
				data-testid="cookie-banner-overlay"
			/>
		) : null;
	}
);

const Overlay = CookieBannerOverlay;

export { Overlay, CookieBannerOverlay };
