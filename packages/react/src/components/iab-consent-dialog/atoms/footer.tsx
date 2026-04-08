'use client';

import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
import { sanitizeDOMStyleProps } from '@c15t/ui/utils';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import * as Button from '~/components/shared/ui/button';
import { useHeadlessIABConsentUI } from '~/hooks/use-headless-iab-consent-ui';
import { useStyles } from '~/hooks/use-styles';
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
	const { performDialogAction } = useHeadlessIABConsentUI();
	const iabTranslations = useIABTranslations();
	const { isLoading } = useGVLData();

	const handleAcceptAll = () => {
		void performDialogAction('accept');
	};

	const handleRejectAll = () => {
		void performDialogAction('reject');
	};

	const handleSave = () => {
		void performDialogAction('customize');
	};

	const themedStyle = useStyles('iabConsentDialogFooter', {
		baseClassName: styles.footer,
		className,
	});
	const domStyleProps = sanitizeDOMStyleProps(themedStyle);

	return (
		<div ref={ref} {...domStyleProps} {...props}>
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
