'use client';

import styles from '@c15t/ui/styles/components/consent-widget.module.js';
import { useState } from 'react';
import type { AccordionRootProps } from '~/components/shared/ui/accordion';
import {
	type HeadlessConsentDialogAction,
	useHeadlessConsentUI,
} from '~/hooks/use-headless-consent-ui';
import { useTheme } from '~/hooks/use-theme';
import { cnExt as cn } from '~/utils/cn';
import { ConsentDialogFooter } from '../consent-dialog/atoms/card';
import {
	ConsentWidgetAccordion,
	ConsentWidgetAccordionItems,
} from './atoms/accordion';
import {
	ConsentWidgetAcceptAllButton,
	ConsentWidgetRejectButton,
	ConsentWidgetSaveButton,
} from './atoms/button';
import {
	ConsentWidgetFooter,
	ConsentWidgetFooterSubGroup,
} from './atoms/footer';
import { ConsentWidgetRoot } from './atoms/root';
import type { ConsentWidgetProps } from './types';
export const ConsentWidget = ({
	hideBranding,
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus,
	...props
}: ConsentWidgetProps) => {
	const [openItem, setOpenItem] = useState('');
	const { dialog } = useHeadlessConsentUI();

	// Get global theme context
	const globalTheme = useTheme();

	const mergedProps = {
		noStyle: localNoStyle ?? globalTheme.noStyle,
		disableAnimation: localDisableAnimation ?? globalTheme.disableAnimation,
		scrollLock: localScrollLock ?? globalTheme.scrollLock,
		trapFocus: localTrapFocus ?? globalTheme.trapFocus,
		...props,
	};

	const actionGroups = dialog.actionGroups;
	const shouldFillActions = dialog.shouldFillActions;
	const direction = dialog.direction;

	const renderAction = (
		action: HeadlessConsentDialogAction,
		isPrimary: boolean,
		className?: string
	) => {
		switch (action) {
			case 'accept':
				return (
					<ConsentWidgetAcceptAllButton
						key="accept"
						isPrimary={isPrimary}
						className={className}
					/>
				);
			case 'reject':
				return (
					<ConsentWidgetRejectButton
						key="reject"
						isPrimary={isPrimary}
						className={className}
					/>
				);
			case 'customize':
				return (
					<ConsentWidgetSaveButton
						key="customize"
						isPrimary={isPrimary}
						className={className}
					/>
				);
		}
	};

	return (
		<ConsentWidgetRoot {...mergedProps}>
			<ConsentWidgetAccordion
				type="single"
				value={openItem}
				onValueChange={(value: NonNullable<AccordionRootProps['value']>) => {
					setOpenItem(Array.isArray(value) ? (value[0] ?? '') : (value ?? ''));
				}}
			>
				<ConsentWidgetAccordionItems />
			</ConsentWidgetAccordion>
			<ConsentWidgetFooter
				className={cn(
					shouldFillActions && styles.footerFill,
					direction === 'column' && styles.footerColumn
				)}
			>
				{actionGroups.map((group, index) => (
					<ConsentWidgetFooterSubGroup
						key={`group-${group.join('-') || index}`}
						themeKey="consentWidgetFooter"
						className={cn(
							shouldFillActions && styles.footerGroupFill,
							direction === 'column' && styles.footerGroupColumn
						)}
					>
						{group.map((action) =>
							renderAction(
								action,
								dialog.primaryActions.includes(action),
								shouldFillActions ? styles.actionButtonFill : undefined
							)
						)}
					</ConsentWidgetFooterSubGroup>
				))}
			</ConsentWidgetFooter>
			<ConsentDialogFooter
				themeKey="consentWidgetBranding"
				hideBranding={hideBranding ?? true}
				data-testid="consent-widget-branding"
			/>
		</ConsentWidgetRoot>
	);
};
