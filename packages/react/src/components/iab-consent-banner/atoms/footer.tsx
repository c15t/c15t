'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner.module.js';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

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
	const footerClassName = className
		? `${styles.footer} ${className}`
		: styles.footer;

	return (
		<div
			ref={ref}
			className={footerClassName}
			data-testid="iab-consent-banner-footer"
			{...props}
		>
			{children}
		</div>
	);
});

IABConsentBannerFooter.displayName = 'IABConsentBannerFooter';

export { IABConsentBannerFooter };
