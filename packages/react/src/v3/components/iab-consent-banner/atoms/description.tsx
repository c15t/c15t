'use client';

import styles from '@c15t/ui/styles/v3/iab-consent-banner';
import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

interface IABConsentBannerDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
	children: ReactNode;
}

/**
 * Description component for the IAB Consent Banner.
 *
 * @public
 */
const IABConsentBannerDescription = forwardRef<
	HTMLParagraphElement,
	IABConsentBannerDescriptionProps
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
>(function IABConsentBannerDescription({ children, className, ...props }, ref) {
	return (
		<p
			ref={ref}
			className={
				className ? `${styles.description} ${className}` : styles.description
			}
			{...props}
		>
			{children}
		</p>
	);
});

IABConsentBannerDescription.displayName = 'IABConsentBannerDescription';

export { IABConsentBannerDescription };
