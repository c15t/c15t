'use client';

import styles from '@c15t/ui/styles/components/consent-widget.module.js';
import { Fragment, type ReactNode } from 'react';
import {
	type HeadlessConsentDialogAction,
	useHeadlessConsentUI,
} from '~/hooks/use-headless-consent-ui';
import type { CSSPropertiesWithVars, CSSVariables } from '~/types/theme';
import { cnExt as cn } from '~/utils/cn';
import {
	ConsentWidgetAcceptAllButton,
	ConsentWidgetRejectButton,
	ConsentWidgetSaveButton,
} from './atoms/button';
import {
	ConsentWidgetFooter,
	ConsentWidgetFooterSubGroup,
} from './atoms/footer';

export interface ConsentWidgetPolicyActionRenderProps {
	key: string;
	isPrimary: boolean;
	style?: CSSPropertiesWithVars<CSSVariables>;
}

export interface ConsentWidgetPolicyActionsProps {
	renderAction?: (
		action: HeadlessConsentDialogAction,
		props: ConsentWidgetPolicyActionRenderProps
	) => ReactNode;
}

function renderDefaultAction(
	action: HeadlessConsentDialogAction,
	props: ConsentWidgetPolicyActionRenderProps
) {
	const { key, ...buttonProps } = props;

	switch (action) {
		case 'accept':
			return (
				<ConsentWidgetAcceptAllButton
					key={key}
					data-testid="consent-widget-footer-accept-button"
					{...buttonProps}
				/>
			);
		case 'reject':
			return (
				<ConsentWidgetRejectButton
					key={key}
					data-testid="consent-widget-reject-button"
					{...buttonProps}
				/>
			);
		case 'customize':
			return (
				<ConsentWidgetSaveButton
					key={key}
					data-testid="consent-widget-footer-save-button"
					{...buttonProps}
				/>
			);
	}
}

export function ConsentWidgetPolicyActions({
	renderAction,
}: ConsentWidgetPolicyActionsProps) {
	const { dialog } = useHeadlessConsentUI();
	const shouldFillActions = dialog.shouldFillActions;
	const isColumn = dialog.direction === 'column';
	const actionStyle = shouldFillActions
		? ({
				width: '100%',
				flex: 1,
			} satisfies CSSPropertiesWithVars<CSSVariables>)
		: undefined;

	return (
		<ConsentWidgetFooter
			className={cn(
				shouldFillActions && styles.footerFill,
				isColumn && styles.footerColumn
			)}
		>
			{dialog.actionGroups.map((group, groupIndex) => (
				<ConsentWidgetFooterSubGroup
					key={`group-${group.join('-') || groupIndex}`}
					themeKey="consentWidgetFooter"
					className={cn(
						shouldFillActions && styles.footerGroupFill,
						isColumn && styles.footerGroupColumn
					)}
				>
					{group.map((action) => {
						const itemKey = `action-${action}`;
						const renderProps: ConsentWidgetPolicyActionRenderProps = {
							key: itemKey,
							isPrimary: dialog.primaryActions.includes(action),
							style: actionStyle,
						};

						return (
							<Fragment key={itemKey}>
								{renderAction?.(action, renderProps) ??
									renderDefaultAction(action, renderProps)}
							</Fragment>
						);
					})}
				</ConsentWidgetFooterSubGroup>
			))}
		</ConsentWidgetFooter>
	);
}

const PolicyActions = ConsentWidgetPolicyActions;

export { PolicyActions };
