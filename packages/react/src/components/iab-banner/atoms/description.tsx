'use client';

import styles from '@c15t/ui/styles/components/iab-banner.module.css';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

interface IABBannerDescriptionProps
	extends HTMLAttributes<HTMLParagraphElement> {
	children: ReactNode;
}

/**
 * Description component for the IAB Banner.
 *
 * @public
 */
const IABBannerDescription = forwardRef<
	HTMLParagraphElement,
	IABBannerDescriptionProps
>(({ children, className, ...props }, ref) => {
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

IABBannerDescription.displayName = 'IABBannerDescription';

export { IABBannerDescription };
