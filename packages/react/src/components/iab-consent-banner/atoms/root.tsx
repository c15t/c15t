'use client';

import type * as C15tCoreTypes from '@c15t/core';
import styles from '@c15t/ui/styles/components/iab-consent-banner.module.js';
import { sanitizeDOMStyleProps } from '@c15t/ui/utils';
import { forwardRef, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FC, HTMLAttributes, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { ConsentTrackingContext } from '~/context/consent-tracking-context';
import { LocalThemeContext } from '~/context/theme-context';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useIsHydrated } from '~/hooks/use-is-hydrated';
import { useStyles } from '~/hooks/use-styles';
import { useTextDirection } from '~/hooks/use-text-direction';
import type { CSSPropertiesWithVars } from '~/types/theme';

import { IABConsentBannerOverlay } from './overlay';

const DEFAULT_MODELS: C15tCoreTypes.Model[] = ['iab'];

interface IABConsentBannerRootProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	noStyle?: boolean;
	disableAnimation?: boolean;
	scrollLock?: boolean;
	trapFocus?: boolean;
	/**
	 * Which consent models this banner responds to.
	 * @default ['iab']
	 */
	models?: C15tCoreTypes.Model[];
	/**
	 * Override the UI source identifier sent with consent API calls.
	 * @default 'iab_banner'
	 */
	uiSource?: string;
}

const IABConsentBannerRoot: FC<IABConsentBannerRootProps> = ({
	children,
	className,
	noStyle,
	disableAnimation,
	scrollLock,
	trapFocus = true,
	models,
	uiSource,
	...props
}) => {
	const { policyBanner } = useConsentManager();
	const contextValue = useMemo(
		() => ({
			disableAnimation,
			noStyle,
			scrollLock: scrollLock ?? policyBanner.scrollLock ?? undefined,
			trapFocus,
		}),
		[disableAnimation, noStyle, policyBanner.scrollLock, scrollLock, trapFocus]
	);
	const trackingValue = useMemo(
		() => ({ uiSource: uiSource ?? 'iab_banner' }),
		[uiSource]
	);

	return (
		<ConsentTrackingContext.Provider value={trackingValue}>
			<LocalThemeContext.Provider value={contextValue}>
				<IABConsentBannerRootChildren
					disableAnimation={disableAnimation}
					className={className}
					noStyle={noStyle}
					models={models}
					{...props}
				>
					{children}
				</IABConsentBannerRootChildren>
			</LocalThemeContext.Provider>
		</ConsentTrackingContext.Provider>
	);
};

interface IABConsentBannerRootChildrenProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	noStyle?: boolean;
	disableAnimation?: boolean;
	/**
	 * Which consent models this banner responds to.
	 * @default ['iab']
	 */
	models?: C15tCoreTypes.Model[];
}

const IABConsentBannerRootChildren = forwardRef<
	HTMLDivElement,
	IABConsentBannerRootChildrenProps
>(function (
	{
		children,
		className,
		style,
		className: forwardedClassName,
		disableAnimation,
		noStyle,
		models = DEFAULT_MODELS,
		...props
	}: IABConsentBannerRootChildrenProps & {
		style?: CSSProperties;
		className?: string;
	},
	ref
) {
	const { activeUI, translationConfig, model } = useConsentManager();
	const textDirection = useTextDirection(translationConfig.defaultLanguage);
	const [isVisible, setIsVisible] = useState(false);
	const [hasAnimated, setHasAnimated] = useState(false);
	const isMounted = useIsHydrated();

	// IAB banner shows when activeUI is 'banner' and the current model matches
	const shouldShowBanner = activeUI === 'banner' && models.includes(model);

	useEffect(() => {
		if (shouldShowBanner) {
			if (hasAnimated) {
				const frame = requestAnimationFrame(() => setIsVisible(true));
				return () => cancelAnimationFrame(frame);
			}
			const animationTimer = setTimeout(() => {
				setIsVisible(true);
				setHasAnimated(true);
			}, 10);
			return () => clearTimeout(animationTimer);
		}
		const frame = requestAnimationFrame(() => setHasAnimated(false));

		if (disableAnimation) {
			const visibilityFrame = requestAnimationFrame(() => setIsVisible(false));
			return () => {
				cancelAnimationFrame(frame);
				cancelAnimationFrame(visibilityFrame);
			};
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
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(timer);
		};
	}, [shouldShowBanner, disableAnimation, hasAnimated]);

	const contentStyle = useStyles('iabConsentBanner', {
		baseClassName: [styles.root],
		style: style as CSSPropertiesWithVars<Record<string, never>>,
		className: className || forwardedClassName,
		noStyle,
	});

	if (!isMounted) {
		return null;
	}

	const finalClassName = noStyle
		? contentStyle.className || ''
		: `${contentStyle.className || ''} ${isVisible ? styles.bannerVisible : styles.bannerHidden}`;
	const domStyleProps = sanitizeDOMStyleProps(contentStyle);

	if (!shouldShowBanner) {
		return null;
	}

	return createPortal(
		<>
			<IABConsentBannerOverlay />
			<div
				ref={ref}
				{...props}
				{...domStyleProps}
				className={finalClassName}
				data-testid="iab-consent-banner-root"
				dir={textDirection}
			>
				{children}
			</div>
		</>,
		document.body
	);
});

IABConsentBannerRootChildren.displayName = 'IABConsentBannerRootChildren';

export { IABConsentBannerRoot };
