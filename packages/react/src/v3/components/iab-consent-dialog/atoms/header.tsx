'use client';

import styles from '@c15t/ui/styles/v3/iab-consent-dialog';
import { forwardRef as createForwardRef } from 'react';
import type { ReactNode } from 'react';

import { useTranslations } from '~/v3/component-hooks/use-translations';
import { useSetActiveUI } from '~/v3/hooks';
import { useUIConfig } from '~/v3/ui-config-context';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

import { useIABTranslations } from '../use-iab-translations';

interface IABConsentDialogHeaderProps {
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
 * Header component for the IAB Consent Dialog.
 *
 * @remarks
 * Contains title, description, and close button.
 *
 * @public
 */
const IABConsentDialogHeader = createForwardRef<
	HTMLDivElement,
	IABConsentDialogHeaderProps
>(
	(
		{ children, headerTitle, description, showCloseButton = true, className },
		ref
	) => {
		const setActiveUI = useSetActiveUI();
		const { components } = useUIConfig();
		const iabTranslations = useIABTranslations();
		const { common } = useTranslations();

		const handleClose = () => {
			setActiveUI('none');
		};

		const themedStyle = mergeSlotProps(components?.['iab-dialog']?.header, {
			baseClassName: styles.header,
			className,
		});

		return (
			<div
				ref={ref}
				{...themedStyle}
			>
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
								aria-label={common.close}
							>
								<svg
									style={{ height: '1rem', width: '1rem' }}
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<line
										x1="18"
										y1="6"
										x2="6"
										y2="18"
									/>
									<line
										x1="6"
										y1="6"
										x2="18"
										y2="18"
									/>
								</svg>
							</button>
						)}
					</>
				)}
			</div>
		);
	}
);

IABConsentDialogHeader.displayName = 'IABConsentDialogHeader';

export { IABConsentDialogHeader };
