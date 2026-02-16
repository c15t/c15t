'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner.module.js';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { useStyles } from '~/hooks/use-styles';

interface IABConsentBannerFooterProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

/**
 * Footer component for the IAB Consent Banner.
 *
 * @remarks
 * Container for action buttons (Accept, Reject, Customize).
 *
 * @public
 */
const IABConsentBannerFooter = forwardRef<
	HTMLDivElement,
	IABConsentBannerFooterProps
>(({ children, className, ...props }, ref) => {
	const themedStyle = useStyles('iabConsentBannerFooter', {
		baseClassName: styles.footer,
		className,
	});

	return (
		<div
			ref={ref}
			{...themedStyle}
			data-testid="iab-consent-banner-footer"
			{...props}
		>
			{children}
		</div>
	);
});

IABConsentBannerFooter.displayName = 'IABConsentBannerFooter';

export { IABConsentBannerFooter };
