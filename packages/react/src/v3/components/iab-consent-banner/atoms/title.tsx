'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner.module.js';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

interface IABConsentBannerTitleProps
	extends HTMLAttributes<HTMLHeadingElement> {
	children: ReactNode;
}

/**
 * Title component for the IAB Consent Banner.
 *
 * @public
 */
const IABConsentBannerTitle = forwardRef<
	HTMLHeadingElement,
	IABConsentBannerTitleProps
>(({ children, className, ...props }, ref) => {
	return (
		<h2
			ref={ref}
			className={className ? `${styles.title} ${className}` : styles.title}
			{...props}
		>
			{children}
		</h2>
	);
});

IABConsentBannerTitle.displayName = 'IABConsentBannerTitle';

export { IABConsentBannerTitle };
