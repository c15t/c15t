'use client';

import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.css';
import { type FC, type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LocalThemeContext } from '~/context/theme-context';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useTextDirection } from '~/hooks/use-text-direction';
import { IABConsentDialogOverlay } from './overlay';

interface IABConsentDialogRootProps {
	children: ReactNode;
	/**
	 * Control the open state. If omitted, follows isPrivacyDialogOpen from context.
	 */
	open?: boolean;
	noStyle?: boolean;
	disableAnimation?: boolean;
	scrollLock?: boolean;
	trapFocus?: boolean;
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
	noStyle,
	disableAnimation,
	scrollLock = true,
	trapFocus = true,
}) => {
	const {
		isPrivacyDialogOpen,
		translationConfig,
		iab: iabState,
	} = useConsentManager();
	const textDirection = useTextDirection(translationConfig.defaultLanguage);

	const [isMounted, setIsMounted] = useState(false);
	const [isVisible, setIsVisible] = useState(false);

	const isOpen = open ?? isPrivacyDialogOpen;

	const contextValue = {
		disableAnimation,
		noStyle,
		scrollLock,
		trapFocus,
	};

	// Scroll lock
	useScrollLock(Boolean(isOpen && scrollLock));

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

	const dialogContent = (
		<LocalThemeContext.Provider value={contextValue}>
			<IABConsentDialogOverlay isOpen={isOpen} />
			<div
				className={`${styles.root} ${isVisible ? styles.dialogVisible : styles.dialogHidden}`}
				data-testid="iab-consent-dialog-root"
				dir={textDirection}
			>
				{children}
			</div>
		</LocalThemeContext.Provider>
	);

	return createPortal(dialogContent, document.body);
};

IABConsentDialogRoot.displayName = 'IABConsentDialogRoot';

export { IABConsentDialogRoot };
