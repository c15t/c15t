'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner';
import { forwardRef as createForwardRef } from 'react';
import type { HTMLAttributes, ReactNode, RefObject } from 'react';

import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

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
const IABConsentBannerCard = createForwardRef<
	HTMLDivElement,
	IABConsentBannerCardProps
>(({ children, className, 'data-testid': dataTestId, ...props }, ref) => {
	const { noStyle, trapFocus } = useTheme();
	const { components } = useUIConfig();

	useFocusTrap(Boolean(trapFocus), ref as RefObject<HTMLElement>);

	const themedStyle = mergeSlotProps(components?.['iab-banner']?.card, {
		baseClassName: styles.card,
		className,
		'data-testid': dataTestId ?? 'iab-consent-banner-card',
		noStyle,
		...props,
	});

	return (
		// A `div`, not a `dialog`: the user agent's dialog padding is 1em,
		// which the card sets for itself.
		<div
			ref={ref}
			{...themedStyle}
			aria-modal={trapFocus ? 'true' : undefined}
			role={trapFocus ? 'dialog' : undefined}
		>
			{children}
		</div>
	);
});

IABConsentBannerCard.displayName = 'IABConsentBannerCard';

export { IABConsentBannerCard };
