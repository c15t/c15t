'use client';

import styles from '@c15t/ui/styles/components/iab-preference-center.module.css';
import {
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	type RefObject,
	useEffect,
	useState,
} from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useTheme } from '~/hooks/use-theme';
import { useIABTranslations } from '../use-iab-translations';

interface IABPreferenceCenterCardProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

/**
 * Card component for the IAB Preference Center.
 *
 * @remarks
 * Main container for the preference center content. Handles focus trap when trapFocus is enabled.
 *
 * @public
 */
const IABPreferenceCenterCard = forwardRef<
	HTMLDivElement,
	IABPreferenceCenterCardProps
>(({ children, className, ...props }, ref) => {
	const { trapFocus } = useTheme();
	const { isPrivacyDialogOpen } = useConsentManager();
	const iabTranslations = useIABTranslations();
	const [isVisible, setIsVisible] = useState(false);

	useFocusTrap(
		Boolean(isPrivacyDialogOpen && trapFocus),
		ref as RefObject<HTMLElement>
	);

	useEffect(() => {
		if (isPrivacyDialogOpen) {
			setIsVisible(true);
		} else {
			const timer = setTimeout(() => {
				setIsVisible(false);
			}, 150);
			return () => clearTimeout(timer);
		}
	}, [isPrivacyDialogOpen]);

	const cardClassName = className
		? `${styles.card} ${isVisible ? styles.contentVisible : styles.contentHidden} ${className}`
		: `${styles.card} ${isVisible ? styles.contentVisible : styles.contentHidden}`;

	return (
		<div
			ref={ref}
			className={cardClassName}
			role="dialog"
			aria-modal={trapFocus ? 'true' : undefined}
			aria-label={iabTranslations.preferenceCenter.title}
			tabIndex={0}
			data-testid="iab-preference-center-card"
			{...props}
		>
			{children}
		</div>
	);
});

IABPreferenceCenterCard.displayName = 'IABPreferenceCenterCard';

export { IABPreferenceCenterCard };
