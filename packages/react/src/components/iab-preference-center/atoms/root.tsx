'use client';

import styles from '@c15t/ui/styles/components/iab-preference-center.module.css';
import { type FC, type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LocalThemeContext } from '~/context/theme-context';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useScrollLock } from '~/hooks/use-scroll-lock';
import { useTextDirection } from '~/hooks/use-text-direction';
import { IABPreferenceCenterOverlay } from './overlay';

interface IABPreferenceCenterRootProps {
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
 * Root component for the IAB Preference Center.
 *
 * @remarks
 * Handles portal rendering, visibility animations, scroll lock, and overlay.
 *
 * @public
 */
const IABPreferenceCenterRoot: FC<IABPreferenceCenterRootProps> = ({
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
			<IABPreferenceCenterOverlay isOpen={isOpen} />
			<div
				className={`${styles.root} ${isVisible ? styles.dialogVisible : styles.dialogHidden}`}
				data-testid="iab-preference-center-root"
				dir={textDirection}
			>
				{children}
			</div>
		</LocalThemeContext.Provider>
	);

	return createPortal(dialogContent, document.body);
};

IABPreferenceCenterRoot.displayName = 'IABPreferenceCenterRoot';

export { IABPreferenceCenterRoot };
