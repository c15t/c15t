'use client';

import styles from '@c15t/ui/styles/components/iab-preference-center.module.css';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

interface IABPreferenceCenterContentProps
	extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

/**
 * Content container component for the IAB Preference Center.
 *
 * @remarks
 * Scrollable area containing purpose/vendor content.
 *
 * @public
 */
const IABPreferenceCenterContent = forwardRef<
	HTMLDivElement,
	IABPreferenceCenterContentProps
>(({ children, className, ...props }, ref) => {
	const contentClassName = className
		? `${styles.content} ${className}`
		: styles.content;

	return (
		<div ref={ref} className={contentClassName} {...props}>
			{children}
		</div>
	);
});

IABPreferenceCenterContent.displayName = 'IABPreferenceCenterContent';

export { IABPreferenceCenterContent };
