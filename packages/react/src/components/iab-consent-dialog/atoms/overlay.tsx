'use client';

import styles from '@c15t/ui/styles/components/iab-consent-dialog';
import { forwardRef as createForwardRef, useEffect, useState } from 'react';
import type { HTMLAttributes } from 'react';

import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { cnExt as cn } from '~/utils/cn';
import { mergeSlotProps } from '~/utils/merge-slot-props';

interface OverlayProps extends HTMLAttributes<HTMLDivElement> {
	noStyle?: boolean;
	isOpen: boolean;
}

const IABConsentDialogOverlay = createForwardRef<HTMLDivElement, OverlayProps>(
	({ className, style, noStyle, isOpen, ...props }, ref) => {
		const {
			disableAnimation,
			noStyle: contextNoStyle,
			scrollLock,
		} = useTheme();
		const { components } = useUIConfig();

		const [isVisible, setIsVisible] = useState(false);

		useEffect(() => {
			if (isOpen) {
				const frame = requestAnimationFrame(() => setIsVisible(true));
				return () => cancelAnimationFrame(frame);
			}

			if (disableAnimation) {
				const frame = requestAnimationFrame(() => setIsVisible(false));
				return () => cancelAnimationFrame(frame);
			}

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
		}, [isOpen, disableAnimation]);

		const theme = mergeSlotProps(components?.['iab-dialog']?.overlay, {
			baseClassName: styles.overlay,
			className,
			noStyle: contextNoStyle || noStyle,
			style,
			...props,
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
				{...theme}
				aria-hidden="true"
				className={finalClassName}
				data-testid="iab-consent-dialog-overlay"
			/>
		);
	}
);

IABConsentDialogOverlay.displayName = 'IABConsentDialogOverlay';

export { IABConsentDialogOverlay };
