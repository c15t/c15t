'use client';

import type { ReactNode } from 'react';

import { useHeadlessConsentUI } from '~/v3/component-hooks/use-headless-consent-ui';
import type { HeadlessConsentDialogAction } from '~/v3/component-hooks/use-headless-consent-ui';

import { PolicyActionsRenderer } from '../shared/policy-actions';
import type { PolicyActionRenderProps } from '../shared/policy-actions';
import {
	ConsentWidgetAcceptAllButton,
	ConsentWidgetRejectButton,
	ConsentWidgetSaveButton,
} from './atoms/button';
import {
	ConsentWidgetFooter,
	ConsentWidgetFooterSubGroup,
} from './atoms/footer';

export type ConsentWidgetPolicyActionRenderProps =
	PolicyActionRenderProps<HeadlessConsentDialogAction>;

export interface ConsentWidgetPolicyActionsProps {
	renderAction?: (
		action: HeadlessConsentDialogAction,
		props: ConsentWidgetPolicyActionRenderProps
	) => ReactNode;
}

const renderDefaultAction = function renderDefaultAction(
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
};

export const ConsentWidgetPolicyActions = ({
	renderAction,
}: ConsentWidgetPolicyActionsProps) => {
	const { dialog } = useHeadlessConsentUI();

	return (
		<PolicyActionsRenderer
			state={dialog}
			Footer={ConsentWidgetFooter}
			FooterSubGroup={ConsentWidgetFooterSubGroup}
			classNames={{}}
			renderAction={renderAction}
			renderDefaultAction={renderDefaultAction}
		/>
	);
};

const PolicyActions = ConsentWidgetPolicyActions;

export { PolicyActions };
