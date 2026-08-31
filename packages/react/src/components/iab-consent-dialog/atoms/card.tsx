'use client';

import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
import { sanitizeDOMStyleProps } from '@c15t/ui/utils';
import { forwardRef as createForwardRef, useEffect, useState } from 'react';
import type { DialogHTMLAttributes, ReactNode, RefObject } from 'react';

import { useConsentManager } from '~/hooks/use-consent-manager';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import { cnExt as cn } from '~/utils/cn';

import { useIABTranslations } from '../use-iab-translations';

interface IABConsentDialogCardProps extends DialogHTMLAttributes<HTMLDialogElement> {
	children: ReactNode;
}

/**
 * Card component for the IAB Consent Dialog.
 *
 * @remarks
 * Main container for the consent dialog content. Handles focus trap when trapFocus is enabled.
 *
 * @public
 */
const IABConsentDialogCard = createForwardRef<
	HTMLDialogElement,
	IABConsentDialogCardProps
>(({ children, className, ...props }, ref) => {
	const { trapFocus } = useTheme();
	const { activeUI } = useConsentManager();
	const iabTranslations = useIABTranslations();
	const [isVisible, setIsVisible] = useState(false);
	const showDialog = activeUI === 'dialog';

	useFocusTrap(Boolean(showDialog && trapFocus), ref as RefObject<HTMLElement>);

	useEffect(() => {
		if (showDialog) {
			const frame = requestAnimationFrame(() => setIsVisible(true));
			return () => cancelAnimationFrame(frame);
		}
		const timer = setTimeout(() => {
			setIsVisible(false);
		}, 150);
		return () => clearTimeout(timer);
	}, [showDialog]);

	const themedStyle = useStyles('iabConsentDialogCard', {
		baseClassName: cn(
			styles.card,
			isVisible ? styles.contentVisible : styles.contentHidden
		),
		className,
	});
	const domStyleProps = sanitizeDOMStyleProps(themedStyle);

	return (
		<dialog
			ref={ref}
			{...domStyleProps}
			open
			aria-modal={trapFocus ? 'true' : undefined}
			aria-label={iabTranslations.preferenceCenter.title}
			tabIndex={-1}
			data-testid="iab-consent-dialog-card"
			{...props}
		>
			{children}
		</dialog>
	);
});

IABConsentDialogCard.displayName = 'IABConsentDialogCard';

export { IABConsentDialogCard };
