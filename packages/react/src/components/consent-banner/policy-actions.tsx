'use client';

import styles from '@c15t/ui/styles/components/consent-banner.module.js';
import type { ReactNode } from 'react';
import {
	type HeadlessConsentBannerAction,
	useHeadlessConsentUI,
} from '~/hooks/use-headless-consent-ui';
import {
	type PolicyActionRenderProps,
	PolicyActionsRenderer,
} from '../shared/policy-actions';
import {
	ConsentBannerAcceptButton,
	ConsentBannerCustomizeButton,
	ConsentBannerFooter,
	ConsentBannerFooterSubGroup,
	ConsentBannerRejectButton,
} from './components';

export interface ConsentBannerPolicyActionRenderProps
	extends PolicyActionRenderProps<HeadlessConsentBannerAction> {}

export interface ConsentBannerPolicyActionsProps {
	renderAction?: (
		action: HeadlessConsentBannerAction,
		props: ConsentBannerPolicyActionRenderProps
	) => ReactNode;
}

function renderDefaultAction(
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
					{...buttonProps}
				/>
			);
		default: {
			const _exhaustive: never = action;
			throw new Error(`Unhandled consent banner action: ${_exhaustive}`);
		}
	}
}

export function ConsentBannerPolicyActions({
	renderAction,
}: ConsentBannerPolicyActionsProps) {
	const { banner } = useHeadlessConsentUI();

	return (
		<PolicyActionsRenderer
			state={banner}
			Footer={ConsentBannerFooter}
			FooterSubGroup={ConsentBannerFooterSubGroup}
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

const PolicyActions = ConsentBannerPolicyActions;

export { PolicyActions };
