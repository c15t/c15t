'use client';

import styles from '@c15t/ui/styles/components/consent-widget.module.js';
import type { ReactNode } from 'react';
import {
	type HeadlessConsentDialogAction,
	useHeadlessConsentUI,
} from '~/hooks/use-headless-consent-ui';
import {
	type PolicyActionRenderProps,
	PolicyActionsRenderer,
} from '../shared/policy-actions';
import {
	ConsentWidgetAcceptAllButton,
	ConsentWidgetRejectButton,
	ConsentWidgetSaveButton,
} from './atoms/button';
import {
	ConsentWidgetFooter,
	ConsentWidgetFooterSubGroup,
} from './atoms/footer';

export interface ConsentWidgetPolicyActionRenderProps
	extends PolicyActionRenderProps<HeadlessConsentDialogAction> {}

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
	const { key, consentAction, ...buttonProps } = props;

	switch (action) {
		case 'accept':
			return (
				<ConsentWidgetAcceptAllButton
					key={key}
					consentAction={consentAction}
					data-testid="consent-widget-footer-accept-all-button"
					{...buttonProps}
				/>
			);
		case 'reject':
			return (
				<ConsentWidgetRejectButton
					key={key}
					consentAction={consentAction}
					data-testid="consent-widget-reject-button"
					{...buttonProps}
				/>
			);
		case 'customize':
			return (
				<ConsentWidgetSaveButton
					key={key}
					consentAction={consentAction}
					data-testid="consent-widget-footer-save-button"
					{...buttonProps}
				/>
			);
		default: {
			const _exhaustive: never = action;
			throw new Error(`Unhandled consent widget action: ${_exhaustive}`);
		}
	}
}

export function ConsentWidgetPolicyActions({
	renderAction,
}: ConsentWidgetPolicyActionsProps) {
	const { dialog } = useHeadlessConsentUI();

	return (
		<PolicyActionsRenderer
			state={dialog}
			Footer={ConsentWidgetFooter}
			FooterSubGroup={ConsentWidgetFooterSubGroup}
			classNames={{
				footerFill: styles.footerFill,
				footerColumn: styles.footerColumn,
				footerSubGroupFill: styles.footerSubGroupFill,
				footerSubGroupColumn: styles.footerSubGroupColumn,
			}}
			renderAction={renderAction}
			renderDefaultAction={renderDefaultAction}
		/>
	);
}

const PolicyActions = ConsentWidgetPolicyActions;

export { PolicyActions };
