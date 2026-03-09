'use client';

import styles from '@c15t/ui/styles/components/consent-banner.module.js';
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
import { ConsentTrackingContext } from '~/context/consent-tracking-context';
import { LocalThemeContext } from '~/context/theme-context';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useStyles } from '~/hooks/use-styles';
import { useTextDirection } from '~/hooks/use-text-direction';
import type { CSSPropertiesWithVars } from '~/types/theme';
import { Overlay } from './overlay';

/**
 * Props for the root component of the ConsentBanner.
 *
 * @remarks
 * The root component serves as the top-level container and context provider
 * for the consent banner. It manages the consent state and styling configuration
 * for all child components.
 *
 * @public
 */
interface ConsentBannerRootProps extends HTMLAttributes<HTMLDivElement> {
	/**
	 * @remarks
	 * React elements to be rendered within the consent banner.
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
	 * When true, disables the entrance/exit animations.
	 * Useful for environments where animations are not desired.
	 */
	disableAnimation?: boolean;

	/**
	 * @remarks
	 * When true, the consent banner will lock the scroll of the page.
	 * Useful for implementing a consent banner that locks the scroll of the page.
	 * @default false
	 */
	scrollLock?: boolean;

	/**
	 * @remarks
	 * When true, the consent banner will trap focus.
	 * Useful for implementing a consent banner that traps focus.
	 * @default true
	 */
	trapFocus?: boolean;

	/**
	 * Which consent models this banner responds to.
	 * @default ['opt-in', 'opt-out']
	 */
	models?: import('c15t').Model[];

	/**
	 * Override the UI source identifier sent with consent API calls.
	 * @default 'banner'
	 */
	uiSource?: string;
}

/**
 * Root component of the ConsentBanner that provides context and styling.
 *
 * @remarks
 * This component:
 * - Provides the ConsentBanner context to all child components
 * - Manages consent state through the consent manager
 * - Handles style distribution to child components
 * - Serves as the main container for the banner
 *
 * @example
 * Basic usage:
 * ```tsx
 * <ConsentBanner.Root>
 *   <ConsentBanner.Content>
 *     {Banner content}
 *   </ConsentBanner.Content>
 * </ConsentBanner.Root>
 * ```
 *
 * @example
 * With custom styling:
 * ```tsx
 * <ConsentBanner.Root
 *   styles={{
 *     root: "fixed bottom-0 w-full bg-white ",
 *     content: "max-w-4xl mx-auto p-4",
 *     title: "text-xl font-bold",
 *     description: "mt-2 text-gray-600"
 *   }}
 * >
 *   { Banner content}
 * </ConsentBanner.Root>
 * ```
 *
 * @public
 */
const ConsentBannerRoot: FC<ConsentBannerRootProps> = ({
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
	const { policyBannerScrollLock } = useConsentManager();

	/**
	 * Combine consent manager state with styling configuration
	 * to create the context value for child components
	 */
	const contextValue = {
		disableAnimation,
		noStyle,
		scrollLock: scrollLock ?? policyBannerScrollLock ?? undefined,
		trapFocus,
	};

	return (
		<ConsentTrackingContext.Provider value={{ uiSource: uiSource ?? 'banner' }}>
			<LocalThemeContext.Provider value={contextValue}>
				<ConsentBannerRootChildren
					disableAnimation={disableAnimation}
					className={className}
					noStyle={noStyle}
					models={models}
					{...props}
				>
					{children}
				</ConsentBannerRootChildren>
			</LocalThemeContext.Provider>
		</ConsentTrackingContext.Provider>
	);
};

/**
 * Props for the content section of the ConsentBanner.
 *
 * @public
 */
interface ConsentBannerRootChildrenProps
	extends HTMLAttributes<HTMLDivElement> {
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

	/**
	 * Which consent models this banner responds to.
	 * @default ['opt-in', 'opt-out']
	 */
	models?: import('c15t').Model[];
}

/**
 * Content component for the ConsentBanner that handles layout and animations.
 *
 * @remarks
 * This component manages the main content area of the consent banner, including:
 * - Client-side portal rendering to ensure proper stacking context
 * - Optional entrance/exit animations (controlled via ConsentBanner.Root)
 * - Conditional rendering based on banner visibility state
 * - Style composition through the ConsentBanner context
 *
 * @example
 * Basic usage with default styling and animations:
 * ```tsx
 * <ConsentBannerRootChildren>
 *   <ConsentBanner.Title>Privacy Notice</ConsentBanner.Title>
 *   <ConsentBanner.Description>
 *     We use cookies to improve your experience
 *   </ConsentBanner.Description>
 *   <ConsentBanner.Actions>
 *     <ConsentBanner.RejectButton>Decline</ConsentBanner.RejectButton>
 *     <ConsentBanner.AcceptButton>Accept</ConsentBanner.AcceptButton>
 *   </ConsentBanner.Actions>
 * </ConsentBannerRootChildren>
 * ```
 *
 * @example
 * Using asChild for custom wrapper:
 * ```tsx
 * <ConsentBannerRootChildren asChild>
 *   <Card className="my-custom-card">
 *     {Content}
 *   </Card>
 * </ConsentBannerRootChildren>
 * ```
 *
 * @public
 */
const ConsentBannerRootChildren = forwardRef<
	HTMLDivElement,
	ConsentBannerRootChildrenProps
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
			models = ['opt-in'],
			...props
		}: ConsentBannerRootChildrenProps & {
			style?: CSSProperties;
			className?: string;
		},
		ref
	) => {
		const { activeUI, translationConfig, model } = useConsentManager();
		const textDirection = useTextDirection(translationConfig.defaultLanguage);
		const [isVisible, setIsVisible] = useState(false);
		const [hasAnimated, setHasAnimated] = useState(false);
		const [animationDurationMs, setAnimationDurationMs] = useState(200); // Default fallback for SSR

		// ConsentBanner shows when activeUI is 'banner' and the current model matches
		const shouldShowBanner = activeUI === 'banner' && models.includes(model);

		// Get animation duration from CSS custom property (client-side only)
		useEffect(() => {
			const duration = Number.parseInt(
				getComputedStyle(document.documentElement).getPropertyValue(
					'--consent-banner-animation-duration'
				) || '200',
				10
			);
			setAnimationDurationMs(duration);
		}, []);

		// Handle animation visibility state
		useEffect(() => {
			if (shouldShowBanner) {
				// If banner is showing but we haven't animated yet, trigger the animation
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
		}, [shouldShowBanner, disableAnimation, hasAnimated, animationDurationMs]);

		// Apply styles from the ConsentBanner context and merge with local styles.
		// Uses the 'content' style key for consistent theming.
		const contentStyle = useStyles('consentBanner', {
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
		return shouldShowBanner
			? createPortal(
					<>
						<Overlay />
						<div
							ref={ref}
							{...props}
							{...contentStyle}
							className={finalClassName}
							data-testid="consent-banner-root"
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

ConsentBannerRootChildren.displayName = 'ConsentBannerRootChildren';

const Root = ConsentBannerRoot;

export { Root, ConsentBannerRoot };
