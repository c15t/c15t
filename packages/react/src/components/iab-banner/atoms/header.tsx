'use client';

import styles from '@c15t/ui/styles/components/iab-banner.module.css';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

interface IABBannerHeaderProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

/**
 * Header component for the IAB Banner.
 *
 * @remarks
 * Container for title, description, purpose list, and legitimate interest notice.
 *
 * @public
 */
const IABBannerHeader = forwardRef<HTMLDivElement, IABBannerHeaderProps>(
	({ children, className, ...props }, ref) => {
		const headerClassName = className
			? `${styles.header} ${className}`
			: styles.header;

		return (
			<div
				ref={ref}
				className={headerClassName}
				data-testid="iab-banner-header"
				{...props}
			>
				{children}
			</div>
		);
	}
);

IABBannerHeader.displayName = 'IABBannerHeader';

export { IABBannerHeader };
