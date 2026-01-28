'use client';

import styles from '@c15t/ui/styles/components/iab-banner.module.css';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

interface IABBannerTitleProps extends HTMLAttributes<HTMLHeadingElement> {
	children: ReactNode;
}

/**
 * Title component for the IAB Banner.
 *
 * @public
 */
const IABBannerTitle = forwardRef<HTMLHeadingElement, IABBannerTitleProps>(
	({ children, className, ...props }, ref) => {
		return (
			<h2
				ref={ref}
				className={className ? `${styles.title} ${className}` : styles.title}
				{...props}
			>
				{children}
			</h2>
		);
	}
);

IABBannerTitle.displayName = 'IABBannerTitle';

export { IABBannerTitle };
