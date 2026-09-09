'use client';

import type { ReactNode } from 'react';

import { useHeadlessConsentUI } from '~/component-hooks/use-headless-consent-ui';
import type { HeadlessConsentBannerAction } from '~/component-hooks/use-headless-consent-ui';

import { warmDialogChunk } from '../../chunk-warming';
import { PolicyActionsRenderer } from '../shared/policy-actions';
import type { PolicyActionRenderProps } from '../shared/policy-actions';
import {
	ConsentBannerAcceptButton,
	ConsentBannerCustomizeButton,
	ConsentBannerDismissButton,
	ConsentBannerFooter,
	ConsentBannerFooterSubGroup,
	ConsentBannerRejectButton,
	ConsentBannerRights,
} from './components';
import { resolveBannerPrimaryActions } from './resolve-banner-primary-actions';

export type ConsentBannerPolicyActionRenderProps =
	PolicyActionRenderProps<HeadlessConsentBannerAction>;

export interface ConsentBannerPolicyActionsProps {
	renderAction?: (
		action: HeadlessConsentBannerAction,
		props: ConsentBannerPolicyActionRenderProps
	) => ReactNode;
}

const renderDefaultAction = function renderDefaultAction(
	action: HeadlessConsentBannerAction,
	props: ConsentBannerPolicyActionRenderProps
) {
	const { key, consentAction, ...buttonProps } = props;

	switch (action) {
		case 'accept':
			return (
				<ConsentBannerAcceptButton
					key={key}
					consentAction={consentAction}
					data-testid="consent-banner-accept-button"
					{...buttonProps}
				/>
			);
		case 'reject':
			return (
				<ConsentBannerRejectButton
					key={key}
					consentAction={consentAction}
					data-testid="consent-banner-reject-button"
					{...buttonProps}
				/>
			);
		case 'customize':
			return (
				<ConsentBannerCustomizeButton
					key={key}
					consentAction={consentAction}
					data-testid="consent-banner-customize-button"
					onPointerEnter={warmDialogChunk}
					onFocus={warmDialogChunk}
					{...buttonProps}
				/>
			);
		case 'dismiss':
			return (
				<ConsentBannerDismissButton
					key={key}
					consentAction={consentAction}
					data-testid="consent-banner-dismiss-button"
					{...buttonProps}
				/>
			);
		case 'save':
			return null;
		default: {
			const _exhaustive: never = action;
			throw new Error(`Unhandled consent banner action: ${_exhaustive}`);
		}
	}
};

export const ConsentBannerPolicyActions = ({
	renderAction,
}: ConsentBannerPolicyActionsProps) => {
	const { banner } = useHeadlessConsentUI();
	const state = {
		...banner,
		primaryActions: [
			...resolveBannerPrimaryActions(
				banner.primaryActions,
				banner.orderedActions
			),
		],
	};

	return (
		<PolicyActionsRenderer
			state={state}
			leading={<ConsentBannerRights rights={banner.uncoveredRights} />}
			Footer={ConsentBannerFooter}
			FooterSubGroup={ConsentBannerFooterSubGroup}
			classNames={{}}
			renderAction={renderAction}
			renderDefaultAction={renderDefaultAction}
		/>
	);
};

const PolicyActions = ConsentBannerPolicyActions;

export { PolicyActions };
