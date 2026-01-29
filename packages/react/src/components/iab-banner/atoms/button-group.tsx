'use client';

import styles from '@c15t/ui/styles/components/iab-banner.module.css';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

interface IABBannerButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

/**
 * Button group component for the IAB Banner footer.
 *
 * @remarks
 * Groups related buttons together (e.g., Reject and Accept).
 *
 * @public
 */
const IABBannerButtonGroup = forwardRef<
	HTMLDivElement,
	IABBannerButtonGroupProps
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

IABBannerButtonGroup.displayName = 'IABBannerButtonGroup';

/**
 * Spacer component for the IAB Banner footer.
 *
 * @public
 */
const IABBannerFooterSpacer = forwardRef<
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

IABBannerFooterSpacer.displayName = 'IABBannerFooterSpacer';

export { IABBannerButtonGroup, IABBannerFooterSpacer };
