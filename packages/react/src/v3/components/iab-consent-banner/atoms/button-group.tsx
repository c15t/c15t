'use client';

import actionStyles from '@c15t/ui/styles/v3/consent-actions';
import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

interface IABConsentBannerButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
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
>(function ({ children, className, ...props }, ref) {
	return (
		<div
			ref={ref}
			className={
				className
					? `${actionStyles.actionGroup} ${className}`
					: actionStyles.actionGroup
			}
			data-direction="row"
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
>(function ({ className, ...props }, ref) {
	return (
		<div
			ref={ref}
			className={className}
			{...props}
		/>
	);
});

IABConsentBannerFooterSpacer.displayName = 'IABConsentBannerFooterSpacer';

export { IABConsentBannerButtonGroup, IABConsentBannerFooterSpacer };
