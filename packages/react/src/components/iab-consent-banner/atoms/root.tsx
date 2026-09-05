'use client';

import type * as C15tCoreTypes from '@c15t/core';
import styles from '@c15t/ui/styles/components/iab-consent-banner';
import {
	forwardRef as createForwardRef,
	useEffect,
	useMemo,
	useState,
} from 'react';
import type { CSSProperties, FC, HTMLAttributes, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { ConsentTrackingContext } from '~/context/consent-tracking-context';
import { LocalThemeContext } from '~/context/theme-context';
import {
	useActiveUI,
	useModel,
	usePolicyBanner,
	useTranslations,
} from '~/hooks';
import { useIsHydrated } from '~/hooks/use-is-hydrated';
import { useTextDirection } from '~/hooks/use-text-direction';
import type { CSSPropertiesWithVars } from '~/types/theme';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

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

const IABConsentBannerRootChildren = createForwardRef<
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
			models = DEFAULT_MODELS,
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
			const frame = requestAnimationFrame(() => {
				setAnimationDurationMs(duration);
			});
			return () => cancelAnimationFrame(frame);
		}, []);

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

			if (disableAnimation) {
				const frame = requestAnimationFrame(() => {
					setHasAnimated(false);
					setIsVisible(false);
				});
				return () => cancelAnimationFrame(frame);
			}
			const frame = requestAnimationFrame(() => setHasAnimated(false));
			const timer = setTimeout(() => {
				setIsVisible(false);
			}, animationDurationMs);
			return () => {
				cancelAnimationFrame(frame);
				clearTimeout(timer);
			};
		}, [shouldShowBanner, disableAnimation, hasAnimated, animationDurationMs]);

		const contentStyle = mergeSlotProps(components?.['iab-banner']?.root, {
			baseClassName: [styles.root],
			className: className || forwardedClassName,
			noStyle,
			style: style as CSSPropertiesWithVars<Record<string, never>>,
			...props,
		});

		const isMounted = useIsHydrated();

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
					data-position={
						textDirection === 'ltr' ? 'bottom-left' : 'bottom-right'
					}
					data-testid="iab-consent-banner-root"
					dir={textDirection}
					tabIndex={-1}
				>
					{children}
				</div>
			</>,
			document.body
		);
	}
);
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
	const resolvedScrollLock =
		scrollLock ?? policyBanner?.scrollLock ?? undefined;
	const contextValue = useMemo(
		() => ({
			disableAnimation,
			noStyle,
			scrollLock: resolvedScrollLock,
			trapFocus,
		}),
		[disableAnimation, noStyle, resolvedScrollLock, trapFocus]
	);
	const trackingContextValue = useMemo(
		() => ({ uiSource: uiSource ?? 'iab_banner' }),
		[uiSource]
	);

	return (
		<ConsentTrackingContext.Provider value={trackingContextValue}>
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

IABConsentBannerRootChildren.displayName = 'IABConsentBannerRootChildren';

export { IABConsentBannerRoot };
