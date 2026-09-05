'use client';

import type * as C15tCoreTypes from '@c15t/core';
/**
 * @packageDocumentation
 * Provides the root component for the Consent Dialog.
 * Implements context provider pattern with theme support, state management,
 * focus trapping, scroll locking and portal rendering.
 */
import { isDialogDismissKey } from '@c15t/ui/primitives/dialog';
import styles from '@c15t/ui/styles/components/consent-dialog';
import type { FC, HTMLAttributes, ReactNode, RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useConsentManager } from '~/component-hooks/use-consent-manager';
import { useHeadlessConsentUI } from '~/component-hooks/use-headless-consent-ui';
import { ConsentTrackingContext } from '~/context/consent-tracking-context';
import { LocalThemeContext } from '~/context/theme-context';
import type { ThemeContextValue } from '~/context/theme-context';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useIsHydrated } from '~/hooks/use-is-hydrated';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useTextDirection } from '~/hooks/use-text-direction';
import { useTheme } from '~/hooks/use-theme';
import type { CSSPropertiesWithVars } from '~/types/theme';
import { useUIConfig } from '~/ui-config-context';
import { cnExt as cn } from '~/utils/cn';
import { mergeSlotProps } from '~/utils/merge-slot-props';

import { Overlay } from './overlay';

const DEFAULT_MODELS: C15tCoreTypes.Model[] = ['opt-in', 'opt-out'];

const resolveDialogOptions = (
	localDisableAnimation: boolean | undefined,
	globalDisableAnimation: boolean | undefined,
	localNoStyle: boolean | undefined,
	globalNoStyle: boolean | undefined,
	localScrollLock: boolean | undefined,
	policyScrollLock: boolean | undefined,
	localTrapFocus: boolean | undefined,
	globalTrapFocus: boolean | undefined
) => ({
	disableAnimation: localDisableAnimation ?? globalDisableAnimation ?? false,
	noStyle: localNoStyle ?? globalNoStyle ?? false,
	scrollLock: localScrollLock ?? policyScrollLock ?? true,
	trapFocus: localTrapFocus ?? globalTrapFocus ?? true,
});

const resolveDialogOpen = (
	models: C15tCoreTypes.Model[],
	model: C15tCoreTypes.Model,
	open: boolean | undefined,
	activeUI: string
): boolean => {
	if (!models.includes(model)) {
		return false;
	}
	return open ?? activeUI === 'dialog';
};

const getRootClasses = (
	disableAnimation: boolean,
	isVisible: boolean
): string => {
	if (disableAnimation) {
		return styles.root;
	}
	return cn(
		styles.root,
		isVisible ? styles.dialogVisible : styles.dialogHidden
	);
};

/**
 * Props for the root component of the ConsentDialog.
 *
 * @public
 */
export interface ConsentDialogRootProps extends HTMLAttributes<HTMLDivElement> {
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
	models?: C15tCoreTypes.Model[];

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
	models = DEFAULT_MODELS,
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

	// Consent manager state
	const { activeUI, translationConfig, model, policyDialog } =
		useConsentManager();
	const { closeUI } = useHeadlessConsentUI();
	const { disableAnimation, noStyle, scrollLock, trapFocus } =
		resolveDialogOptions(
			localDisableAnimation,
			globalTheme.disableAnimation,
			localNoStyle,
			globalTheme.noStyle,
			localScrollLock,
			policyDialog.scrollLock,
			localTrapFocus,
			globalTheme.trapFocus
		);
	const textDirection = useTextDirection(translationConfig.defaultLanguage);

	// Final open state (controlled or managed by consent manager)
	const isOpen = resolveDialogOpen(models, model, openProp, activeUI);

	// Animation visibility flag – mirrors logic in original component
	const [isVisible, setIsVisible] = useState(false);

	// Refs used for focus trapping
	const dialogRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);

	// Handle mounting (avoid SSR mismatch when using portal)
	const isMounted = useIsHydrated();

	// Get animation duration from theme
	const animationDuration = globalTheme.theme?.motion?.duration?.normal;

	// Manage visibility with respect to animation
	useEffect(() => {
		if (isOpen) {
			const frame = requestAnimationFrame(() => setIsVisible(true));
			return () => cancelAnimationFrame(frame);
		}
		if (disableAnimation) {
			const frame = requestAnimationFrame(() => setIsVisible(false));
			return () => cancelAnimationFrame(frame);
		}
		// Get duration from theme tokens, falling back to 200ms
		const durationStr = animationDuration || '200ms';
		const duration = Number.parseInt(durationStr.replace('ms', ''), 10);

		const timer = setTimeout(() => setIsVisible(false), duration);
		return () => clearTimeout(timer);
	}, [isOpen, disableAnimation, animationDuration]);

	// Trap focus when dialog open
	useFocusTrap(isOpen && trapFocus, contentRef as RefObject<HTMLElement>);

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

	const rootClasses = getRootClasses(disableAnimation, isVisible);

	const themedStyle = mergeSlotProps(components?.dialog?.root, {
		baseClassName: rootClasses,
		className,
		noStyle,
		style: style as CSSPropertiesWithVars<Record<string, never>>,
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
	const contextValue = useMemo<ThemeContextValue>(
		() => ({
			disableAnimation,
			noStyle,
			scrollLock,
			theme: globalTheme.theme,
			trapFocus,
		}),
		[disableAnimation, globalTheme.theme, noStyle, scrollLock, trapFocus]
	);
	const trackingContextValue = useMemo(
		() => ({ uiSource: uiSource ?? 'dialog' }),
		[uiSource]
	);

	const dialogNode = (
		<ConsentTrackingContext.Provider value={trackingContextValue}>
			<LocalThemeContext.Provider value={contextValue}>
				{isOpen && (
					<>
						{/* Backdrop (customisable) */}
						{overlay === false ? null : (overlay ?? <Overlay open />)}

						{/* The outer element only positions the panel over
						    the viewport. The panel wrapper below is the
						    dialog: it carries the semantics, the focus trap
						    and the `consent-dialog-root` testid, so those
						    name the same element in every adapter. */}
						<div
							ref={dialogRef}
							{...themedStyle}
							className={themedStyle.className}
						>
							<div
								ref={contentRef}
								{...containerStyle}
								aria-describedby="consent-dialog-description"
								aria-labelledby="consent-dialog-title"
								aria-modal={trapFocus ? 'true' : undefined}
								data-testid="consent-dialog-root"
								dir={textDirection}
								role="dialog"
								tabIndex={-1}
							>
								{children}
							</div>
						</div>
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
