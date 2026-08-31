'use client';

import styles from '@c15t/ui/styles/v3/iab-consent-dialog';
import { forwardRef, useEffect, useState } from 'react';
import type { HTMLAttributes } from 'react';

import { useScrollLock } from '~/v3/hooks/use-scroll-lock';
import { useTheme } from '~/v3/hooks/use-theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { cnExt as cn } from '~/v3/utils/cn';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

interface OverlayProps extends HTMLAttributes<HTMLDivElement> {
	noStyle?: boolean;
	isOpen: boolean;
}

const IABConsentDialogOverlay = forwardRef<HTMLDivElement, OverlayProps>(
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
	function IABConsentDialogOverlay(
		{ className, style, noStyle, isOpen, ...props },
		ref
	) {
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
				className={finalClassName}
				data-testid="iab-consent-dialog-overlay"
			/>
		);
	}
);

IABConsentDialogOverlay.displayName = 'IABConsentDialogOverlay';

export { IABConsentDialogOverlay };
