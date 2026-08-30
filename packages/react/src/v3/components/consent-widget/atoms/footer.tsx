import actionStyles from '@c15t/ui/styles/v3/consent-actions';
import styles from '@c15t/ui/styles/v3/consent-manager';
import { forwardRef, type Ref } from 'react';

import { useTheme } from '~/v3/hooks/use-theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

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
	Omit<BoxProps, 'slotKey'>
>(({ children, className, style, ...props }, ref) => {
	const { components } = useUIConfig();
	const { noStyle } = useTheme();
	const actionProps = mergeSlotProps(components?.manager?.actions, {
		baseClassName: className,
		noStyle,
		style,
		...props,
	});

	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.footer}
			data-testid="consent-widget-footer"
			{...actionProps}
			slotKey="manager.footer"
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
				slotKey="manager.actionGroup"
			>
				{children}
			</Box>
		);
	}
);

const Footer = ConsentWidgetFooter;
const FooterSubGroup = ConsentWidgetFooterSubGroup;

export { Footer, FooterSubGroup };
