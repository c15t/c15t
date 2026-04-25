'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner.module.js';
import { sanitizeDOMStyleProps } from '@c15t/ui/utils';
import {
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	type RefObject,
} from 'react';
import { useFocusTrap } from '~/hooks/use-focus-trap';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';

interface IABConsentBannerCardProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
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
>(({ children, className, ...props }, ref) => {
	const { trapFocus } = useTheme();

	useFocusTrap(Boolean(trapFocus), ref as RefObject<HTMLElement>);

	const themedStyle = useStyles('iabConsentBannerCard', {
		baseClassName: styles.card,
		className,
	});
	const domStyleProps = sanitizeDOMStyleProps(themedStyle);

	return (
		<div
			ref={ref}
			{...domStyleProps}
			tabIndex={0}
			role="dialog"
			aria-modal={trapFocus ? 'true' : undefined}
			data-testid="iab-consent-banner-card"
			{...props}
		>
			{children}
		</div>
	);
});

IABConsentBannerCard.displayName = 'IABConsentBannerCard';

export { IABConsentBannerCard };
