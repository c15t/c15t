'use client';

import styles from '@c15t/ui/styles/components/iab-consent-dialog';
import { forwardRef as createForwardRef, useEffect, useState } from 'react';
import type { HTMLAttributes, ReactNode, RefObject } from 'react';

import { useActiveUI } from '~/hooks';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { cnExt as cn } from '~/utils/cn';
import { mergeSlotProps } from '~/utils/merge-slot-props';

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
const IABConsentDialogCard = createForwardRef<
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
			const frame = requestAnimationFrame(() => setIsVisible(true));
			return () => cancelAnimationFrame(frame);
		}
		const timer = setTimeout(() => {
			setIsVisible(false);
		}, 150);
		return () => clearTimeout(timer);
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
		// A `div`, not a `dialog`: the user agent's dialog padding is 1em,
		// which the card sets for itself.
		<div
			ref={ref}
			{...themedStyle}
			aria-label={iabTranslations.preferenceCenter.title}
			aria-modal={trapFocus ? 'true' : undefined}
			// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- A native `dialog` brings the user agent's 1em padding, which the card sets for itself.
			role="dialog"
			tabIndex={-1}
		>
			{children}
		</div>
	);
});

IABConsentDialogCard.displayName = 'IABConsentDialogCard';

export { IABConsentDialogCard };
