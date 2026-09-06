/**
 * @packageDocumentation
 * Provides the overlay backdrop component for the consent management interface.
 * Implements accessible modal behavior with animation support.
 */

import styles from '@c15t/ui/styles/components/consent-dialog';
import { useEffect, useState } from 'react';
import type { FC, PropsWithChildren } from 'react';

import { useConsentManager } from '~/component-hooks/use-consent-manager';
import { useTheme } from '~/hooks/use-theme';
import type { ThemeValue } from '~/types/theme';
import { useUIConfig } from '~/ui-config-context';
import { cnExt as cn } from '~/utils/cn';
import { mergeSlotProps } from '~/utils/merge-slot-props';

/**
 * Props for the Overlay component.
 *
 * @remarks
 * The overlay provides a semi-transparent backdrop behind the consent dialog.
 * It helps focus user attention on the privacy settings interface and prevents
 * interaction with the main content while the dialog is open.
 *
 * @public
 */

/**
 * Props for the Overlay component.
 *
 * @remarks
 * Extends {@link PropsWithChildren} so that the overlay can optionally wrap
 * its compound components (e.g. `ConsentDialog.Card`). This resolves
 * TypeScript errors when consumers nest elements inside
 * `<ConsentDialog.Root>`.
 */
export type OverlayProps = PropsWithChildren<{
	/**
	 * Custom styles to override default overlay styling.
	 *
	 * @remarks
	 * - Can be a string class name or an object with className and style properties
	 * - Styles are merged with theme styles and default styles
	 * - Useful for customizing overlay appearance while maintaining functionality
	 */
	style?: ThemeValue;

	/**
	 * Disables default styling when true.
	 *
	 * @remarks
	 * - When enabled, removes all default styles
	 * - Useful for implementing completely custom overlay styling
	 * - Maintains functionality without visual opinions
	 */
	noStyle?: boolean;

	/**
	 * Whether the dialog the overlay backs is open.
	 *
	 * `ConsentDialog.Root` passes its own open state, so a dialog opened
	 * through the `open` prop rather than the consent manager still fades
	 * its backdrop in. Falls back to the manager's active surface.
	 */
	open?: boolean;
}>;

const ConsentDialogOverlay: FC<OverlayProps> = ({ noStyle, open, style }) => {
	const { activeUI } = useConsentManager();
	const { components } = useUIConfig();
	const {
		disableAnimation,
		noStyle: isThemeNoStyle,
		scrollLock: _scrollLock = true,
	} = useTheme();

	const showDialog = open ?? activeUI === 'dialog';
	const [isVisible, setIsVisible] = useState(false);

	// Handle animation visibility state
	useEffect(() => {
		if (showDialog) {
			const frame = requestAnimationFrame(() => setIsVisible(true));
			return () => cancelAnimationFrame(frame);
		}

		if (disableAnimation) {
			const frame = requestAnimationFrame(() => setIsVisible(false));
			return () => cancelAnimationFrame(frame);
		}

		const animationDurationMs = Number.parseInt(
			getComputedStyle(document.documentElement).getPropertyValue(
				'--consent-dialog-animation-duration'
			) || '200',
			10
		);
		const timer = setTimeout(() => {
			setIsVisible(false);
			// Match CSS animation duration
		}, animationDurationMs);
		return () => clearTimeout(timer);
	}, [showDialog, disableAnimation]);

	// Get custom className from style prop
	const customClassName = typeof style === 'string' ? style : style?.className;

	const theme = mergeSlotProps(components?.dialog?.overlay, {
		baseClassName: styles.overlay,
		className: customClassName,
		noStyle: isThemeNoStyle || noStyle,
		style:
			typeof style === 'object' && 'style' in style ? style.style : undefined,
	});

	// Animations are handled with CSS classes
	const shouldApplyAnimation =
		!(isThemeNoStyle || noStyle) && !disableAnimation;

	// Use conditional assignment instead of nested ternaries
	let animationClass: string | undefined;
	if (shouldApplyAnimation) {
		animationClass = isVisible ? styles.overlayVisible : styles.overlayHidden;
	} else {
		animationClass = undefined;
	}

	// Combine theme className with animation class if needed
	const finalClassName = cn(theme.className, animationClass);

	return (
		<div
			{...theme}
			role="presentation"
			aria-hidden="true"
			className={finalClassName}
			data-testid="consent-dialog-overlay"
		/>
	);
};

const Overlay = ConsentDialogOverlay;

export { ConsentDialogOverlay, Overlay };
