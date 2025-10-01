import styles from '@c15t/styles/components/consent-manager-widget/css';
import type { Ref } from 'preact';
import { forwardRef } from 'preact/compat';
import { Box, type BoxProps } from '~/components/shared/primitives/box';

/**
 * Footer component for consent management actions.
 *
 * @remarks
 * - Contains primary action buttons
 * - Supports customisation through theme
 * - Maintains consistent layout
 */
export const ConsentManagerWidgetFooter = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref: Ref<HTMLDivElement>) => {
	return (
		<Box
			ref={ref}
			baseClassName={styles.footer}
			data-testid="consent-manager-widget-footer"
			{...props}
			themeKey="widget.footer"
		>
			{children}
		</Box>
	);
});

export const ConsentManagerWidgetFooterSubGroup = forwardRef<
	HTMLDivElement,
	BoxProps
>(({ children, ...props }, ref: Ref<HTMLDivElement>) => {
	return (
		<Box
			ref={ref}
			baseClassName={styles.footerGroup}
			data-testid="consent-manager-widget-footer-sub-group"
			{...props}
			themeKey="widget.footer.sub-group"
		>
			{children}
		</Box>
	);
});

const Footer = ConsentManagerWidgetFooter;
const FooterSubGroup = ConsentManagerWidgetFooterSubGroup;

export { Footer, FooterSubGroup };
