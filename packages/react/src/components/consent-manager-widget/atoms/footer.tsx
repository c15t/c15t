import styles from '@c15t/ui/styles/components/consent-manager-widget.module.css';
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
export const ConsentManagerWidgetFooter = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.footer}
			data-testid="consent-manager-widget-footer"
			{...props}
			themeKey="widgetFooter"
		>
			{children}
		</Box>
	);
});

export const ConsentManagerWidgetFooterSubGroup = forwardRef<
	HTMLDivElement,
	BoxProps
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.footerGroup}
			data-testid="consent-manager-widget-footer-sub-group"
			{...props}
			themeKey="widgetFooter"
		>
			{children}
		</Box>
	);
});

const Footer = ConsentManagerWidgetFooter;
const FooterSubGroup = ConsentManagerWidgetFooterSubGroup;

export { Footer, FooterSubGroup };
