import actionStyles from '@c15t/ui/styles/v3/consent-actions';
import styles from '@c15t/ui/styles/v3/consent-manager';
import { forwardRef } from 'react';
import type { Ref } from 'react';

import { useTheme } from '~/v3/hooks/use-theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

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
	Omit<BoxProps, 'slotKey'>
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
>(function ConsentWidgetFooter({ children, className, style, ...props }, ref) {
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
ConsentWidgetFooter.displayName = 'ConsentWidgetFooter';

export const ConsentWidgetFooterSubGroup = forwardRef<HTMLDivElement, BoxProps>(
	// oxlint-disable-next-line prefer-arrow-callback -- React component definitions require function expressions.
	function ConsentWidgetFooterSubGroup({ children, ...props }, ref) {
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
ConsentWidgetFooterSubGroup.displayName = 'ConsentWidgetFooterSubGroup';

const Footer = ConsentWidgetFooter;
const FooterSubGroup = ConsentWidgetFooterSubGroup;

export { Footer, FooterSubGroup };
