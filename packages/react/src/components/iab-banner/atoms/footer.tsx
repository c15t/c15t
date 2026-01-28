'use client';

import styles from '@c15t/ui/styles/components/iab-banner.module.css';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

interface IABBannerFooterProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

/**
 * Footer component for the IAB Banner.
 *
 * @remarks
 * Container for action buttons (Accept, Reject, Customize).
 *
 * @public
 */
const IABBannerFooter = forwardRef<HTMLDivElement, IABBannerFooterProps>(
	({ children, className, ...props }, ref) => {
		const footerClassName = className
			? `${styles.footer} ${className}`
			: styles.footer;

		return (
			<div
				ref={ref}
				className={footerClassName}
				data-testid="iab-banner-footer"
				{...props}
			>
				{children}
			</div>
		);
	}
);

IABBannerFooter.displayName = 'IABBannerFooter';

export { IABBannerFooter };
