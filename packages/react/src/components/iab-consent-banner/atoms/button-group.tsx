'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner.module.js';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

interface IABConsentBannerButtonGroupProps
	extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

/**
 * Button group component for the IAB Consent Banner footer.
 *
 * @remarks
 * Groups related buttons together (e.g., Reject and Accept).
 *
 * @public
 */
const IABConsentBannerButtonGroup = forwardRef<
	HTMLDivElement,
	IABConsentBannerButtonGroupProps
>(({ children, className, ...props }, ref) => {
	return (
		<div
			ref={ref}
			className={
				className
					? `${styles.footerButtonGroup} ${className}`
					: styles.footerButtonGroup
			}
			{...props}
		>
			{children}
		</div>
	);
});

IABConsentBannerButtonGroup.displayName = 'IABConsentBannerButtonGroup';

/**
 * Spacer component for the IAB Consent Banner footer.
 *
 * @public
 */
const IABConsentBannerFooterSpacer = forwardRef<
	HTMLDivElement,
	HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
	return (
		<div
			ref={ref}
			className={
				className ? `${styles.footerSpacer} ${className}` : styles.footerSpacer
			}
			{...props}
		/>
	);
});

IABConsentBannerFooterSpacer.displayName = 'IABConsentBannerFooterSpacer';

export { IABConsentBannerButtonGroup, IABConsentBannerFooterSpacer };
