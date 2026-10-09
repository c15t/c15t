'use client';

import type * as C15tCoreTypes from '@c15t/core';
import styles from '@c15t/ui/styles/components/iab-consent-banner';
import { forwardRef as createForwardRef, useMemo } from 'react';
import type { CSSProperties, FC, HTMLAttributes, ReactNode } from 'react';

import { ConsentTrackingContext } from '~/context/consent-tracking-context';
import { LocalThemeContext } from '~/context/theme-context';
import { useActiveUI, useModel, useTranslations } from '~/hooks';
import { useIABConsentManager } from '~/hooks/use-iab-manager';
import { useLateEntry } from '~/hooks/use-late-entry';
import { useTextDirection } from '~/hooks/use-text-direction';
import type { CSSPropertiesWithVars } from '~/types/theme';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

import { IAB_FIRST_PAINT_SHEETS } from '../../shared/iab-first-paint-sheets';
import { SurfaceStyles } from '../../shared/surface-styles';
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
		// IAB banner shows when activeUI is 'banner' and the current model matches
		const shouldShowBanner =
			model !== null && activeUI === 'banner' && models.includes(model);
		// A banner that arrives after the page painted fades in.
		const lateEntry = useLateEntry(shouldShowBanner) && !disableAnimation;
		const contentStyle = mergeSlotProps(components?.['iab-banner']?.root, {
			baseClassName: [styles.root],
			className: className || forwardedClassName,
			noStyle,
			style: style as CSSPropertiesWithVars<Record<string, never>>,
			...props,
		});

		const finalClassName = noStyle
			? contentStyle.className || ''
			: `${contentStyle.className || ''} ${styles.bannerVisible}${disableAnimation ? '' : ` ${styles.bannerEntering}`}`;
		if (!shouldShowBanner) {
			return null;
		}

		// Rendered inline rather than through a portal so the banner exists in
		// server HTML; the stylesheet positions it with `position: fixed`.
		return (
			<>
				<SurfaceStyles
					sheets={IAB_FIRST_PAINT_SHEETS}
					noStyle={noStyle}
				/>
				<IABConsentBannerOverlay />
				<div
					ref={ref}
					{...contentStyle}
					className={finalClassName}
					data-position={
						textDirection === 'ltr' ? 'bottom-left' : 'bottom-right'
					}
					data-entry={lateEntry ? 'late' : undefined}
					data-testid="iab-consent-banner-root"
					dir={textDirection}
					tabIndex={-1}
				>
					{children}
				</div>
			</>
		);
	}
);
const IABConsentBannerRoot: FC<IABConsentBannerRootProps> = ({
	children,
	className,
	noStyle,
	disableAnimation,
	scrollLock,
	trapFocus,
	models,
	uiSource,
	...props
}) => {
	const { policyBanner } = useIABConsentManager({
		prompt: { scrollLock, trapFocus },
	});
	const resolvedScrollLock = policyBanner.blocking;
	const contextValue = useMemo(
		() => ({
			disableAnimation,
			noStyle,
			scrollLock: resolvedScrollLock,
			trapFocus: resolvedScrollLock,
		}),
		[disableAnimation, noStyle, resolvedScrollLock]
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
