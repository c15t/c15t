'use client';

import type { ComponentChildren, FunctionComponent } from 'preact';
import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/compat';
import { type Ref, forwardRef } from 'preact/compat';
import { createPortal } from 'preact/compat';

import { Overlay } from './atoms/overlay';

import { LocalThemeContext } from '~/context/theme-context';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useStyles } from '~/hooks/use-styles';
import type { CSSPropertiesWithVars } from '~/types/theme';
import type { CookieBannerTheme } from './theme';

import styles from './cookie-banner.module.css';

// Import the sub-components that the CookieBanner uses
import {
	CookieBannerAcceptButton,
	CookieBannerCard,
	CookieBannerCustomizeButton,
	CookieBannerDescription,
	CookieBannerFooter,
	CookieBannerFooterSubGroup,
	CookieBannerHeader,
	CookieBannerRejectButton,
	CookieBannerTitle,
} from './components';

/**
 * Props for configuring and customizing the CookieBanner component.
 */
interface CookieBannerProps {
	/** Custom styles to apply to the banner and its child components */
	theme?: Partial<CookieBannerTheme>;

	/** Remove default styles */
	noStyle?: boolean;

	/** Content to display as the banner's title */
	title?: ComponentChildren;

	/** Content to display as the banner's description */
	description?: ComponentChildren;

	/** Content to display on the reject button */
	rejectButtonText?: ComponentChildren;

	/** Content to display on the customize button */
	customizeButtonText?: ComponentChildren;

	/** Content to display on the accept button */
	acceptButtonText?: ComponentChildren;

	/** Lock page scroll while banner is open */
	scrollLock?: boolean;

	/** Trap focus within the banner (default true) */
	trapFocus?: boolean;

	/** Disable entrance and exit animations */
	disableAnimation?: boolean;
}

/**
 * A customizable cookie consent banner component.
 */
const CookieBanner: FunctionComponent<CookieBannerProps> = ({
	theme: localTheme,
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus = true,
	title,
	description,
	rejectButtonText,
	customizeButtonText,
	acceptButtonText,
}) => {
	// For now, we'll use basic default values since we don't have a full translations system
	const translations = {
		cookieBanner: {
			title: title || 'Cookie Notice',
			description:
				description ||
				'We use cookies to enhance your browsing experience and analyze our traffic.',
		},
		common: {
			rejectAll: rejectButtonText || 'Reject All',
			customize: customizeButtonText || 'Customize',
			acceptAll: acceptButtonText || 'Accept All',
		},
	};

	const mergedTheme = localTheme || {};
	const mergedProps = {
		theme: mergedTheme,
		noStyle: localNoStyle,
		disableAnimation: localDisableAnimation,
		scrollLock: localScrollLock,
		trapFocus: localTrapFocus,
	};

	return (
		<CookieBannerRoot {...mergedProps}>
			<CookieBannerCard aria-label={String(translations.cookieBanner.title)}>
				<CookieBannerHeader>
					<CookieBannerTitle>
						{translations.cookieBanner.title}
					</CookieBannerTitle>
					<CookieBannerDescription>
						{translations.cookieBanner.description}
					</CookieBannerDescription>
				</CookieBannerHeader>
				<CookieBannerFooter>
					<CookieBannerFooterSubGroup>
						<CookieBannerRejectButton themeKey="banner.footer.reject-button">
							{translations.common.rejectAll}
						</CookieBannerRejectButton>
						<CookieBannerAcceptButton themeKey="banner.footer.accept-button">
							{translations.common.acceptAll}
						</CookieBannerAcceptButton>
					</CookieBannerFooterSubGroup>
					<CookieBannerCustomizeButton themeKey="banner.footer.customize-button">
						{translations.common.customize}
					</CookieBannerCustomizeButton>
				</CookieBannerFooter>
			</CookieBannerCard>
		</CookieBannerRoot>
	);
};

