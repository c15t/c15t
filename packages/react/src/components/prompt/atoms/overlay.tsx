/**
 * @packageDocumentation
 * Provides the overlay backdrop component for the ConsentBanner.
 */

import styles from '@c15t/ui/styles/components/consent-banner';
import { forwardRef as createForwardRef, isValidElement } from 'react';
import type { HTMLAttributes } from 'react';

import { Slot } from '~/components/shared/libs/slot';
import { useActiveUI } from '~/hooks';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { cnExt as cn } from '~/utils/cn';
import { mergeSlotProps } from '~/utils/merge-slot-props';

/**
 * Props for the Overlay component.
 *
 * @remarks
 * The overlay provides a semi-transparent backdrop behind the consent banner content.
 * It can be styled using the ConsentBanner theme system or through direct style props.
 *
 * @public
 */
interface OverlayProps extends HTMLAttributes<HTMLDivElement> {
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
}

/**
 * Overlay component that provides a backdrop for the ConsentBanner content.
 *
 * @remarks
 * This component handles:
 * - Rendering a semi-transparent backdrop
 * - Fade in/out animations (when animations are enabled)
 * - Proper z-indexing for modal behavior
 * - Theme-based styling
 *
 * The overlay visibility is controlled by the `activeUI` state from ConsentBanner context,
 * and its animation behavior is controlled by the `disableAnimation` flag.
 *
 * @public
 */
const ConsentBannerOverlay = createForwardRef<HTMLDivElement, OverlayProps>(
	({ className, style, noStyle, asChild, children, ...props }, ref) => {
		const activeUI = useActiveUI();
		const {
			disableAnimation,
			noStyle: contextNoStyle,
			scrollLock,
		} = useTheme();
		const { components } = useUIConfig();

		const showBanner = activeUI === 'banner';
		const theme = mergeSlotProps(components?.banner?.overlay, {
			baseClassName: styles.overlay,
			// Always pass custom className
			className,
			noStyle: contextNoStyle || noStyle,
			style,
			...props,
		});

		// Animations are handled with CSS classes
		const shouldApplyAnimation =
			!(contextNoStyle || noStyle) && !disableAnimation;

		// The overlay shows on its first frame; `overlayEntering` marks the
		// mount and carries no entry animation.
		const animationClass = shouldApplyAnimation
			? `${styles.overlayVisible} ${styles.overlayEntering}`
			: undefined;

		// Combine theme className with animation class if needed
		const finalClassName = cn(theme.className, animationClass);

		useScrollLock(!!(showBanner && scrollLock));

		if (!(showBanner && scrollLock)) {
			return null;
		}
		const overlayProps = {
			...theme,
			'aria-hidden': true,
			className: finalClassName,
			'data-testid': 'consent-banner-overlay',
		};
		return asChild && isValidElement(children) ? (
			<Slot
				ref={ref}
				{...overlayProps}
			>
				{children}
			</Slot>
		) : (
			<div
				ref={ref}
				{...overlayProps}
			>
				{children}
			</div>
		);
	}
);

ConsentBannerOverlay.displayName = 'ConsentBannerOverlay';

const Overlay = ConsentBannerOverlay;

export { ConsentBannerOverlay, Overlay };
