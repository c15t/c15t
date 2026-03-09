'use client';

import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
import { type FC, type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConsentTrackingContext } from '~/context/consent-tracking-context';
import { LocalThemeContext } from '~/context/theme-context';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useStyles } from '~/hooks/use-styles';
import { useTextDirection } from '~/hooks/use-text-direction';
import { cnExt as cn } from '~/utils/cn';
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
	models?: import('c15t').Model[];
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
		policyDialogScrollLock,
		model,
	} = useConsentManager();
	const textDirection = useTextDirection(translationConfig.defaultLanguage);

	const [isMounted, setIsMounted] = useState(false);
	const [isVisible, setIsVisible] = useState(false);

	// IABConsentDialog only opens when the consent model matches
	const isOpen = models.includes(model) && (open ?? activeUI === 'dialog');
	const resolvedScrollLock = scrollLock ?? policyDialogScrollLock ?? true;

	const contextValue = {
		disableAnimation,
		noStyle,
		scrollLock: resolvedScrollLock,
		trapFocus,
	};

	// Scroll lock
	useScrollLock(Boolean(isOpen && resolvedScrollLock));

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

	// Don't render if not mounted or IAB is disabled
	if (!isMounted || !iabState?.config.enabled) {
		return null;
	}

	if (!isOpen && !isVisible) {
		return null;
	}

	const themedStyle = useStyles('iabConsentDialog', {
		baseClassName: cn(
			styles.root,
			disableAnimation
				? undefined
				: isVisible
					? styles.dialogVisible
					: styles.dialogHidden
		),
	});

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
