'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner';
import { forwardRef as createForwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

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
const IABConsentBannerFooter = createForwardRef<
	HTMLDivElement,
	IABConsentBannerFooterProps
>(({ children, className, 'data-testid': dataTestId, ...props }, ref) => {
	const { components } = useUIConfig();
	const { noStyle } = useTheme();
	const themedStyle = mergeSlotProps(components?.['iab-banner']?.footer, {
		baseClassName: styles.footer,
		className,
		'data-testid': dataTestId ?? 'iab-consent-banner-footer',
		noStyle,
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
