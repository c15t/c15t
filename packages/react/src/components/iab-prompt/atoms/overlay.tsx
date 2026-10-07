'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner';
import { forwardRef as createForwardRef } from 'react';
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

		// Show when banner is active (model filtering is handled by the root component)
		const shouldShow = activeUI === 'banner';

		const theme = mergeSlotProps(components?.['iab-banner']?.overlay, {
			baseClassName: styles.overlay,
			className,
			noStyle: contextNoStyle || noStyle,
			style,
			...props,
		});

		const shouldApplyAnimation =
			!(contextNoStyle || noStyle) && !disableAnimation;

		// The overlay shows on its first frame; `overlayEntering` marks the
		// mount and carries no entry animation.
		const animationClass = shouldApplyAnimation
			? `${styles.overlayVisible} ${styles.overlayEntering}`
			: undefined;

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
