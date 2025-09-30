'use client';

/**
 * @packageDocumentation
 * Provides the overlay backdrop component for the CookieBanner root and its portalised content.
 */

import styles from '@c15t/styles/components/cookie-banner.module.css';
import type { ComponentChildren, JSX } from 'preact';
import { createPortal, forwardRef } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { LocalThemeContext } from '~/context/theme-context';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useStyles } from '~/hooks/use-styles';
import type { CSSPropertiesWithVars } from '~/types/theme';
import type { CookieBannerTheme } from '../theme';
import { Overlay } from './overlay';

/**
 * Props for the root component of the CookieBanner.
 *
 * @public
 */
interface CookieBannerRootProps extends JSX.HTMLAttributes<HTMLDivElement> {
	/** Elements to be rendered within the cookie banner. */
	children: ComponentChildren;

	/** Removes all default styling from the banner and its children. */
	noStyle?: boolean;

	/** Theme overrides for the banner and its children. */
	theme?: Partial<CookieBannerTheme>;

	/** Disables entrance/exit animations. */
	disableAnimation?: boolean;

	/** Locks page scroll while the banner is shown. */
	scrollLock?: boolean;

	/** Traps focus while the banner is shown. */
	trapFocus?: boolean;
}

/**
 * Root component of the CookieBanner that provides context and styling.
 *
 * @public
 */
const CookieBannerRoot = ({
	children,
	className,
	noStyle,
	disableAnimation,
	theme,
	scrollLock,
	trapFocus = true,
	...props
}: CookieBannerRootProps) => {
	// Theme context value for children
	const contextValue = {
		disableAnimation,
		noStyle,
		theme,
		scrollLock,
		trapFocus,
	};

	return (
		<LocalThemeContext.Provider value={contextValue}>
			{/* @ts-expect-error - TODO: fix this */}
			<CookieBannerRootChildren
				disableAnimation={disableAnimation}
				className={className?.toString()}
				noStyle={noStyle}
				{...props}
			>
				{children}
			</CookieBannerRootChildren>
		</LocalThemeContext.Provider>
	);
};

/**
 * Props for the content section of the CookieBanner.
 *
 * @public
 */
interface CookieBannerRootChildrenProps
	extends JSX.HTMLAttributes<HTMLDivElement> {
	/** Elements to be rendered within the content section. */
	children: ComponentChildren;

	/** When true, the component will not apply any styles. */
	noStyle?: boolean;

	/** Render children directly (reserved for parity, not used here). */
	asChild?: boolean;

	/** Disables animations for this section. */
	disableAnimation?: boolean;
}

/**
 * Content component for the CookieBanner that handles layout and animations.
 *
 * @public
 */
const CookieBannerRootChildren = forwardRef<
	HTMLDivElement,
	CookieBannerRootChildrenProps & {
		style?: JSX.CSSProperties | string | undefined;
		className?: string;
	}
>(
	(
		{
			asChild,
			children,
			className,
			style,
			className: forwardedClassName,
			disableAnimation,
			noStyle,
			...props
		},
		ref
	) => {
		// Normalize style prop to handle Signalish types
		const normalizedStyle =
			typeof style === 'object' && 'value' in style ? style.value : style;

		const { showPopup } = useConsentManager();
		const [isVisible, setIsVisible] = useState(false);
		const [hasAnimated, setHasAnimated] = useState(false);
		const [animationDurationMs, setAnimationDurationMs] = useState(200); // SSR-safe default

		// Read animation duration from CSS custom property on client
		useEffect(() => {
			const duration = Number.parseInt(
				getComputedStyle(document.documentElement).getPropertyValue(
					'--banner-animation-duration'
				) || '200',
				10
			);
			setAnimationDurationMs(duration);
		}, []);

		// Handle animation visibility state
		useEffect(() => {
			if (showPopup) {
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
		}, [showPopup, disableAnimation, hasAnimated, animationDurationMs]);

		// Apply styles from the CookieBanner context and merge with local styles
		const contentStyle = useStyles('banner.root', {
			baseClassName: [styles.root, styles.bottomLeft],
			style: normalizedStyle as CSSPropertiesWithVars<Record<string, never>>,
			className: className || forwardedClassName,
			noStyle,
		});

		// Avoid SSR hydration issues with portals
		const [isMounted, setIsMounted] = useState(false);
		useEffect(() => {
			setIsMounted(true);
		}, []);

		if (!isMounted) {
			return null;
		}

		// Final class name with animation visibility
		const finalClassName = noStyle
			? contentStyle.className || ''
			: `${contentStyle.className || ''} ${isVisible ? styles.bannerVisible : styles.bannerHidden}`;

		// Only render when the banner should be shown
		return showPopup
			? createPortal(
					<>
						<Overlay />
						<div
							ref={ref}
							{...props}
							{...contentStyle}
							className={finalClassName}
							data-testid="cookie-banner-root"
						>
							{children}
						</div>
					</>,
					document.body
				)
			: null;
	}
);

CookieBannerRootChildren.displayName = 'CookieBannerRootChildren';

const Root = CookieBannerRoot;

export { Root, CookieBannerRoot };
