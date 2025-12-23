/**
 * @packageDocumentation
 * Provides the main cookie banner component for privacy consent management.
 * Implements an accessible, customizable banner following GDPR and CCPA requirements.
 */

import type { CookieBannerTheme } from '@c15t/styles/components/cookie-banner';
import styles from '@c15t/styles/components/cookie-banner/css';
import type { CSSPropertiesWithVars } from '@c15t/styles/types';
import type { ComponentChildren, FunctionComponent, JSX } from 'preact';
import { createPortal, Fragment, forwardRef, type Ref } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { useTranslations } from '~/hooks/use-translations';
import { LocalThemeContext } from '../../context/theme-context';
import { useConsentManager } from '../../hooks/use-consent-manager';
import { useStyles } from '../../hooks/use-styles';
import { ConsentButton } from '../shared/primitives/button';
import { Overlay } from './atoms/overlay';
import {
	CookieBannerCard,
	CookieBannerDescription,
	CookieBannerFooter,
	CookieBannerFooterSubGroup,
	CookieBannerHeader,
	CookieBannerTitle,
} from './components';

/**
 * Identifiers for the available buttons in the cookie banner.
 * @public
 */
export type CookieBannerButton = 'reject' | 'accept' | 'customize';

/**
 * Structure for defining the layout of buttons in the cookie banner.
 * Supports nesting for grouping buttons.
 * @public
 */
export type CookieBannerLayout = (CookieBannerButton | CookieBannerButton[])[];

const DEFAULT_LAYOUT: CookieBannerLayout = [['reject', 'accept'], 'customize'];

/**
 * Props for configuring and customizing the CookieBanner component.
 *
 * @remarks
 * Provides comprehensive customization options for the cookie banner's appearance
 * and behavior while maintaining compliance with privacy regulations.
 *
 * @public
 */
export interface CookieBannerProps {
	/**
	 * Custom styles to apply to the banner and its child components
	 * @remarks Allows for deep customization of the banner's appearance while maintaining accessibility
	 * @default undefined
	 */
	theme?: Partial<CookieBannerTheme>;

	/**
	 * When true, removes all default styling from the component
	 * @remarks Useful for implementing completely custom designs
	 * @default false
	 */
	noStyle?: boolean;

	/**
	 * Content to display as the banner's title
	 * @remarks Should be concise and clearly communicate the purpose of the banner
	 * @default "Cookie Notice"
	 */
	title?: ComponentChildren;

	/**
	 * Content to display as the banner's description
	 * @remarks Should explain why cookies are used and what the user can do
	 * @default "We use cookies to enhance your browsing experience and analyze our traffic."
	 */
	description?: ComponentChildren;

	/**
	 * Content to display on the reject button
	 * @remarks Should clearly indicate that this will reject all non-essential cookies
	 * @default "Reject All"
	 */
	rejectButtonText?: ComponentChildren;

	/**
	 * Content to display on the customize button
	 * @remarks Should indicate that this opens customization options
	 * @default "Customize"
	 */
	customizeButtonText?: ComponentChildren;

	/**
	 * Content to display on the accept button
	 * @remarks Should clearly indicate that this will accept all cookies
	 * @default "Accept All"
	 */
	acceptButtonText?: ComponentChildren;

	/**
	 * Lock page scroll while banner is open
	 * @remarks Prevents background scrolling when the banner is displayed
	 * @default false
	 */
	scrollLock?: boolean;

	/**
	 * Trap focus within the banner (default true)
	 * @remarks Ensures keyboard navigation stays within the banner for accessibility
	 * @default true
	 */
	trapFocus?: boolean;

	/**
	 * Disable entrance and exit animations
	 * @remarks Useful for users with motion sensitivity or performance constraints
	 * @default false
	 */
	disableAnimation?: boolean;

	/**
	 * Defines the layout of buttons in the footer.
	 * Allows reordering and grouping of buttons.
	 *
	 * @defaultValue [['reject', 'accept'], 'customize']
	 */
	layout?: CookieBannerLayout;

	/**
	 * Specifies which button(s) should be highlighted as the primary action.
	 *
	 * @defaultValue 'customize'
	 */
	primaryButton?: CookieBannerButton | CookieBannerButton[];
}

/**
 * A customizable cookie consent banner component.
 *
 * @remarks
 * This component provides a complete cookie consent banner implementation that follows
 * GDPR and CCPA compliance requirements. It includes accessibility features, animations,
 * and comprehensive customization options.
 *
 * @param props - Configuration options for the banner
 * @returns JSX element representing the cookie banner
 *
 * @example
 * ```tsx
 * <CookieBanner
 *   title="We use cookies"
 *   description="This website uses cookies to improve your experience."
 *   acceptButtonText="Accept All"
 *   rejectButtonText="Reject All"
 *   customizeButtonText="Customize"
 * />
 * ```
 *
 * @public
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
	layout = DEFAULT_LAYOUT,
	primaryButton = 'customize',
}) => {
	const { cookieBanner, common } = useTranslations();

	const mergedTheme = localTheme || {};
	const mergedProps = {
		theme: mergedTheme,
		noStyle: localNoStyle,
		disableAnimation: localDisableAnimation,
		scrollLock: localScrollLock,
		trapFocus: localTrapFocus,
	};

	const renderButton = (type: CookieBannerButton) => {
		const isPrimary = Array.isArray(primaryButton)
			? primaryButton.includes(type)
			: type === primaryButton;
		const variant = isPrimary ? 'primary' : undefined;

		switch (type) {
			case 'reject':
				return (
					<ConsentButton
						action="reject-consent"
						closeCookieBanner
						themeKey="banner.footer.reject-button"
						data-testid="cookie-banner-reject-button"
						variant={variant}
					>
						{rejectButtonText || common.rejectAll}
					</ConsentButton>
				);
			case 'accept':
				return (
					<ConsentButton
						action="accept-consent"
						closeCookieBanner
						themeKey="banner.footer.accept-button"
						data-testid="cookie-banner-accept-button"
						variant={variant}
					>
						{acceptButtonText || common.acceptAll}
					</ConsentButton>
				);
			case 'customize':
				return (
					<ConsentButton
						action="open-consent-dialog"
						closeCookieBanner
						themeKey="banner.footer.customize-button"
						data-testid="cookie-banner-customize-button"
						variant={variant}
					>
						{customizeButtonText || common.customize}
					</ConsentButton>
				);
		}
	};

	return (
		<CookieBannerRoot {...mergedProps}>
			<CookieBannerCard aria-label={cookieBanner.title}>
				<CookieBannerHeader>
					<CookieBannerTitle>{title || cookieBanner.title}</CookieBannerTitle>
					<CookieBannerDescription>
						{description || cookieBanner.description}
					</CookieBannerDescription>
				</CookieBannerHeader>
				<CookieBannerFooter>
					{layout.map((item, index) => {
						if (Array.isArray(item)) {
							const groupKey = item.join('-');
							return (
								<CookieBannerFooterSubGroup
									key={groupKey ? `group-${groupKey}` : `group-${index}`}
								>
									{item.map((subItem) => (
										<Fragment key={subItem}>{renderButton(subItem)}</Fragment>
									))}
								</CookieBannerFooterSubGroup>
							);
						}
						return <Fragment key={item}>{renderButton(item)}</Fragment>;
					})}
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
export type { CookieBannerRootProps };
