'use client';

import styles from '@c15t/ui/styles/components/iab-banner.module.css';
import { forwardRef, type HTMLAttributes, useEffect, useState } from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import { cnExt as cn } from '~/utils/cn';

interface OverlayProps extends HTMLAttributes<HTMLDivElement> {
	noStyle?: boolean;
}

const IABBannerOverlay = forwardRef<HTMLDivElement, OverlayProps>(
	({ className, style, noStyle, ...props }, ref) => {
		const { showPopup, iab } = useConsentManager();
		const {
			disableAnimation,
			noStyle: contextNoStyle,
			scrollLock,
		} = useTheme();

		const [isVisible, setIsVisible] = useState(false);

		// Only show for IAB mode
		const shouldShow = showPopup && iab !== null;

		useEffect(() => {
			if (shouldShow) {
				setIsVisible(true);
			} else if (disableAnimation) {
				setIsVisible(false);
			} else {
				const animationDurationMs = Number.parseInt(
					getComputedStyle(document.documentElement).getPropertyValue(
						'--iab-banner-animation-duration'
					) || '200',
					10
				);
				const timer = setTimeout(() => {
					setIsVisible(false);
				}, animationDurationMs);
				return () => clearTimeout(timer);
			}
		}, [shouldShow, disableAnimation]);

		const theme = useStyles('iabBannerOverlay', {
			baseClassName: !(contextNoStyle || noStyle) && styles.overlay,
			className,
			noStyle: contextNoStyle || noStyle,
		});

		const shouldApplyAnimation =
			!(contextNoStyle || noStyle) && !disableAnimation;

		let animationClass: string | undefined;
		if (shouldApplyAnimation) {
			animationClass = isVisible ? styles.overlayVisible : styles.overlayHidden;
		}

		const finalClassName = cn(theme.className, animationClass);

		useScrollLock(!!(shouldShow && scrollLock));

		if (!shouldShow || !scrollLock) {
			return null;
		}

		return (
			<div
				ref={ref}
				{...props}
				className={finalClassName}
				style={{ ...theme.style, ...style }}
				data-testid="iab-banner-overlay"
			/>
		);
	}
);

IABBannerOverlay.displayName = 'IABBannerOverlay';

export { IABBannerOverlay };
