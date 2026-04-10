'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner.module.js';
import { sanitizeDOMStyleProps } from '@c15t/ui/utils';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { useStyles } from '~/hooks/use-styles';

interface IABConsentBannerHeaderProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

/**
 * Header component for the IAB Consent Banner.
 *
 * @remarks
 * Container for title, description, purpose list, and legitimate interest notice.
 *
 * @public
 */
const IABConsentBannerHeader = forwardRef<
	HTMLDivElement,
	IABConsentBannerHeaderProps
>(({ children, className, ...props }, ref) => {
	const themedStyle = useStyles('iabConsentBannerHeader', {
		baseClassName: styles.header,
		className,
	});
	const domStyleProps = sanitizeDOMStyleProps(themedStyle);

	return (
		<div
			ref={ref}
			{...domStyleProps}
			data-testid="iab-consent-banner-header"
			{...props}
		>
			{children}
		</div>
	);
});

IABConsentBannerHeader.displayName = 'IABConsentBannerHeader';

export { IABConsentBannerHeader };
