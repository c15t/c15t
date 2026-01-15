'use client';

/**
 * @packageDocumentation
 * Provides the root component for the Consent Manager Dialog.
 * Implements context provider pattern with theme support, state management,
 * focus trapping, scroll locking and portal rendering.
 */

import styles from '@c15t/ui/styles/components/consent-manager-dialog.module.css';
import type { FC, HTMLAttributes, ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	LocalThemeContext,
	type ThemeContextValue,
} from '~/context/theme-context';
import { useTextDirection } from '~/hooks';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import type { CSSPropertiesWithVars } from '~/types/theme';
import { cnExt as cn } from '~/utils/cn';
import { Overlay } from './overlay';

/**
 * Props for the root component of the ConsentManagerDialog.
 *
 * @public
 */
export interface ConsentManagerDialogRootProps
	extends HTMLAttributes<HTMLDialogElement> {
	/**
	 * React children that will be rendered inside the dialog container.
	 * Typically this includes `ConsentManagerDialog.Card` and its sub-components.
	 */
	children: ReactNode;

	/**
	 * Explicitly control the open state of the dialog. If omitted, the dialog
	 * relies on the consent manager (`isPrivacyDialogOpen`) value.
	 */
	open?: boolean;

	/**
	 * When true, the component will not apply any internal styles.
	 */
	noStyle?: boolean;

	/**
	 * Disable entrance / exit animations when true.
	 */
	disableAnimation?: boolean;

	/**
	 * Lock body scroll while the dialog is open. Defaults to `true`.
	 */
	scrollLock?: boolean;

	/**
	 * Trap focus within the dialog while it is open. Defaults to `true`.
	 */
	trapFocus?: boolean;

	/**
	 * Custom backdrop element. Pass a React node to replace the built-in
	 * semi-transparent overlay or pass `false` to render no backdrop at all.
	 *
	 * @default undefined (builtin overlay)
	 */
	overlay?: ReactNode | false;
}

/**
 * Provides theming context, focus-management and portal rendering for the
 * Consent Manager Dialog. This component is also exposed as
 * `ConsentManagerDialog.Root` to enable the compound-component usage:
 *
 * ```tsx
 * <ConsentManagerDialog.Root>
 *   <ConsentManagerDialog.Card>
 *     …
 *   </ConsentManagerDialog.Card>
 * </ConsentManagerDialog.Root>
 * ```
 */
const ConsentManagerDialogRoot: FC<ConsentManagerDialogRootProps> = ({
	children,
	open: openProp,
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock = true,
	trapFocus: localTrapFocus = true,
	overlay,
	className,
	style,
	...rest
}) => {
	// Global theme from provider (if any)
	const globalTheme = useTheme();

	const disableAnimation =
		localDisableAnimation ?? globalTheme.disableAnimation ?? false;
	const noStyle = localNoStyle ?? globalTheme.noStyle ?? false;
	const scrollLock = localScrollLock ?? globalTheme.scrollLock ?? true;
	const trapFocus = localTrapFocus ?? globalTheme.trapFocus ?? true;

	// Consent manager state
	const { isPrivacyDialogOpen, translationConfig } = useConsentManager();
	const textDirection = useTextDirection(translationConfig.defaultLanguage);

	// Final open state (controlled or managed by consent manager)
	const isOpen = openProp ?? isPrivacyDialogOpen;

	// Animation visibility flag – mirrors logic in original component
	const [isVisible, setIsVisible] = useState(false);

	// Refs used for focus trapping
	const dialogRef = useRef<HTMLDialogElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);

	// Handle mounting (avoid SSR mismatch when using portal)
	const [isMounted, setIsMounted] = useState(false);
	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Get animation duration from theme
	const animationDuration = globalTheme.theme?.motion?.duration?.normal;

	// Manage visibility with respect to animation
	useEffect(() => {
		if (isOpen) {
			setIsVisible(true);
		} else if (disableAnimation) {
			setIsVisible(false);
		} else {
			// Get duration from theme tokens, falling back to 200ms
			const durationStr = animationDuration || '200ms';
			const duration = Number.parseInt(durationStr.replace('ms', ''), 10);

			const timer = setTimeout(() => setIsVisible(false), duration);
			return () => clearTimeout(timer);
		}
	}, [isOpen, disableAnimation, animationDuration]);

	// Trap focus when dialog open
	useFocusTrap(isOpen && trapFocus, dialogRef as RefObject<HTMLElement>);

	// Lock scroll when required
	useScrollLock(isOpen && scrollLock);

	// Compose class names
	const rootClasses = cn(
		styles.root,
		!disableAnimation &&
			(isVisible ? styles.dialogVisible : styles.dialogHidden),
		className
	);

	// Styles (using theme util)
	const themedStyle = useStyles('dialog', {
		baseClassName: undefined,
		className: rootClasses,
		style: style as CSSPropertiesWithVars<Record<string, never>>,
		noStyle,
	});

	const contextValue: ThemeContextValue = {
		disableAnimation,
		noStyle,
		scrollLock,
		trapFocus,
		theme: globalTheme.theme,
	};

	const dialogNode = (
		<LocalThemeContext.Provider value={contextValue}>
			{isOpen && (
				<>
					{/* Backdrop (customisable) */}
					{overlay === false ? null : (overlay ?? <Overlay />)}

					<dialog
						ref={dialogRef}
						{...rest}
						{...themedStyle}
						className={themedStyle.className}
						aria-labelledby="privacy-settings-title"
						tabIndex={-1}
						dir={textDirection}
						data-testid="consent-manager-dialog-root"
						open
					>
						<div
							ref={contentRef}
							className={
								noStyle
									? undefined
									: cn(
											styles.container,
											!disableAnimation && isVisible
												? styles.contentVisible
												: styles.contentHidden
										)
							}
						>
							{children}
						</div>
					</dialog>
				</>
			)}
		</LocalThemeContext.Provider>
	);

	if (!isMounted) {
		return null;
	}

	return createPortal(dialogNode, document.body);
};

const Root = ConsentManagerDialogRoot;

export { Root, ConsentManagerDialogRoot };
