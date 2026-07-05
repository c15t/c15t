'use client';

import actionStyles from '@c15t/ui/styles/v3/consent-actions';
import { type ComponentType, Fragment, type ReactNode } from 'react';
import type { HeadlessConsentSurfaceState } from '~/v3/component-hooks/use-headless-consent-ui';
import type { CSSPropertiesWithVars, CSSVariables } from '~/v3/types/theme';
import { cnExt as cn } from '~/v3/utils/cn';

export interface PolicyActionRenderProps<TAction extends string> {
	key: string;
	consentAction: TAction;
	isPrimary: boolean;
	style?: CSSPropertiesWithVars<CSSVariables>;
}

interface PolicyActionsLayoutProps {
	children?: ReactNode;
	className?: string;
	'data-direction'?: string;
	'data-fill'?: true | undefined;
	'data-split'?: true | undefined;
}

interface PolicyActionsClassNames {
	footerFill?: string;
	footerColumn?: string;
	footerSubGroupFill?: string;
	footerSubGroupColumn?: string;
}

interface PolicyActionsRendererProps<TAction extends string> {
	state: Pick<
		HeadlessConsentSurfaceState<TAction>,
		'actionGroups' | 'primaryActions' | 'shouldFillActions' | 'direction'
	>;
	Footer: ComponentType<PolicyActionsLayoutProps>;
	FooterSubGroup: ComponentType<PolicyActionsLayoutProps>;
	classNames: PolicyActionsClassNames;
	renderDefaultAction: (
		action: TAction,
		props: PolicyActionRenderProps<TAction>
	) => ReactNode;
	renderAction?: (
		action: TAction,
		props: PolicyActionRenderProps<TAction>
	) => ReactNode;
}

export function PolicyActionsRenderer<TAction extends string>({
	state,
	Footer,
	FooterSubGroup,
	classNames,
	renderDefaultAction,
	renderAction,
}: PolicyActionsRendererProps<TAction>) {
	const shouldFillActions = state.shouldFillActions;
	const isColumn = state.direction === 'column';
	const isSplit = state.actionGroups.length > 1;
	const actionStyle = shouldFillActions
		? ({
				width: '100%',
				flex: 1,
			} satisfies CSSPropertiesWithVars<CSSVariables>)
		: undefined;

	return (
		<Footer
			className={cn(
				actionStyles.actionRoot,
				shouldFillActions && classNames.footerFill,
				isColumn && classNames.footerColumn
			)}
			data-direction={state.direction}
			data-fill={shouldFillActions ? true : undefined}
			data-split={isSplit && !shouldFillActions ? true : undefined}
		>
			{state.actionGroups.map((group, groupIndex) => (
				<FooterSubGroup
					key={`group-${group.join('-') || groupIndex}`}
					className={cn(
						actionStyles.actionGroup,
						shouldFillActions && classNames.footerSubGroupFill,
						isColumn && classNames.footerSubGroupColumn
					)}
					data-direction={state.direction}
					data-fill={shouldFillActions ? true : undefined}
				>
					{group.map((action) => {
						const itemKey = `action-${action}`;
						const renderProps: PolicyActionRenderProps<TAction> = {
							key: itemKey,
							consentAction: action,
							isPrimary: state.primaryActions.includes(action),
							style: actionStyle,
						};

						return (
							<Fragment key={itemKey}>
								{renderAction?.(action, renderProps) ??
									renderDefaultAction(action, renderProps)}
							</Fragment>
						);
					})}
				</FooterSubGroup>
			))}
		</Footer>
	);
}
