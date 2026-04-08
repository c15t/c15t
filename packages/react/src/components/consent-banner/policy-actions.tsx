'use client';

import styles from '@c15t/ui/styles/components/consent-banner.module.js';
import { Fragment, type ReactNode } from 'react';
import {
	type HeadlessConsentBannerAction,
	useHeadlessConsentUI,
} from '~/hooks/use-headless-consent-ui';
import type { CSSPropertiesWithVars, CSSVariables } from '~/types/theme';
import { cnExt as cn } from '~/utils/cn';
import {
	ConsentBannerAcceptButton,
	ConsentBannerCustomizeButton,
	ConsentBannerFooter,
	ConsentBannerFooterSubGroup,
	ConsentBannerRejectButton,
} from './components';

export interface ConsentBannerPolicyActionRenderProps {
	key: string;
	isPrimary: boolean;
	style?: CSSPropertiesWithVars<CSSVariables>;
}

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
	const { key, ...buttonProps } = props;

	switch (action) {
		case 'accept':
			return (
				<ConsentBannerAcceptButton
					key={key}
					consentAction="accept"
					data-testid="consent-banner-accept-button"
					{...buttonProps}
				/>
			);
		case 'reject':
			return (
				<ConsentBannerRejectButton
					key={key}
					consentAction="reject"
					data-testid="consent-banner-reject-button"
					{...buttonProps}
				/>
			);
		case 'customize':
			return (
				<ConsentBannerCustomizeButton
					key={key}
					consentAction="customize"
					data-testid="consent-banner-customize-button"
					{...buttonProps}
				/>
			);
	}
}

export function ConsentBannerPolicyActions({
	renderAction,
}: ConsentBannerPolicyActionsProps) {
	const { banner } = useHeadlessConsentUI();
	const shouldFillActions = banner.shouldFillActions;
	const isColumn = banner.direction === 'column';
	const actionStyle = shouldFillActions
		? ({
				width: '100%',
				flex: 1,
			} satisfies CSSPropertiesWithVars<CSSVariables>)
		: undefined;

	return (
		<ConsentBannerFooter
			className={cn(
				shouldFillActions && styles.footerFill,
				isColumn && styles.footerColumn
			)}
		>
			{banner.actionGroups.map((group, groupIndex) => (
				<ConsentBannerFooterSubGroup
					key={`group-${group.join('-') || groupIndex}`}
					className={cn(
						shouldFillActions && styles.footerSubGroupFill,
						isColumn && styles.footerSubGroupColumn
					)}
				>
					{group.map((action) => {
						const itemKey = `action-${action}`;
						const renderProps: ConsentBannerPolicyActionRenderProps = {
							key: itemKey,
							isPrimary: banner.primaryActions.includes(action),
							style: actionStyle,
						};

						return (
							<Fragment key={itemKey}>
								{renderAction?.(action, renderProps) ??
									renderDefaultAction(action, renderProps)}
							</Fragment>
						);
					})}
				</ConsentBannerFooterSubGroup>
			))}
		</ConsentBannerFooter>
	);
}

const PolicyActions = ConsentBannerPolicyActions;

export { PolicyActions };
