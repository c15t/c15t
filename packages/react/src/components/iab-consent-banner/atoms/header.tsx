'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner.module.js';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

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
	const headerClassName = className
		? `${styles.header} ${className}`
		: styles.header;

	return (
		<div
			ref={ref}
			className={headerClassName}
			data-testid="iab-consent-banner-header"
			{...props}
		>
			{children}
		</div>
	);
});

IABConsentBannerHeader.displayName = 'IABConsentBannerHeader';

export { IABConsentBannerHeader };
