'use client';

import actionStyles from '@c15t/ui/styles/components/consent-actions';
import styles from '@c15t/ui/styles/components/iab-consent-dialog';
import { forwardRef as createForwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

import { useHeadlessIABConsentUI } from '~/component-hooks/use-headless-iab-consent-ui';
import * as Button from '~/components/shared/ui/button';
import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

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
const IABConsentDialogFooter = createForwardRef<
	HTMLDivElement,
	IABConsentDialogFooterProps
>(({ children, className, ...props }, ref) => {
	const { performDialogAction } = useHeadlessIABConsentUI();
	const { components } = useUIConfig();
	const { noStyle } = useTheme();
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

	const themedStyle = mergeSlotProps(components?.['iab-dialog']?.footer, {
		baseClassName: [styles.footer, actionStyles.actionRoot],
		className,
		noStyle,
		...props,
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
