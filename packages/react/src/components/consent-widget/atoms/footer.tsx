import styles from '@c15t/ui/styles/components/consent-widget.module.js';
import { forwardRef } from 'react';
import type { Ref } from 'react';

import { Box } from '../../shared/primitives/box';
import type { BoxProps } from '../../shared/primitives/box';

/**
 * Footer component for consent management actions.
 *
 * @remarks
 * - Contains primary action buttons
 * - Supports customization through theme
 * - Maintains consistent layout
 */
export const ConsentWidgetFooter = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(function ({ children, ...props }, ref) {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.footer}
			data-testid="consent-widget-footer"
			{...props}
			themeKey="consentWidgetFooter"
		>
			{children}
		</Box>
	);
});

ConsentWidgetFooter.displayName = 'ConsentWidgetFooter';

export const ConsentWidgetFooterSubGroup = forwardRef<HTMLDivElement, BoxProps>(
	function ({ children, ...props }, ref) {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={styles.footerSubGroup}
				data-testid="consent-widget-footer-sub-group"
				{...props}
				themeKey="consentWidgetFooterSubGroup"
			>
				{children}
			</Box>
		);
	}
);

ConsentWidgetFooterSubGroup.displayName = 'ConsentWidgetFooterSubGroup';

const Footer = ConsentWidgetFooter;
const FooterSubGroup = ConsentWidgetFooterSubGroup;

export { Footer, FooterSubGroup };
