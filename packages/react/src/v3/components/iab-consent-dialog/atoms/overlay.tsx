'use client';

import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
import { forwardRef, type HTMLAttributes, useEffect, useState } from 'react';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import { cnExt as cn } from '~/utils/cn';

interface OverlayProps extends HTMLAttributes<HTMLDivElement> {
	noStyle?: boolean;
	isOpen: boolean;
}

const IABConsentDialogOverlay = forwardRef<HTMLDivElement, OverlayProps>(
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
						'--iab-cd-animation-duration'
					) || '150',
					10
				);
				const timer = setTimeout(() => {
					setIsVisible(false);
				}, animationDurationMs);
				return () => clearTimeout(timer);
			}
		}, [isOpen, disableAnimation]);

		const theme = useStyles('iabConsentDialogOverlay', {
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
				data-testid="iab-consent-dialog-overlay"
			/>
		);
	}
);

IABConsentDialogOverlay.displayName = 'IABConsentDialogOverlay';

export { IABConsentDialogOverlay };
