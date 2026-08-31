'use client';

import type * as C15tCoreTypes from '@c15t/core';
import styles from '@c15t/ui/styles/v3/consent-banner';
import { forwardRef, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FC, HTMLAttributes, ReactNode } from 'react';

import { ConsentTrackingContext } from '~/v3/context/consent-tracking-context';
import { LocalThemeContext } from '~/v3/context/theme-context';
import {
	useActiveUI,
	useTranslations as useKernelTranslations,
	useModel,
	usePolicyBanner,
} from '~/v3/hooks';
import { useTextDirection } from '~/v3/hooks/use-text-direction';
import type { CSSPropertiesWithVars } from '~/v3/types/theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { defaultTranslationConfig } from '~/v3/utils/default-translation-config';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

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
 * Preferred styling with provider theme tokens and components:
 * ```tsx
 * <ConsentManagerProvider
 *   options={{
 *     theme: {
 *       colors: {
 *         surface: '#fffdf8',
 *         surfaceHover: '#f6f3ee',
 *       },
 *     },
 *     components: {
 *       banner: {
 *         card: { className: 'rounded-3xl shadow-xl' },
 *         footer: { className: 'border-t border-black/10 px-6' },
 *         title: { className: 'tracking-tight' },
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
const ConsentBannerRootChildren = forwardRef<
	HTMLDivElement,
	ConsentBannerRootChildrenProps
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
>(function ConsentBannerRootChildren(
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
) {
	const activeUI = useActiveUI();
	const { components } = useUIConfig();
	const model = useModel() ?? 'opt-in';
	const translations = useKernelTranslations();
	const textDirection = useTextDirection(
		translations?.language ?? defaultTranslationConfig.defaultLanguage
	);
	const [isVisible, setIsVisible] = useState(false);
	const [hasAnimated, setHasAnimated] = useState(false);
	// Default fallback for SSR
	const [animationDurationMs, setAnimationDurationMs] = useState(200);

	// ConsentBanner shows when activeUI is 'banner' and the current model matches
	const shouldShowBanner = activeUI === 'banner' && models.includes(model);
	const [hasInitializedVisibility, setHasInitializedVisibility] =
		useState(false);

	// Get animation duration from CSS custom property (client-side only)
	useEffect(() => {
		const duration = Number.parseInt(
			getComputedStyle(document.documentElement).getPropertyValue(
				'--consent-banner-animation-duration'
			) || '200',
			10
		);
		const frame = requestAnimationFrame(() => {
			setAnimationDurationMs(duration);
		});
		return () => cancelAnimationFrame(frame);
	}, []);

	// Handle animation visibility state
	useEffect(() => {
		if (!hasInitializedVisibility) {
			const frame = requestAnimationFrame(() => {
				setHasInitializedVisibility(true);
				setIsVisible(shouldShowBanner);
				if (shouldShowBanner) {
					setHasAnimated(true);
				}
			});
			return () => cancelAnimationFrame(frame);
		}

		if (shouldShowBanner) {
			if (disableAnimation) {
				const frame = requestAnimationFrame(() => {
					setIsVisible(true);
					setHasAnimated(true);
				});
				return () => cancelAnimationFrame(frame);
			}
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
			// Match CSS animation duration
		}, animationDurationMs);
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(timer);
		};
	}, [
		shouldShowBanner,
		disableAnimation,
		hasAnimated,
		animationDurationMs,
		hasInitializedVisibility,
	]);

	const contentStyle = mergeSlotProps(components?.banner?.root, {
		baseClassName: styles.root,
		className: className || forwardedClassName,
		noStyle,
		style: style as CSSPropertiesWithVars<Record<string, never>>,
		...props,
	});

	// Create a final class name that respects the noStyle flag
	const finalClassName = noStyle
		? contentStyle.className || ''
		: `${contentStyle.className || ''} ${
				// oxlint-disable-next-line no-nested-ternary -- Branches mirror a closed three-state presentation matrix.
				disableAnimation
					? ''
					: isVisible
						? styles.bannerVisible
						: styles.bannerHidden
			}`;
	// Only render when the banner should be shown
	return shouldShowBanner ? (
		<>
			<Overlay />
			<div
				ref={ref}
				{...contentStyle}
				className={finalClassName}
				data-position={textDirection === 'ltr' ? 'bottom-left' : 'bottom-right'}
				data-testid="consent-banner-root"
				dir={textDirection}
			>
				{children}
			</div>
		</>
	) : null;
});
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
	const policyBanner = usePolicyBanner();

	/**
	 * Combine consent manager state with styling configuration
	 * to create the context value for child components
	 */
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
		() => ({ uiSource: uiSource ?? 'banner' }),
		[uiSource]
	);

	return (
		<ConsentTrackingContext.Provider value={trackingContextValue}>
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
