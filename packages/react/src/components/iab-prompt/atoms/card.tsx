'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner';
import { useCallback, useRef, forwardRef as createForwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

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
	const cardRef = useRef<HTMLDivElement>(null);
	const setCardRef = useCallback(
		(node: HTMLDivElement | null) => {
			cardRef.current = node;
			if (typeof ref === 'function') {
				return ref(node);
			}
			if (ref) {
				ref.current = node;
			}
		},
		[ref]
	);

	useFocusTrap(Boolean(trapFocus), cardRef);

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
			ref={setCardRef}
			{...themedStyle}
			aria-modal={trapFocus ? 'true' : undefined}
			role={trapFocus ? 'dialog' : 'region'}
		>
			{children}
		</div>
	);
});

IABConsentBannerCard.displayName = 'IABConsentBannerCard';

export { IABConsentBannerCard };
