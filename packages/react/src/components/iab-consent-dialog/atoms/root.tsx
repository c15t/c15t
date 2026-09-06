'use client';

import type * as C15tCoreTypes from '@c15t/core';
import { isDialogDismissKey } from '@c15t/ui/primitives/dialog';
import styles from '@c15t/ui/styles/components/iab-consent-dialog';
import { useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { ConsentTrackingContext } from '~/context/consent-tracking-context';
import { LocalThemeContext } from '~/context/theme-context';
import { useSetActiveUI } from '~/hooks';
import { useIABConsentManager } from '~/hooks/use-iab-consent-manager';
import { useIsHydrated } from '~/hooks/use-is-hydrated';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useTextDirection } from '~/hooks/use-text-direction';
import { useUIConfig } from '~/ui-config-context';
import { cnExt as cn } from '~/utils/cn';
import { mergeSlotProps } from '~/utils/merge-slot-props';

import { IABConsentDialogOverlay } from './overlay';

const DEFAULT_MODELS: C15tCoreTypes.Model[] = ['iab'];

interface IABConsentDialogRootProps {
	children: ReactNode;
	/**
	 * Control the open state. If omitted, follows activeUI === 'dialog' from context.
	 */
	open?: boolean;
	noStyle?: boolean;
	disableAnimation?: boolean;
	scrollLock?: boolean;
	trapFocus?: boolean;
	/**
	 * Which consent models this dialog responds to.
	 * @default ['iab']
	 */
	models?: C15tCoreTypes.Model[];
	/**
	 * Override the UI source identifier sent with consent API calls.
	 * @default 'iab_dialog'
	 */
	uiSource?: string;
}

/**
 * Root component for the IAB Consent Dialog.
 *
 * @remarks
 * Handles portal rendering, visibility animations, scroll lock, and overlay.
 *
 * @public
 */
const IABConsentDialogRoot: FC<IABConsentDialogRootProps> = ({
	children,
	open,
	models = DEFAULT_MODELS,
	noStyle,
	disableAnimation,
	scrollLock,
	trapFocus = true,
	uiSource,
}) => {
	const {
		activeUI,
		translationConfig,
		iab: iabState,
		policyDialog,
		model,
	} = useIABConsentManager();
	const setActiveUI = useSetActiveUI();
	const { components } = useUIConfig();
	const textDirection = useTextDirection(translationConfig.defaultLanguage);

	const isMounted = useIsHydrated();
	const [isVisible, setIsVisible] = useState(false);

	// IABConsentDialog only opens when the consent model matches
	const isOpen = models.includes(model) && (open ?? activeUI === 'dialog');
	const resolvedScrollLock = scrollLock ?? policyDialog.scrollLock ?? true;

	const contextValue = useMemo(
		() => ({
			disableAnimation,
			noStyle,
			scrollLock: resolvedScrollLock,
			trapFocus,
		}),
		[disableAnimation, noStyle, resolvedScrollLock, trapFocus]
	);

	// Scroll lock
	useScrollLock(Boolean(isOpen && resolvedScrollLock));

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (isDialogDismissKey(event.key)) {
				event.preventDefault();
				setActiveUI('none');
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, setActiveUI]);

	// Visibility animation
	useEffect(() => {
		if (isOpen) {
			const frame = requestAnimationFrame(() => setIsVisible(true));
			return () => cancelAnimationFrame(frame);
		}
		if (disableAnimation) {
			const frame = requestAnimationFrame(() => setIsVisible(false));
			return () => cancelAnimationFrame(frame);
		}
		const timer = setTimeout(() => {
			setIsVisible(false);
		}, 150);
		return () => clearTimeout(timer);
	}, [isOpen, disableAnimation]);

	const themedStyle = mergeSlotProps(components?.['iab-dialog']?.root, {
		baseClassName: cn(
			styles.root,
			// oxlint-disable-next-line no-nested-ternary -- Preserve established branch order and control flow.
			disableAnimation
				? undefined
				: isVisible
					? styles.dialogVisible
					: styles.dialogHidden
		),
	});
	const trackingContextValue = useMemo(
		() => ({ uiSource: uiSource ?? 'iab_dialog' }),
		[uiSource]
	);

	// Don't render if not mounted or IAB is disabled
	if (!isMounted || !iabState?.config.enabled) {
		return null;
	}

	if (!isOpen && !isVisible) {
		return null;
	}

	const dialogContent = (
		<ConsentTrackingContext.Provider value={trackingContextValue}>
			<LocalThemeContext.Provider value={contextValue}>
				<IABConsentDialogOverlay isOpen={isOpen} />
				<div
					{...themedStyle}
					data-testid="iab-consent-dialog-root"
					dir={textDirection}
				>
					{children}
				</div>
			</LocalThemeContext.Provider>
		</ConsentTrackingContext.Provider>
	);

	return createPortal(dialogContent, document.body);
};

IABConsentDialogRoot.displayName = 'IABConsentDialogRoot';

export { IABConsentDialogRoot };
