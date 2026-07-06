'use client';

import styles from '@c15t/ui/styles/v3/iab-consent-banner';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { useTheme } from '~/v3/hooks/use-theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

interface IABConsentBannerFooterProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	'data-testid'?: string;
}

/**
 * Footer component for the IAB Consent Banner.
 *
 * @remarks
 * Container for action buttons (Accept, Reject, Customize).
 *
 * @public
 */
const IABConsentBannerFooter = forwardRef<
	HTMLDivElement,
	IABConsentBannerFooterProps
>(({ children, className, 'data-testid': dataTestId, ...props }, ref) => {
	const { components } = useUIConfig();
	const { noStyle } = useTheme();
	const themedStyle = mergeSlotProps(components?.['iab-banner']?.footer, {
		baseClassName: styles.footer,
		className,
		noStyle,
		'data-testid': dataTestId ?? 'iab-consent-banner-footer',
		...props,
	});

	return (
		<div
			ref={ref}
			{...themedStyle}
		>
			{children}
		</div>
	);
});

IABConsentBannerFooter.displayName = 'IABConsentBannerFooter';

export { IABConsentBannerFooter };
