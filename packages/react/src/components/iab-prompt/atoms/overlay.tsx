'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner';
import { forwardRef as createForwardRef, useEffect, useState } from 'react';
import type { HTMLAttributes } from 'react';

import { useActiveUI } from '~/hooks';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { cnExt as cn } from '~/utils/cn';
import { mergeSlotProps } from '~/utils/merge-slot-props';

interface OverlayProps extends HTMLAttributes<HTMLDivElement> {
	noStyle?: boolean;
}

const IABConsentBannerOverlay = createForwardRef<HTMLDivElement, OverlayProps>(
	({ className, style, noStyle, ...props }, ref) => {
		const activeUI = useActiveUI();
		const {
			disableAnimation,
			noStyle: contextNoStyle,
			scrollLock,
		} = useTheme();
		const { components } = useUIConfig();

		const [isVisible, setIsVisible] = useState(false);

		// Show when banner is active (model filtering is handled by the root component)
		const shouldShow = activeUI === 'banner';

		useEffect(() => {
			if (shouldShow) {
				const frame = requestAnimationFrame(() => setIsVisible(true));
				return () => cancelAnimationFrame(frame);
			}

			if (disableAnimation) {
				const frame = requestAnimationFrame(() => setIsVisible(false));
				return () => cancelAnimationFrame(frame);
			}

			const animationDurationMs = Number.parseInt(
				getComputedStyle(document.documentElement).getPropertyValue(
					'--iab-consent-banner-animation-duration'
				) || '200',
				10
			);
			const timer = setTimeout(() => {
				setIsVisible(false);
			}, animationDurationMs);
			return () => clearTimeout(timer);
		}, [shouldShow, disableAnimation]);

		const theme = mergeSlotProps(components?.['iab-banner']?.overlay, {
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

		useScrollLock(!!(shouldShow && scrollLock));

		if (!shouldShow || !scrollLock) {
			return null;
		}

		return (
			<div
				ref={ref}
				{...theme}
				aria-hidden="true"
				className={finalClassName}
				data-testid="iab-consent-banner-overlay"
			/>
		);
	}
);

IABConsentBannerOverlay.displayName = 'IABConsentBannerOverlay';

export { IABConsentBannerOverlay };
