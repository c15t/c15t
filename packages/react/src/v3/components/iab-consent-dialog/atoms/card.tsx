'use client';

import styles from '@c15t/ui/styles/v3/iab-consent-dialog';
import {
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	type RefObject,
	useEffect,
	useState,
} from 'react';

import { useActiveUI } from '~/v3/hooks';
import { useFocusTrap } from '~/v3/hooks/use-focus-trap';
import { useTheme } from '~/v3/hooks/use-theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { cnExt as cn } from '~/v3/utils/cn';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

import { useIABTranslations } from '../use-iab-translations';

interface IABConsentDialogCardProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	'data-testid'?: string;
}

/**
 * Card component for the IAB Consent Dialog.
 *
 * @remarks
 * Main container for the consent dialog content. Handles focus trap when trapFocus is enabled.
 *
 * @public
 */
const IABConsentDialogCard = forwardRef<
	HTMLDivElement,
	IABConsentDialogCardProps
>(({ children, className, 'data-testid': dataTestId, ...props }, ref) => {
	const { trapFocus } = useTheme();
	const { components } = useUIConfig();
	const activeUI = useActiveUI();
	const iabTranslations = useIABTranslations();
	const [isVisible, setIsVisible] = useState(false);
	const showDialog = activeUI === 'dialog';

	useFocusTrap(Boolean(showDialog && trapFocus), ref as RefObject<HTMLElement>);

	useEffect(() => {
		if (showDialog) {
			setIsVisible(true);
		} else {
			const timer = setTimeout(() => {
				setIsVisible(false);
			}, 150);
			return () => clearTimeout(timer);
		}
	}, [showDialog]);

	const themedStyle = mergeSlotProps(components?.['iab-dialog']?.card, {
		baseClassName: cn(
			styles.card,
			isVisible ? styles.contentVisible : styles.contentHidden
		),
		className,
		'data-testid': dataTestId ?? 'iab-consent-dialog-card',
		...props,
	});

	return (
		<div
			ref={ref}
			{...themedStyle}
			role="dialog"
			aria-modal={trapFocus ? 'true' : undefined}
			aria-label={iabTranslations.preferenceCenter.title}
			tabIndex={-1}
		>
			{children}
		</div>
	);
});

IABConsentDialogCard.displayName = 'IABConsentDialogCard';

export { IABConsentDialogCard };
