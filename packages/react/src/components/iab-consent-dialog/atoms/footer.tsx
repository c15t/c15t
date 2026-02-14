'use client';

import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import * as Button from '~/components/shared/ui/button';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useGVLData } from '../hooks/use-gvl-data';
import { useIABTranslations } from '../use-iab-translations';

interface IABConsentDialogFooterProps extends HTMLAttributes<HTMLDivElement> {
	children?: ReactNode;
}

/**
 * Footer component for the IAB Consent Dialog.
 *
 * @remarks
 * Contains action buttons (Reject All, Accept All, Save).
 *
 * @public
 */
const IABConsentDialogFooter = forwardRef<
	HTMLDivElement,
	IABConsentDialogFooterProps
>(({ children, className, ...props }, ref) => {
	const { iab: iabState, setActiveUI } = useConsentManager();
	const iabTranslations = useIABTranslations();
	const { isLoading } = useGVLData();

	const handleAcceptAll = () => {
		iabState?.acceptAll();
		iabState?.save();
		setActiveUI('none');
	};

	const handleRejectAll = () => {
		iabState?.rejectAll();
		iabState?.save();
		setActiveUI('none');
	};

	const handleSave = () => {
		iabState?.save();
		setActiveUI('none');
	};

	const footerClassName = className
		? `${styles.footer} ${className}`
		: styles.footer;

	return (
		<div ref={ref} className={footerClassName} {...props}>
			{children ? (
				children
			) : (
				<>
					<div className={styles.footerButtons}>
						<Button.Root
							variant="neutral"
							mode="stroke"
							size="small"
							onClick={handleRejectAll}
							disabled={isLoading}
						>
							{iabTranslations.common.rejectAll}
						</Button.Root>
						<Button.Root
							variant="neutral"
							mode="stroke"
							size="small"
							onClick={handleAcceptAll}
							disabled={isLoading}
						>
							{iabTranslations.common.acceptAll}
						</Button.Root>
					</div>
					<div className={styles.footerSpacer} />
					<Button.Root
						variant="primary"
						mode="filled"
						size="small"
						onClick={handleSave}
						disabled={isLoading}
					>
						{iabTranslations.common.saveSettings}
					</Button.Root>
				</>
			)}
		</div>
	);
});

IABConsentDialogFooter.displayName = 'IABConsentDialogFooter';

export { IABConsentDialogFooter };
