'use client';

import { AnimatePresence, motion } from 'motion/react';
import {
	type CSSProperties,
	type FC,
	type HTMLAttributes,
	type ReactNode,
	forwardRef,
	useEffect,
	useState,
} from 'react';
import { createPortal } from 'react-dom';

import { ThemeContext, useStyles } from '../../theme';
import { Overlay } from './overlay';

import { useConsentManager } from '../../common';
import { createThemeContextValue } from '../../common/utils/theme';
import type { CookieBannerTheme } from '../theme';

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
	...props
}) => {
	/** Access the consent manager for handling cookie preferences */
	const consentManager = useConsentManager();

	/**
	 * Combine consent manager state with styling configuration
	 * to create the context value for child components
	 */
	const contextValue = {
		disableAnimation,
		noStyle,
		theme,
	};

	const mergedContextValue = createThemeContextValue(
		consentManager,
		contextValue
	);

	return (
		<ThemeContext.Provider value={mergedContextValue}>
			<CookieBannerRootChildren
				disableAnimation={disableAnimation}
				className={className}
				{...props}
			>
				{children}
			</CookieBannerRootChildren>
		</ThemeContext.Provider>
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
			...props
		}: CookieBannerRootChildrenProps & {
			style?: CSSProperties;
			className?: string;
		},
		ref
	) => {
		const { showPopup } = useConsentManager();

		/**
		 * Apply styles from the CookieBanner context and merge with local styles.
		 * Uses the 'content' style key for consistent theming.
		 */
		const contentStyle = useStyles('cookie-banner.root', {
			baseClassName: [
				'c15t-cookie-banner c15t-cookie-banner-root c15t-cookie-banner-root-bottom-left',
			],
			style,
			className: className || forwardedClassName,
		});

		/**
		 * Track client-side mounting state to prevent SSR hydration issues
		 * with the portal rendering
		 */
		const [isMounted, setIsMounted] = useState(false);

		/**
		 * Initialize mounting state after initial render
		 * This ensures we only render the portal on the client side
		 */
		useEffect(() => {
			setIsMounted(true);
		}, []);

		// Prevent rendering until client-side mount is complete
		if (!isMounted) {
			return null;
		}

		// Only render when the banner should be shown
		return showPopup
			? createPortal(
					<>
						<Overlay />
						{disableAnimation ? (
							<div
								ref={ref}
								{...props}
								{...contentStyle}
								data-testid="cookie-banner-root"
							>
								{children}
							</div>
						) : (
							<AnimatePresence>
								<motion.div
									ref={ref}
									initial={{ opacity: 0, y: 50 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 50 }}
									transition={{ type: 'spring', stiffness: 300, damping: 30 }}
									{...contentStyle}
									data-testid="cookie-banner-root"
								>
									{children}
								</motion.div>
							</AnimatePresence>
						)}
					</>,
					document.body
				)
			: null;
	}
);

CookieBannerRootChildren.displayName = 'CookieBannerRootChildren';

const Root = CookieBannerRoot;

export { Root, CookieBannerRoot };
