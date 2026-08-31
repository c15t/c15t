'use client';

import styles from '@c15t/ui/styles/v3/iab-consent-banner';
import { forwardRef as createForwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

interface IABConsentBannerDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
	children: ReactNode;
}

/**
 * Description component for the IAB Consent Banner.
 *
 * @public
 */
const IABConsentBannerDescription = createForwardRef<
	HTMLParagraphElement,
	IABConsentBannerDescriptionProps
>(({ children, className, ...props }, ref) => (
	<p
		ref={ref}
		className={
			className ? `${styles.description} ${className}` : styles.description
		}
		{...props}
	>
		{children}
	</p>
));

IABConsentBannerDescription.displayName = 'IABConsentBannerDescription';

export { IABConsentBannerDescription };
