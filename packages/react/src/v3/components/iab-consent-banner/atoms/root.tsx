'use client';

import styles from '@c15t/ui/styles/v3/iab-consent-banner';
import { forwardRef, useEffect, useState } from 'react';
import type { CSSProperties, FC, HTMLAttributes, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { ConsentTrackingContext } from '~/v3/context/consent-tracking-context';
import { LocalThemeContext } from '~/v3/context/theme-context';
import {
	useActiveUI,
	useModel,
	usePolicyBanner,
	useTranslations,
} from '~/v3/hooks';
import { useTextDirection } from '~/v3/hooks/use-text-direction';
import type { CSSPropertiesWithVars } from '~/v3/types/theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

import { IABConsentBannerOverlay } from './overlay';

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
	models?: import('@c15t/core').Model[];
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
	const policyBanner = usePolicyBanner();
	const contextValue = {
		disableAnimation,
		noStyle,
		scrollLock: scrollLock ?? policyBanner?.scrollLock ?? undefined,
		trapFocus,
	};

	return (
		<ConsentTrackingContext.Provider
			value={{ uiSource: uiSource ?? 'iab_banner' }}
		>
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
	models?: import('@c15t/core').Model[];
}

const IABConsentBannerRootChildren = forwardRef<
	HTMLDivElement,
	IABConsentBannerRootChildrenProps
>(
	(
		{
			children,
			className,
			style,
			className: forwardedClassName,
			disableAnimation,
			noStyle,
			models = ['iab'],
			...props
		}: IABConsentBannerRootChildrenProps & {
			style?: CSSProperties;
			className?: string;
		},
		ref
	) => {
		const activeUI = useActiveUI();
		const { components } = useUIConfig();
		const model = useModel();
		const translations = useTranslations();
		const textDirection = useTextDirection(translations?.language ?? 'en');
		const [isVisible, setIsVisible] = useState(false);
		const [hasAnimated, setHasAnimated] = useState(false);
		const [animationDurationMs, setAnimationDurationMs] = useState(200);

		// IAB banner shows when activeUI is 'banner' and the current model matches
		const shouldShowBanner = activeUI === 'banner' && models.includes(model);

		useEffect(() => {
			const duration = Number.parseInt(
				getComputedStyle(document.documentElement).getPropertyValue(
					'--iab-consent-banner-animation-duration'
				) || '200',
				10
			);
			setAnimationDurationMs(duration);
		}, []);

		useEffect(() => {
			if (shouldShowBanner) {
				if (hasAnimated) {
					setIsVisible(true);
				} else {
					const animationTimer = setTimeout(() => {
						setIsVisible(true);
						setHasAnimated(true);
					}, 10);
					return () => clearTimeout(animationTimer);
				}
			} else {
				setHasAnimated(false);

				if (disableAnimation) {
					setIsVisible(false);
				} else {
					const timer = setTimeout(() => {
						setIsVisible(false);
					}, animationDurationMs);
					return () => clearTimeout(timer);
				}
			}
		}, [shouldShowBanner, disableAnimation, hasAnimated, animationDurationMs]);

		const contentStyle = mergeSlotProps(components?.['iab-banner']?.root, {
			baseClassName: [styles.root],
			style: style as CSSPropertiesWithVars<Record<string, never>>,
			className: className || forwardedClassName,
			noStyle,
			...props,
		});

		const [isMounted, setIsMounted] = useState(false);

		useEffect(() => {
			setIsMounted(true);
		}, []);

		if (!isMounted) {
			return null;
		}

		const finalClassName = noStyle
			? contentStyle.className || ''
			: `${contentStyle.className || ''} ${isVisible ? styles.bannerVisible : styles.bannerHidden}`;
		if (!shouldShowBanner) {
			return null;
		}

		return createPortal(
			<>
				<IABConsentBannerOverlay />
				<div
					ref={ref}
					{...contentStyle}
					className={finalClassName}
					data-testid="iab-consent-banner-root"
					dir={textDirection}
				>
					{children}
				</div>
			</>,
			document.body
		);
	}
);

IABConsentBannerRootChildren.displayName = 'IABConsentBannerRootChildren';

export { IABConsentBannerRoot };
