'use client';

import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.css';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

interface IABConsentDialogContentProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

/**
 * Content container component for the IAB Consent Dialog.
 *
 * @remarks
 * Scrollable area containing purpose/vendor content.
 *
 * @public
 */
const IABConsentDialogContent = forwardRef<
	HTMLDivElement,
	IABConsentDialogContentProps
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

IABConsentDialogContent.displayName = 'IABConsentDialogContent';

export { IABConsentDialogContent };
