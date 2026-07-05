'use client';

import actionStyles from '@c15t/ui/styles/v3/consent-actions';
import styles from '@c15t/ui/styles/v3/iab-consent-dialog';
import { sanitizeDOMStyleProps } from '@c15t/ui/utils';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { useHeadlessIABConsentUI } from '~/v3/component-hooks/use-headless-iab-consent-ui';
import * as Button from '~/v3/components/shared/ui/button';
import { useStyles } from '~/v3/hooks/use-styles';
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
		baseClassName: [styles.footer, actionStyles.actionRoot],
		className,
	});
	const domStyleProps = sanitizeDOMStyleProps(themedStyle);

	return (
		<div
			ref={ref}
			{...domStyleProps}
			{...props}
		>
			{children ? (
				children
			) : (
				<>
					<div
						className={actionStyles.actionGroup}
						data-direction="row"
					>
						<Button.Root
							variant="neutral"
							mode="stroke"
							size="small"
							onClick={handleRejectAll}
							disabled={isLoading}
							data-action="reject"
						>
							{iabTranslations.common.rejectAll}
						</Button.Root>
						<Button.Root
							variant="neutral"
							mode="stroke"
							size="small"
							onClick={handleAcceptAll}
							disabled={isLoading}
							data-action="accept"
						>
							{iabTranslations.common.acceptAll}
						</Button.Root>
					</div>
					<Button.Root
						variant="primary"
						mode="filled"
						size="small"
						onClick={handleSave}
						disabled={isLoading}
						data-action="customize"
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