/**
 * Props for the root component of the CookieBanner.
 */
interface CookieBannerRootProps extends JSX.HTMLAttributes<HTMLDivElement> {
	/** Children to render inside the banner */
	children: ComponentChildren;

	/** Remove default styles */
	noStyle?: boolean;

	/** Theme tokens for the banner */
	theme?: Partial<CookieBannerTheme>;

	/** Disable entrance and exit animations */
	disableAnimation?: boolean;

	/** Lock page scroll while banner is open */
	scrollLock?: boolean;

	/** Trap focus within the banner (default true) */
	trapFocus?: boolean;
}

/**
 * Root component that provides context and styling.
 */
const CookieBannerRoot: FunctionComponent<CookieBannerRootProps> = ({
	children,
	className,
	noStyle,
	disableAnimation,
	theme,
	scrollLock,
	trapFocus = true,
	...props
}) => {
	const contextValue = {
		disableAnimation,
		noStyle,
		theme,
		scrollLock,
		trapFocus,
	};

	return (
		<LocalThemeContext.Provider value={contextValue}>
			<CookieBannerRootChildren
				disableAnimation={disableAnimation}
				className={className}
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
 */
interface CookieBannerRootChildrenProps
	extends JSX.HTMLAttributes<HTMLDivElement> {
	children: ComponentChildren;
	/** Do not apply any default styles */
	noStyle?: boolean;
	/** Render children directly without wrapping */
	asChild?: boolean;
	disableAnimation?: boolean;
}

/**
 * Content renderer that handles layout, animations and portal.
 */
const CookieBannerRootChildren = forwardRef<
	HTMLDivElement,
	CookieBannerRootChildrenProps
>(function CookieBannerRootChildren(
	{ asChild, children, className, style, disableAnimation, noStyle, ...props },
	ref: Ref<HTMLDivElement>
) {
	const { showPopup } = useConsentManager();
	const [isVisible, setIsVisible] = useState(false);
	const [hasAnimated, setHasAnimated] = useState(false);
	const [animationDurationMs, setAnimationDurationMs] = useState(200); // SSR fallback

	// Read animation duration from CSS var on client
	useEffect(() => {
		const duration = Number.parseInt(
			getComputedStyle(document.documentElement).getPropertyValue(
				'--banner-animation-duration'
			) || '200',
			10
		);
		setAnimationDurationMs(duration);
	}, []);

	// Visibility and animation control
	useEffect(() => {
		if (showPopup) {
			if (!hasAnimated) {
				const t = setTimeout(() => {
					setIsVisible(true);
					setHasAnimated(true);
				}, 10);
				return () => clearTimeout(t);
			}
			setIsVisible(true);
		} else {
			setHasAnimated(false);
			if (disableAnimation) {
				setIsVisible(false);
			} else {
				const t = setTimeout(() => setIsVisible(false), animationDurationMs);
				return () => clearTimeout(t);
			}
		}
	}, [showPopup, disableAnimation, hasAnimated, animationDurationMs]);

	// Compose styles from theme context
	const contentStyle = useStyles('banner.root', {
		baseClassName: [styles.root, styles.bottomLeft],
		style: style as CSSPropertiesWithVars<Record<string, never>>,
		className: className?.toString(),
		noStyle,
	});

	// Avoid SSR hydration issues with portals
	const [isMounted, setIsMounted] = useState(false);
	useEffect(() => {
		setIsMounted(true);
	}, []);
	if (!isMounted) return null;

	const finalClassName = noStyle
		? contentStyle.className || ''
		: `${contentStyle.className || ''} ${
				isVisible ? styles.bannerVisible : styles.bannerHidden
			}`;

	// Only render while popup is active
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
});

CookieBannerRootChildren.displayName = 'CookieBannerRootChildren';

const Root = CookieBannerRoot;

export { Root, CookieBannerRoot, CookieBanner };
export type { CookieBannerProps, CookieBannerRootProps };
