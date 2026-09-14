'use client';

import type { ReactNode } from 'react';

import { useHeadlessConsentUI } from '~/component-hooks/use-headless-consent-ui';
import type { HeadlessConsentDialogAction } from '~/component-hooks/use-headless-consent-ui';
import { useConsentDraft } from '~/draft';

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
		case 'save':
			return (
				<ConsentWidgetSaveButton
					key={key}
					consentAction={consentAction}
					data-testid="consent-widget-footer-save-button"
					{...buttonProps}
				/>
			);
		case 'customize':
		case 'dismiss':
			return null;
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
	const draft = useConsentDraft();
	const handleReview = draft.reset;

	return (
		<>
			{draft.isStale ? (
				<div role="alert">
					The privacy policy changed. Review the current choices before saving.{' '}
					<button
						type="button"
						onClick={handleReview}
					>
						Review choices
					</button>
				</div>
			) : null}
			<PolicyActionsRenderer
				state={dialog}
				Footer={ConsentWidgetFooter}
				FooterSubGroup={ConsentWidgetFooterSubGroup}
				classNames={{}}
				renderAction={renderAction}
				renderDefaultAction={renderDefaultAction}
			/>
		</>
	);
};

const PolicyActions = ConsentWidgetPolicyActions;

export { PolicyActions };
