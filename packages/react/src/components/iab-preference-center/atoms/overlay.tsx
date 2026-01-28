'use client';

import styles from '@c15t/ui/styles/components/iab-preference-center.module.css';
import { forwardRef, type HTMLAttributes, useEffect, useState } from 'react';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import { cnExt as cn } from '~/utils/cn';

interface OverlayProps extends HTMLAttributes<HTMLDivElement> {
	noStyle?: boolean;
	isOpen: boolean;
}

const IABPreferenceCenterOverlay = forwardRef<HTMLDivElement, OverlayProps>(
	({ className, style, noStyle, isOpen, ...props }, ref) => {
		const {
			disableAnimation,
			noStyle: contextNoStyle,
			scrollLock,
		} = useTheme();

		const [isVisible, setIsVisible] = useState(false);

		useEffect(() => {
			if (isOpen) {
				setIsVisible(true);
			} else if (disableAnimation) {
				setIsVisible(false);
			} else {
				const animationDurationMs = Number.parseInt(
					getComputedStyle(document.documentElement).getPropertyValue(
						'--iab-pc-animation-duration'
					) || '150',
					10
				);
				const timer = setTimeout(() => {
					setIsVisible(false);
				}, animationDurationMs);
				return () => clearTimeout(timer);
			}
		}, [isOpen, disableAnimation]);

		const theme = useStyles('iabPreferenceCenterOverlay', {
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

		useScrollLock(!!(isOpen && scrollLock));

		if (!isOpen) {
			return null;
		}

		return (
			<div
				ref={ref}
				{...props}
				className={finalClassName}
				style={{ ...theme.style, ...style }}
				data-testid="iab-preference-center-overlay"
			/>
		);
	}
);

IABPreferenceCenterOverlay.displayName = 'IABPreferenceCenterOverlay';

export { IABPreferenceCenterOverlay };
