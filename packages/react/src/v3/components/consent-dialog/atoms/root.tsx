'use client';

/**
 * @packageDocumentation
 * Provides the root component for the Consent Dialog.
 * Implements context provider pattern with theme support, state management,
 * focus trapping, scroll locking and portal rendering.
 */

import { isDialogDismissKey } from '@c15t/ui/primitives/dialog';
import styles from '@c15t/ui/styles/v3/consent-dialog';
import type { FC, HTMLAttributes, ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useConsentManager } from '~/v3/component-hooks/use-consent-manager';
import { useHeadlessConsentUI } from '~/v3/component-hooks/use-headless-consent-ui';
import { ConsentTrackingContext } from '~/v3/context/consent-tracking-context';
import { LocalThemeContext } from '~/v3/context/theme-context';
import type { ThemeContextValue } from '~/v3/context/theme-context';
import { useFocusTrap } from '~/v3/hooks/use-focus-trap';
import { useScrollLock } from '~/v3/hooks/use-scroll-lock';
import { useTextDirection } from '~/v3/hooks/use-text-direction';
import { useTheme } from '~/v3/hooks/use-theme';
import type { CSSPropertiesWithVars } from '~/v3/types/theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { cnExt as cn } from '~/v3/utils/cn';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

import { Overlay } from './overlay';

/**
 * Props for the root component of the ConsentDialog.
 *
 * @public
 */
export interface ConsentDialogRootProps extends HTMLAttributes<HTMLDialogElement> {
	/**
	 * React children that will be rendered inside the dialog container.
	 * Typically this includes `ConsentDialog.Card` and its sub-components.
	 */
	children: ReactNode;

	/**
	 * Explicitly control the open state of the dialog. If omitted, the dialog
	 * relies on the consent manager (`activeUI === 'dialog'`) value.
	 */
	open?: boolean;

	/**
	 * Which consent models this dialog responds to.
	 * @default ['opt-in', 'opt-out']
	 */
	models?: import('@c15t/core').Model[];

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

	/**
	 * Override the UI source identifier sent with consent API calls.
	 * @default 'dialog'
	 */
	uiSource?: string;
}

/**
 * Provides theming context, focus-management and portal rendering for the
 * Consent Dialog. This component is also exposed as
 * `ConsentDialog.Root` to enable the compound-component usage:
 *
 * ```tsx
 * <ConsentDialog.Root>
 *   <ConsentDialog.Card>
 *     …
 *   </ConsentDialog.Card>
 * </ConsentDialog.Root>
 * ```
 */
const ConsentDialogRoot: FC<ConsentDialogRootProps> = ({
	children,
	open: openProp,
	models = ['opt-in', 'opt-out'],
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus = true,
	overlay,
	uiSource,
	className,
	style,
	...rest
}) => {
	// Global theme from provider (if any)
	const globalTheme = useTheme();
	const { components } = useUIConfig();

	const disableAnimation =
		localDisableAnimation ?? globalTheme.disableAnimation ?? false;
	const noStyle = localNoStyle ?? globalTheme.noStyle ?? false;

	// Consent manager state
	const { activeUI, translationConfig, model, policyDialog } =
		useConsentManager();
	const { closeUI } = useHeadlessConsentUI();
	const scrollLock = localScrollLock ?? policyDialog.scrollLock ?? true;
	const trapFocus = localTrapFocus ?? globalTheme.trapFocus ?? true;
	const textDirection = useTextDirection(translationConfig.defaultLanguage);

	// Final open state (controlled or managed by consent manager)
	const isOpen = models.includes(model) && (openProp ?? activeUI === 'dialog');

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

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (isDialogDismissKey(event.key)) {
				event.preventDefault();
				closeUI();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [closeUI, isOpen]);

	// Lock scroll when required
	useScrollLock(isOpen && scrollLock);

	const rootClasses = cn(
		styles.root,
		!disableAnimation &&
			(isVisible ? styles.dialogVisible : styles.dialogHidden)
	);

	const themedStyle = mergeSlotProps(components?.dialog?.root, {
		baseClassName: rootClasses,
		className,
		style: style as CSSPropertiesWithVars<Record<string, never>>,
		noStyle,
		...rest,
	});
	const containerStyle = mergeSlotProps(components?.dialog?.container, {
		baseClassName: cn(
			styles.container,
			!disableAnimation &&
				(isVisible ? styles.contentVisible : styles.contentHidden)
		),
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
		<ConsentTrackingContext.Provider value={{ uiSource: uiSource ?? 'dialog' }}>
			<LocalThemeContext.Provider value={contextValue}>
				{isOpen && (
					<>
						{/* Backdrop (customisable) */}
						{overlay === false ? null : (overlay ?? <Overlay />)}

						<dialog
							ref={dialogRef}
							{...themedStyle}
							className={themedStyle.className}
							aria-labelledby="consent-dialog-title"
							aria-modal={trapFocus ? 'true' : undefined}
							tabIndex={-1}
							dir={textDirection}
							data-testid="consent-dialog-root"
							open
						>
							<div
								ref={contentRef}
								{...containerStyle}
							>
								{children}
							</div>
						</dialog>
					</>
				)}
			</LocalThemeContext.Provider>
		</ConsentTrackingContext.Provider>
	);

	if (!isMounted) {
		return null;
	}

	return createPortal(dialogNode, document.body);
};

const Root = ConsentDialogRoot;

export { ConsentDialogRoot, Root };
