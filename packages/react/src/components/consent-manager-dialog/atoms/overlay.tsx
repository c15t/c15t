/**
 * @packageDocumentation
 * Provides the overlay backdrop component for the consent management interface.
 * Implements accessible modal behavior with animation support.
 */

import { AnimatePresence, motion } from 'motion/react';
import type { FC } from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useTheme } from '~/hooks/use-theme';
import type { ThemeValue } from '~/types/theme';
import { useStyles } from '~/hooks/use-styles';
import styles from '../consent-manager-dialog.module.css';

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
interface OverlayProps {
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
	 * Opens the overlay when true.
	 *
	 * @remarks
	 * - Useful for testing purposes
	 */
	open?: boolean;
}

/**
 * Overlay component that provides a backdrop for the consent management interface.
 *
 * @remarks
 * Key features:
 * - Renders a semi-transparent backdrop
 * - Implements fade in/out animations (when enabled)
 * - Manages proper z-indexing for modal behavior
 * - Supports theme-based styling
 * - Automatically handles visibility based on dialog state
 *
 * @example
 * ```tsx
 * <ConsentManager>
 *   <Overlay />
 *   <DialogCard>
 *     // Dialog content
 *   </DialogCard>
 * </ConsentManager>
 * ```
 *
 * @public
 */
const ConsentManagerDialogOverlay: FC<OverlayProps> = ({
	noStyle,
	open = false,
}) => {
	const { isPrivacyDialogOpen } = useConsentManager();
	const {
		disableAnimation,
		noStyle: isThemeNoStyle,
		scrollLock = true,
	} = useTheme();

	const theme = useStyles('dialog.overlay', {
		baseClassName: styles.overlay,
		noStyle: isThemeNoStyle || noStyle,
	});

	const shouldLockScroll = !!(open || isPrivacyDialogOpen) && scrollLock;

	useScrollLock(shouldLockScroll);

	return shouldLockScroll ? (
		disableAnimation ? (
			<div {...theme} data-testid="consent-manager-dialog-overlay" />
		) : (
			<AnimatePresence>
				<motion.div
					{...theme}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					data-testid="consent-manager-dialog-overlay"
				/>
			</AnimatePresence>
		)
	) : null;
};

const Overlay = ConsentManagerDialogOverlay;

export { Overlay, ConsentManagerDialogOverlay };
