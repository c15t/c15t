'use client';

import type * as C15tCoreTypes from '@c15t/core';
import styles from '@c15t/ui/styles/components/consent-banner.module.js';
import { sanitizeDOMStyleProps } from '@c15t/ui/utils';
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
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useIsHydrated } from '~/hooks/use-is-hydrated';
import { useStyles } from '~/hooks/use-styles';
import { useTextDirection } from '~/hooks/use-text-direction';
import type { CSSPropertiesWithVars } from '~/types/theme';

import { Overlay } from './overlay';

const DEFAULT_MODELS: C15tCoreTypes.Model[] = ['opt-in'];

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
	models?: C15tCoreTypes.Model[];

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
 *   <ConsentBanner.Card>
 *     <ConsentBanner.Header>
 *       <ConsentBanner.Title />
 *       <ConsentBanner.Description />
 *     </ConsentBanner.Header>
 *     <ConsentBanner.Footer>
 *       <ConsentBanner.CustomizeButton />
 *       <ConsentBanner.FooterSubGroup>
 *         <ConsentBanner.RejectButton />
 *         <ConsentBanner.AcceptButton />
 *       </ConsentBanner.FooterSubGroup>
 *     </ConsentBanner.Footer>
 *   </ConsentBanner.Card>
 * </ConsentBanner.Root>
 * ```
 *
 * @example
 * Preferred styling with provider theme tokens and slots:
 * ```tsx
 * <ConsentManagerProvider
 *   options={{
 *     theme: {
 *       colors: {
 *         surface: '#fffdf8',
 *         surfaceHover: '#f6f3ee',
 *       },
 *       slots: {
 *         consentBannerCard: 'rounded-3xl shadow-xl',
 *         consentBannerFooter: 'border-t border-black/10 px-6',
 *         consentBannerTitle: 'tracking-tight',
 *       },
 *     },
 *   }}
 * >
 *   <ConsentBanner.Root>
 *     <ConsentBanner.Card>
 *       <ConsentBanner.Header>
 *         <ConsentBanner.Title />
 *         <ConsentBanner.Description />
 *       </ConsentBanner.Header>
 *       <ConsentBanner.Footer>
 *         <ConsentBanner.CustomizeButton />
 *         <ConsentBanner.FooterSubGroup>
 *           <ConsentBanner.RejectButton />
 *           <ConsentBanner.AcceptButton />
 *         </ConsentBanner.FooterSubGroup>
 *       </ConsentBanner.Footer>
 *     </ConsentBanner.Card>
 *   </ConsentBanner.Root>
 * </ConsentManagerProvider>
 * ```
 *
 * @public
 */
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
const ConsentBannerRootChildren = createForwardRef<
	HTMLDivElement,
	ConsentBannerRootChildrenProps
>(
	(
		{
			asChild: _asChild,
			children,
			className,
			style,
			className: forwardedClassName,
			disableAnimation,
			noStyle,
			models = DEFAULT_MODELS,
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
		const isMounted = useIsHydrated();

		// ConsentBanner shows when activeUI is 'banner' and the current model matches
		const shouldShowBanner = activeUI === 'banner' && models.includes(model);

		// Handle animation visibility state
		useEffect(() => {
			if (shouldShowBanner) {
				// If banner is showing but we haven't animated yet, trigger the animation
				if (hasAnimated) {
					const frame = requestAnimationFrame(() => setIsVisible(true));
					return () => cancelAnimationFrame(frame);
				}
				// Small delay to ensure the component is mounted and ready for animation
				const animationTimer = setTimeout(() => {
					setIsVisible(true);
					setHasAnimated(true);
				}, 10);
				return () => clearTimeout(animationTimer);
			}
			// Reset animation state when hiding so it can animate again next time
			const frame = requestAnimationFrame(() => setHasAnimated(false));

			if (disableAnimation) {
				const visibilityFrame = requestAnimationFrame(() =>
					setIsVisible(false)
				);
				return () => {
					cancelAnimationFrame(frame);
					cancelAnimationFrame(visibilityFrame);
				};
			}

			const animationDurationMs = Number.parseInt(
				getComputedStyle(document.documentElement).getPropertyValue(
					'--consent-banner-animation-duration'
				) || '200',
				10
			);
			const timer = setTimeout(() => {
				setIsVisible(false);
				// Match CSS animation duration
			}, animationDurationMs);
			return () => {
				cancelAnimationFrame(frame);
				clearTimeout(timer);
			};
		}, [shouldShowBanner, disableAnimation, hasAnimated]);

		// Apply styles from the ConsentBanner context and merge with local styles.
		// Uses the 'content' style key for consistent theming.
		const contentStyle = useStyles('consentBanner', {
			baseClassName: [
				styles.root,
				textDirection === 'ltr' ? styles.bottomLeft : styles.bottomRight,
			],
			className: className || forwardedClassName,
			noStyle,
			style: style as CSSPropertiesWithVars<Record<string, never>>,
		});

		// Prevent rendering until client-side mount is complete
		if (!isMounted) {
			return null;
		}

		// Create a final class name that respects the noStyle flag
		const finalClassName = noStyle
			? contentStyle.className || ''
			: `${contentStyle.className || ''} ${isVisible ? styles.bannerVisible : styles.bannerHidden}`;
		const domStyleProps = sanitizeDOMStyleProps(contentStyle);

		// Only render when the banner should be shown
		return shouldShowBanner
			? createPortal(
					<>
						<Overlay />
						<div
							ref={ref}
							{...props}
							{...domStyleProps}
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
	const { policyBanner } = useConsentManager();

	/**
	 * Combine consent manager state with styling configuration
	 * to create the context value for child components
	 */
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
		() => ({ uiSource: uiSource ?? 'banner' }),
		[uiSource]
	);

	return (
		<ConsentTrackingContext.Provider value={trackingValue}>
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
interface ConsentBannerRootChildrenProps extends HTMLAttributes<HTMLDivElement> {
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
	models?: C15tCoreTypes.Model[];
}

ConsentBannerRootChildren.displayName = 'ConsentBannerRootChildren';

const Root = ConsentBannerRoot;

export { ConsentBannerRoot, Root };
