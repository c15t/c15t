'use client';

/**
 * @packageDocumentation
 * Provides the dialog component for detailed privacy consent management.
 * Implements an accessible, animated modal interface for consent customization.
 */

import { type FC, type RefObject, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	LocalThemeContext,
	type ThemeContextValue,
} from '~/context/theme-context';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useTheme } from '~/hooks/use-theme';
import { ConsentCustomizationCard } from './atoms/dialog-card';
import { Overlay } from './atoms/overlay';
import type { ConsentManagerDialogTheme } from './theme';

import clsx from 'clsx';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import styles from './consent-manager-dialog.module.css';

/**
 * Props for the ConsentManagerDialog component
 *
 * @remarks
 * Extends ThemeContextValue to provide comprehensive theming support
 * while maintaining type safety for consent management specific features.
 */
export interface ConsentManagerDialogProps
	extends ThemeContextValue<ConsentManagerDialogTheme> {
	/** Disables animation when true */
	disableAnimation?: boolean;

	/** Whether the dialog is open */
	open?: boolean;
}

/**
 * A modal dialog component for detailed privacy consent management.
 *
 * @remarks
 * Key features:
 * - Provides an accessible modal interface for consent customization
 * - Implements smooth enter/exit animations
 * - Manages proper focus handling
 * - Supports theme customization
 * - Handles client-side portal rendering
 *
 * @example
 * ```tsx
 * <ConsentManagerDialog
 *   theme={customTheme}
 *   disableAnimation={false}
 *   noStyle={false}
 * />
 * ```
 *
 * @public
 */
export const ConsentManagerDialog: FC<ConsentManagerDialogProps> = ({
	theme: localTheme,
	disableAnimation: localDisableAnimation,
	noStyle: localNoStyle,
	open = false,
	scrollLock: localScrollLock = true,
	trapFocus: localTrapFocus = true, // Default to true for accessibility
}) => {
	const consentManager = useConsentManager();

	// Get global theme context and merge with local props
	const globalTheme = useTheme();

	// Merge global theme context with local props (local takes precedence)
	const mergedTheme = {
		...globalTheme.theme,
		...localTheme,
	};

	const theme = mergedTheme;
	const disableAnimation =
		localDisableAnimation ?? globalTheme.disableAnimation;
	const noStyle = localNoStyle ?? globalTheme.noStyle;
	const scrollLock = localScrollLock ?? globalTheme.scrollLock;
	const trapFocus = localTrapFocus ?? globalTheme.trapFocus;

	const [isMounted, setIsMounted] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);

	// Handle client-side mounting
	useEffect(() => {
		setIsMounted(true);
		return () => setIsMounted(false);
	}, []);

	// Handle animation visibility state
	useEffect(() => {
		if (open || consentManager.isPrivacyDialogOpen) {
			setIsVisible(true);
		} else if (disableAnimation) {
			setIsVisible(false);
		} else {
			const animationDurationMs = Number.parseInt(
				getComputedStyle(document.documentElement).getPropertyValue(
					'--dialog-animation-duration'
				) || '200',
				10
			);
			const timer = setTimeout(() => {
				setIsVisible(false);
			}, animationDurationMs); // Match CSS animation duration
			return () => clearTimeout(timer);
		}
	}, [open, consentManager.isPrivacyDialogOpen, disableAnimation]);

	// Add the useFocusTrap hook
	const isRefObject =
		dialogRef && typeof dialogRef === 'object' && 'current' in dialogRef;
	useFocusTrap(
		(open || consentManager.isPrivacyDialogOpen) && trapFocus,
		isRefObject ? (dialogRef as RefObject<HTMLElement>) : null
	);

	const contextValue: ThemeContextValue = {
		theme,
		noStyle,
		disableAnimation,
		scrollLock,
		trapFocus,
	};

	/**
	 * Dialog content with theme context and animation support
	 * @internal
	 */
	const dialogContentRoot = (
		<LocalThemeContext.Provider value={contextValue}>
			{(open || consentManager.isPrivacyDialogOpen) && (
				<>
					<Overlay open={open || consentManager.isPrivacyDialogOpen} />
					<dialog
						ref={dialogRef as unknown as RefObject<HTMLDialogElement>}
						className={clsx(
							styles.root,
							!disableAnimation &&
								(isVisible ? styles.dialogVisible : styles.dialogHidden)
						)}
						aria-labelledby="privacy-settings-title"
						tabIndex={-1} // Make the dialog focusable as a fallback
					>
						<div
							ref={contentRef}
							className={clsx(
								styles.container,
								!disableAnimation && isVisible
									? styles.contentVisible
									: styles.contentHidden
							)}
						>
							<ConsentCustomizationCard noStyle={noStyle} />
						</div>
					</dialog>
				</>
			)}
		</LocalThemeContext.Provider>
	);

	// Only render on client-side to prevent hydration issues
	return isMounted && createPortal(dialogContentRoot, document.body);
};
