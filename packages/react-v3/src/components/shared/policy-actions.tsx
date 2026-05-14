'use client';

import { type ComponentType, Fragment, type ReactNode } from 'react';
import type { HeadlessConsentSurfaceState } from '~/hooks/use-headless-consent-ui';
import type { CSSPropertiesWithVars, CSSVariables } from '~/types/theme';
import { cnExt as cn } from '~/utils/cn';

export interface PolicyActionRenderProps<TAction extends string> {
	key: string;
	consentAction: TAction;
	isPrimary: boolean;
	style?: CSSPropertiesWithVars<CSSVariables>;
}

interface PolicyActionsLayoutProps {
	children?: ReactNode;
	className?: string;
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
	const actionStyle = shouldFillActions
		? ({
				width: '100%',
				flex: 1,
			} satisfies CSSPropertiesWithVars<CSSVariables>)
		: undefined;

	return (
		<Footer
			className={cn(
				shouldFillActions && classNames.footerFill,
				isColumn && classNames.footerColumn
			)}
		>
			{state.actionGroups.map((group, groupIndex) => (
				<FooterSubGroup
					key={`group-${group.join('-') || groupIndex}`}
					className={cn(
						shouldFillActions && classNames.footerSubGroupFill,
						isColumn && classNames.footerSubGroupColumn
					)}
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
