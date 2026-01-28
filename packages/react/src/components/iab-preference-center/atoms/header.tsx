'use client';

import styles from '@c15t/ui/styles/components/iab-preference-center.module.css';
import { forwardRef, type ReactNode } from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useIABTranslations } from '../use-iab-translations';

interface IABPreferenceCenterHeaderProps {
	children?: ReactNode;
	/**
	 * Custom title. If not provided, uses translation.
	 */
	headerTitle?: ReactNode;
	/**
	 * Custom description. If not provided, uses translation.
	 */
	description?: ReactNode;
	/**
	 * Whether to show the close button.
	 * @default true
	 */
	showCloseButton?: boolean;
	/**
	 * Additional class name.
	 */
	className?: string;
}

/**
 * Header component for the IAB Preference Center.
 *
 * @remarks
 * Contains title, description, and close button.
 *
 * @public
 */
const IABPreferenceCenterHeader = forwardRef<
	HTMLDivElement,
	IABPreferenceCenterHeaderProps
>(
	(
		{ children, headerTitle, description, showCloseButton = true, className },
		ref
	) => {
		const { setIsPrivacyDialogOpen } = useConsentManager();
		const iabTranslations = useIABTranslations();

		const handleClose = () => {
			setIsPrivacyDialogOpen(false);
		};

		const headerClassName = className
			? `${styles.header} ${className}`
			: styles.header;

		return (
			<div ref={ref} className={headerClassName}>
				{children ? (
					children
				) : (
					<>
						<div className={styles.headerContent}>
							<h2 className={styles.title}>
								{headerTitle ?? iabTranslations.preferenceCenter.title}
							</h2>
							<p className={styles.description}>
								{description ?? iabTranslations.preferenceCenter.description}
							</p>
						</div>
						{showCloseButton && (
							<button
								type="button"
								onClick={handleClose}
								className={styles.closeButton}
								aria-label="Close"
							>
								<svg
									style={{ width: '1rem', height: '1rem' }}
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						)}
					</>
				)}
			</div>
		);
	}
);

IABPreferenceCenterHeader.displayName = 'IABPreferenceCenterHeader';

export { IABPreferenceCenterHeader };
