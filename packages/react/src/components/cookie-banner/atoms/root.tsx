'use client';

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
import styles from '../cookie-banner.module.css';
import type { CookieBannerTheme } from '../theme';
import { Overlay } from './overlay';

/**
 * Props for the root component of the CookieBanner.
 *
 * @remarks
 * The root component serves as the top-level container and context provider
 * for the cookie banner. It manages the consent state and styling configuration
 * for all child components.
 *
 * @public
 */
interface CookieBannerRootProps extends HTMLAttributes<HTMLDivElement> {
	/**
	 * @remarks
	 * React elements to be rendered within the cookie banner.
	 * Typically includes Content, Title, Description, and Actions components.
	 */
	children: ReactNode;

	/**
	 * @remarks
	 * When true, removes all default styling from the banner and its children.
	 * Useful when implementing completely custom styles.
	 */
	noStyle?: boolean;

	/**
	 * @remarks
	 * Custom styles to be applied to the banner and its child components.
	 * These styles are made available through the CookieBanner context.
	 */
	theme?: Partial<CookieBannerTheme>;

	/**
	 * @remarks
	 * When true, disables the entrance/exit animations.
	 * Useful for environments where animations are not desired.
	 */
	disableAnimation?: boolean;

	/**
	 * @remarks
	 * When true, the cookie banner will lock the scroll of the page.
	 * Useful for implementing a cookie banner that locks the scroll of the page.
	 * @default false
	 */
	scrollLock?: boolean;

	/**
	 * @remarks
	 * When true, the cookie banner will trap focus.
	 * Useful for implementing a cookie banner that traps focus.
	 * @default true
	 */
	trapFocus?: boolean;
}

/**
 * Root component of the CookieBanner that provides context and styling.
 *
 * @remarks
 * This component:
 * - Provides the CookieBanner context to all child components
 * - Manages consent state through the consent manager
 * - Handles style distribution to child components
 * - Serves as the main container for the banner
 *
 * @example
 * Basic usage:
 * ```tsx
 * <CookieBanner.Root>
 *   <CookieBanner.Content>
 *     {Banner content}
 *   </CookieBanner.Content>
 * </CookieBanner.Root>
 * ```
 *
 * @example
 * With custom styling:
 * ```tsx
 * <CookieBanner.Root
 *   styles={{
 *     root: "fixed bottom-0 w-full bg-white ",
 *     content: "max-w-4xl mx-auto p-4",
 *     title: "text-xl font-bold",
 *     description: "mt-2 text-gray-600"
 *   }}
 * >
 *   { Banner content}
 * </CookieBanner.Root>
 * ```
 *
 * @public
 */
const CookieBannerRoot: FC<CookieBannerRootProps> = ({
	children,
	className,
	noStyle,
	disableAnimation,
	theme,
	scrollLock,
	trapFocus = true,
	...props
}) => {
	/**
	 * Combine consent manager state with styling configuration
	 * to create the context value for child components
	 */
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
 *
 * @public
 */
interface CookieBannerRootChildrenProps extends HTMLAttributes<HTMLDivElement> {
	/**
	 * @remarks
	 * React elements to be rendered within the content section.
	 * This typically includes the title, description, and action buttons.
	 */
	children: ReactNode;

	/**
	 * @remarks
	 * When true, the component will not apply any styles.
	 */
	noStyle?: boolean;

	/**
	 * @remarks
	 * When true, the component will render its children directly without wrapping them in a DOM element.
	 * This enables better composition with other components.
	 */
	asChild?: boolean;

	disableAnimation?: boolean;
}

/**
 * Content component for the CookieBanner that handles layout and animations.
 *
 * @remarks
 * This component manages the main content area of the cookie banner, including:
 * - Client-side portal rendering to ensure proper stacking context
 * - Optional entrance/exit animations (controlled via CookieBanner.Root)
 * - Conditional rendering based on banner visibility state
 * - Style composition through the CookieBanner context
 *
 * @example
 * Basic usage with default styling and animations:
 * ```tsx
 * <CookieBannerRootChildren>
 *   <CookieBanner.Title>Privacy Notice</CookieBanner.Title>
 *   <CookieBanner.Description>
 *     We use cookies to improve your experience
 *   </CookieBanner.Description>
 *   <CookieBanner.Actions>
 *     <CookieBanner.RejectButton>Decline</CookieBanner.RejectButton>
 *     <CookieBanner.AcceptButton>Accept</CookieBanner.AcceptButton>
 *   </CookieBanner.Actions>
 * </CookieBannerRootChildren>
 * ```
 *
 * @example
 * Using asChild for custom wrapper:
 * ```tsx
 * <CookieBannerRootChildren asChild>
 *   <Card className="my-custom-card">
 *     {Content}
 *   </Card>
 * </CookieBannerRootChildren>
 * ```
 *
 * @public
 */
const CookieBannerRootChildren = forwardRef<
	HTMLDivElement,
	CookieBannerRootChildrenProps
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
		}: CookieBannerRootChildrenProps & {
			style?: CSSProperties;
			className?: string;
		},
		ref
	) => {
		const { showPopup, translationConfig } = useConsentManager();
		const textDirection = useTextDirection(translationConfig.defaultLanguage);
		const [isVisible, setIsVisible] = useState(false);
		const [hasAnimated, setHasAnimated] = useState(false);
		const [animationDurationMs, setAnimationDurationMs] = useState(200); // Default fallback for SSR

		// Get animation duration from CSS custom property (client-side only)
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
				// If showPopup is true but we haven't animated yet, trigger the animation
				if (hasAnimated) {
					setIsVisible(true);
				} else {
					// Small delay to ensure the component is mounted and ready for animation
					const animationTimer = setTimeout(() => {
						setIsVisible(true);
						setHasAnimated(true);
					}, 10);
					return () => clearTimeout(animationTimer);
				}
			} else {
				// Reset animation state when hiding so it can animate again next time
				setHasAnimated(false);

				if (disableAnimation) {
					setIsVisible(false);
				} else {
					const timer = setTimeout(() => {
						setIsVisible(false);
					}, animationDurationMs); // Match CSS animation duration
					return () => clearTimeout(timer);
				}
			}
		}, [showPopup, disableAnimation, hasAnimated, animationDurationMs]);

		// Apply styles from the CookieBanner context and merge with local styles.
		// Uses the 'content' style key for consistent theming.
		const contentStyle = useStyles('banner.root', {
			baseClassName: [
				styles.root,
				textDirection === 'ltr' ? styles.bottomLeft : styles.bottomRight,
			],
			style: style as CSSPropertiesWithVars<Record<string, never>>,
			className: className || forwardedClassName,
			noStyle,
		});

		// Track client-side mounting state to prevent SSR hydration issues
		// with the portal rendering
		const [isMounted, setIsMounted] = useState(false);

		// Initialize mounting state after initial render
		// This ensures we only render the portal on the client side
		useEffect(() => {
			setIsMounted(true);
		}, []);

		// Prevent rendering until client-side mount is complete
		if (!isMounted) {
			return null;
		}

		// Create a final class name that respects the noStyle flag
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
							dir={textDirection}
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
