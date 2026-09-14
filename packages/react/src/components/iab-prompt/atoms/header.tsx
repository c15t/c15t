'use client';

import styles from '@c15t/ui/styles/components/iab-consent-banner';
import { forwardRef as createForwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

import { useTheme } from '~/hooks/use-theme';
import { useUIConfig } from '~/ui-config-context';
import { mergeSlotProps } from '~/utils/merge-slot-props';

interface IABConsentBannerHeaderProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	'data-testid'?: string;
}

/**
 * Header component for the IAB Consent Banner.
 *
 * @remarks
 * Container for title, description, purpose list, and legitimate interest notice.
 *
 * @public
 */
const IABConsentBannerHeader = createForwardRef<
	HTMLDivElement,
	IABConsentBannerHeaderProps
>(({ children, className, 'data-testid': dataTestId, ...props }, ref) => {
	const { components } = useUIConfig();
	const { noStyle } = useTheme();
	const themedStyle = mergeSlotProps(components?.['iab-banner']?.header, {
		baseClassName: styles.header,
		className,
		'data-testid': dataTestId ?? 'iab-consent-banner-header',
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

IABConsentBannerHeader.displayName = 'IABConsentBannerHeader';

export { IABConsentBannerHeader };
