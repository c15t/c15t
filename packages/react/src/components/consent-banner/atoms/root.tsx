'use client';

import type * as C15tCoreTypes from '@c15t/core';
import type { PromptPosition, PromptVariant } from '@c15t/core';
import styles from '@c15t/ui/styles/components/consent-banner';
import {
	forwardRef as createForwardRef,
	useEffect,
	useMemo,
	useState,
} from 'react';
import type { CSSProperties, FC, HTMLAttributes, ReactNode } from 'react';

import { useHeadlessConsentUI } from '~/component-hooks/use-headless-consent-ui';
import { ConsentTrackingContext } from '~/context/consent-tracking-context';
import { LocalThemeContext } from '~/context/theme-context';
import {
	useActiveUI,
	useHasConsentPolicy,
	useTranslations as useKernelTranslations,
	useModel,
	usePolicyRule,
} from '~/hooks';
import { useTextDirection } from '~/hooks/use-text-direction';
import type { CSSPropertiesWithVars } from '~/types/theme';
import { useUIConfig } from '~/ui-config-context';
import { defaultTranslationConfig } from '~/utils/default-translation-config';
import { mergeSlotProps } from '~/utils/merge-slot-props';

import {
	ConsentBannerSurfaceContext,
	mirrorDefaultPosition,
	useConsentBannerSurface,
} from '../surface-context';
import type { ConsentBannerSurface } from '../surface-context';
import { Overlay } from './overlay';

const DEFAULT_MODELS: C15tCoreTypes.Model[] = ['opt-in', 'opt-out'];

const getBannerAnimationClass = (
	disableAnimation: boolean | undefined,
	isVisible: boolean
): string => {
	if (disableAnimation) {
		return '';
	}
	return isVisible ? styles.bannerVisible : styles.bannerHidden;
};

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

	/**
	 * Shape of the prompt. Overrides `presentation.prompt.variant`.
	 * @remarks A notice defaults to `bar`; a choice prompt defaults to `floating`.
	 */
	variant?: PromptVariant;

	/**
	 * Placement of the prompt. Overrides `presentation.prompt.position`.
	 * @remarks Must be valid for the resolved variant; otherwise the variant
	 * default is used and a development diagnostic is logged. Host-chosen
	 * positions are never mirrored for right-to-left text.
	 */
	position?: PromptPosition;

	/**
	 * Backdrop, scroll lock, focus trap and no outside dismissal, as one value.
	 * Overrides `presentation.prompt.blocking`.
	 * @remarks `wall` is always blocking; a notice never is.
	 */
	blocking?: boolean;
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
 * <ConsentProvider
 *   options={{
 *     mode: hosted({ url: '/api/c15t' }),
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
 * </ConsentProvider>
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
		const activeUI = useActiveUI();
		const { components } = useUIConfig();
		const hasPolicy = useHasConsentPolicy();
		const model = useModel() ?? 'opt-in';
		const policy = usePolicyRule();
		const surface = useConsentBannerSurface();
		const translations = useKernelTranslations();
		const textDirection = useTextDirection(
			translations?.language ?? defaultTranslationConfig.defaultLanguage
		);
		const renderedPosition = mirrorDefaultPosition(
			surface.position,
			surface.positionSource,
			surface.variant,
			textDirection
		);
		// ConsentBanner shows when a policy is resolved, activeUI is 'banner'
		// and the current model matches. Without a policy nothing renders.
		const shouldShowBanner =
			hasPolicy && activeUI === 'banner' && models.includes(model);
		const [isVisible, setIsVisible] = useState(shouldShowBanner);
		const [hasAnimated, setHasAnimated] = useState(shouldShowBanner);
		// Default fallback for SSR
		const [animationDurationMs, setAnimationDurationMs] = useState(200);
		const [hasInitializedVisibility, setHasInitializedVisibility] =
			useState(true);

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
			: `${contentStyle.className || ''} ${getBannerAnimationClass(
					disableAnimation,
					isVisible
				)}`;
		// Only render when the banner should be shown
		return shouldShowBanner ? (
			<>
				<Overlay />
				<div
					ref={ref}
					{...contentStyle}
					className={finalClassName}
					data-variant={surface.variant}
					data-position={renderedPosition}
					data-blocking={surface.blocking ? 'true' : undefined}
					data-prompt={policy.prompt}
					data-model={policy.model}
					data-testid="consent-banner-root"
					dir={textDirection}
				>
					{children}
				</div>
			</>
		) : null;
	}
);
const ConsentBannerRoot: FC<ConsentBannerRootProps> = ({
	children,
	className,
	noStyle,
	disableAnimation,
	scrollLock,
	trapFocus,
	models,
	uiSource,
	variant,
	position,
	blocking,
	...props
}) => {
	const { banner } = useHeadlessConsentUI({
		prompt: { blocking, position, scrollLock, trapFocus, variant },
	});
	const resolvedScrollLock = banner.scrollLock;
	const resolvedTrapFocus = banner.trapFocus;
	const contextValue = useMemo(
		() => ({
			disableAnimation,
			noStyle,
			scrollLock: resolvedScrollLock,
			trapFocus: resolvedTrapFocus,
		}),
		[disableAnimation, noStyle, resolvedScrollLock, resolvedTrapFocus]
	);
	const surfaceValue = useMemo<ConsentBannerSurface>(
		() => ({
			blocking: banner.blocking,
			position: banner.position,
			positionSource: banner.positionSource,
			variant: banner.variant,
		}),
		[banner.blocking, banner.position, banner.positionSource, banner.variant]
	);
	const trackingContextValue = useMemo(
		() => ({ uiSource: uiSource ?? 'banner' }),
		[uiSource]
	);

	return (
		<ConsentTrackingContext.Provider value={trackingContextValue}>
			<LocalThemeContext.Provider value={contextValue}>
				<ConsentBannerSurfaceContext.Provider value={surfaceValue}>
					<ConsentBannerRootChildren
						disableAnimation={disableAnimation}
						className={className}
						noStyle={noStyle}
						models={models}
						{...props}
					>
						{children}
					</ConsentBannerRootChildren>
				</ConsentBannerSurfaceContext.Provider>
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
