import actionStyles from '@c15t/ui/styles/v3/consent-actions';
import styles from '@c15t/ui/styles/v3/consent-manager';
import { forwardRef, type Ref } from 'react';
import { Box, type BoxProps } from '../../shared/primitives/box';

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
>(({ children, ...props }, ref) => {
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

export const ConsentWidgetFooterSubGroup = forwardRef<HTMLDivElement, BoxProps>(
	({ children, ...props }, ref) => {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={actionStyles.actionGroup}
				data-testid="consent-widget-footer-sub-group"
				{...props}
				themeKey="consentWidgetFooter"
			>
				{children}
			</Box>
		);
	}
);

const Footer = ConsentWidgetFooter;
const FooterSubGroup = ConsentWidgetFooterSubGroup;

export { Footer, FooterSubGroup };
