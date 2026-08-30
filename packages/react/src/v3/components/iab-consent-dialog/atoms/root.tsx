import type * as C15tCoreTypes from '@c15t/core';
('use client');

import { isDialogDismissKey } from '@c15t/ui/primitives/dialog';
import styles from '@c15t/ui/styles/v3/iab-consent-dialog';
import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { ConsentTrackingContext } from '~/v3/context/consent-tracking-context';
import { LocalThemeContext } from '~/v3/context/theme-context';
import { useSetActiveUI } from '~/v3/hooks';
import { useIABConsentManager } from '~/v3/hooks/use-iab-consent-manager';
import { useScrollLock } from '~/v3/hooks/use-scroll-lock';
import { useTextDirection } from '~/v3/hooks/use-text-direction';
import { useUIConfig } from '~/v3/ui-config-context';
import { cnExt as cn } from '~/v3/utils/cn';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

import { IABConsentDialogOverlay } from './overlay';

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
	models = ['iab'],
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

	const [isMounted, setIsMounted] = useState(false);
	const [isVisible, setIsVisible] = useState(false);

	// IABConsentDialog only opens when the consent model matches
	const isOpen = models.includes(model) && (open ?? activeUI === 'dialog');
	const resolvedScrollLock = scrollLock ?? policyDialog.scrollLock ?? true;

	const contextValue = {
		disableAnimation,
		noStyle,
		scrollLock: resolvedScrollLock,
		trapFocus,
	};

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

	// Mount state for portal
	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Visibility animation
	useEffect(() => {
		if (isOpen) {
			setIsVisible(true);
		} else if (disableAnimation) {
			setIsVisible(false);
		} else {
			const timer = setTimeout(() => {
				setIsVisible(false);
			}, 150);
			return () => clearTimeout(timer);
		}
	}, [isOpen, disableAnimation]);

	const themedStyle = mergeSlotProps(components?.['iab-dialog']?.root, {
		baseClassName: cn(
			styles.root,
			disableAnimation
				? undefined
				: isVisible
					? styles.dialogVisible
					: styles.dialogHidden
		),
	});
	// Don't render if not mounted or IAB is disabled
	if (!isMounted || !iabState?.config.enabled) {
		return null;
	}

	if (!isOpen && !isVisible) {
		return null;
	}

	const dialogContent = (
		<ConsentTrackingContext.Provider
			value={{ uiSource: uiSource ?? 'iab_dialog' }}
		>
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
