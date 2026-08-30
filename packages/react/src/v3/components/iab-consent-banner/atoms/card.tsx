'use client';

import styles from '@c15t/ui/styles/v3/iab-consent-banner';
import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode, RefObject } from 'react';

import { useFocusTrap } from '~/v3/hooks/use-focus-trap';
import { useTheme } from '~/v3/hooks/use-theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

interface IABConsentBannerCardProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	'data-testid'?: string;
}

/**
 * Card component for the IAB Consent Banner.
 *
 * @remarks
 * Main container for the banner content. Handles focus trap when trapFocus is enabled.
 *
 * @public
 */
const IABConsentBannerCard = forwardRef<
	HTMLDivElement,
	IABConsentBannerCardProps
>(({ children, className, 'data-testid': dataTestId, ...props }, ref) => {
	const { noStyle, trapFocus } = useTheme();
	const { components } = useUIConfig();

	useFocusTrap(Boolean(trapFocus), ref as RefObject<HTMLElement>);

	const themedStyle = mergeSlotProps(components?.['iab-banner']?.card, {
		baseClassName: styles.card,
		className,
		noStyle,
		'data-testid': dataTestId ?? 'iab-consent-banner-card',
		...props,
	});

	return (
		<div
			ref={ref}
			{...themedStyle}
			tabIndex={-1}
			role="dialog"
			aria-modal={trapFocus ? 'true' : undefined}
		>
			{children}
		</div>
	);
});

IABConsentBannerCard.displayName = 'IABConsentBannerCard';

export { IABConsentBannerCard };
