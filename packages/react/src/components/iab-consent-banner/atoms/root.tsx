'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner.module.css';
import {
	type CSSProperties,
	type FC,
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	useEffect,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { LocalThemeContext } from '~/context/theme-context';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useStyles } from '~/hooks/use-styles';
import { useTextDirection } from '~/hooks/use-text-direction';
import type { CSSPropertiesWithVars } from '~/types/theme';
import { IABConsentBannerOverlay } from './overlay';

interface IABConsentBannerRootProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	noStyle?: boolean;
	disableAnimation?: boolean;
	scrollLock?: boolean;
	trapFocus?: boolean;
}

const IABConsentBannerRoot: FC<IABConsentBannerRootProps> = ({
	children,
	className,
	noStyle,
	disableAnimation,
	scrollLock,
	trapFocus = true,
	...props
}) => {
	const contextValue = {
		disableAnimation,
		noStyle,
		scrollLock,
		trapFocus,
	};

	return (
		<LocalThemeContext.Provider value={contextValue}>
			<IABConsentBannerRootChildren
				disableAnimation={disableAnimation}
				className={className}
				noStyle={noStyle}
				{...props}
			>
				{children}
			</IABConsentBannerRootChildren>
		</LocalThemeContext.Provider>
	);
};

interface IABConsentBannerRootChildrenProps
	extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	noStyle?: boolean;
	disableAnimation?: boolean;
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
			...props
		}: IABConsentBannerRootChildrenProps & {
			style?: CSSProperties;
			className?: string;
		},
		ref
	) => {
		const { showPopup, translationConfig, model, iab, isPrivacyDialogOpen } =
			useConsentManager();
		const textDirection = useTextDirection(translationConfig.defaultLanguage);
		const [isVisible, setIsVisible] = useState(false);
		const [hasAnimated, setHasAnimated] = useState(false);
		const [animationDurationMs, setAnimationDurationMs] = useState(200);

		// IAB banner shows when IAB mode is enabled (model is 'iab' in GDPR jurisdictions with IAB enabled)
		// Hide banner when preference center is open - it will reappear if closed without consent
		// Check that IAB is configured AND enabled (server may have disabled it by returning null GVL)
		const isIABActive = iab?.config.enabled;
		const shouldShowBanner =
			model === 'iab' && showPopup && isIABActive && !isPrivacyDialogOpen;

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

		const contentStyle = useStyles('iabConsentBanner', {
			baseClassName: [
				styles.root,
				textDirection === 'ltr' ? styles.bottomLeft : styles.bottomRight,
			],
			style: style as CSSPropertiesWithVars<Record<string, never>>,
			className: className || forwardedClassName,
			noStyle,
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
					{...props}
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
