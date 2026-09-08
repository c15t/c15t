import {
	DEFAULT_POLICY_ACTION_LAYOUT,
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyDirection,
	resolvePolicyOrderedActions,
	resolvePolicyPrimaryActions,
	shouldFillPolicyActions,
} from '@c15t/core';
import type {
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiSurfaceConfig,
} from '@c15t/core';

import { classes } from '../generated/styles';
import { cx, h } from './dom';

/** The buttons a surface renders, in order, after policy hints. */
export interface ResolvedActions {
	/** Button groups; more than one means a split footer. */
	groups: PolicyUiAction[][];
	/** Which actions render as primary. */
	primary: PolicyUiAction[];
	/** Row or column. */
	direction: PolicyUiActionDirection;
	/** Whether buttons stretch to fill the footer. */
	fill: boolean;
}

/**
 * Resolve a surface's buttons from the policy's UI hints.
 *
 * The same resolvers every other adapter uses, so an opt-out or split
 * layout renders the same buttons in the same order here.
 *
 * @param surface - The policy's hints for this surface, if any.
 * @param defaults - Layout and primary actions when the policy is silent.
 * @returns The resolved actions.
 */
export const resolveActions = function resolveActions(
	surface: Readonly<PolicyUiSurfaceConfig> | null,
	defaults: { layout?: PolicyUiActionGroup[]; primary: PolicyUiAction[] }
): ResolvedActions {
	const allowedActions = resolvePolicyAllowedActions({
		allowedActions: surface?.allowedActions,
	});
	const layout =
		(surface?.layout?.length ?? 0) > 0
			? surface?.layout
			: (defaults.layout ?? DEFAULT_POLICY_ACTION_LAYOUT);
	const orderedActions = resolvePolicyOrderedActions({
		allowedActions,
		layout,
	});
	const groups = resolvePolicyActionGroups({ allowedActions, layout });
	const direction = resolvePolicyDirection(surface?.direction);
	const primary = resolvePolicyPrimaryActions({
		orderedActions,
		primaryActions:
			(surface?.primaryActions?.length ?? 0) > 0
				? (surface?.primaryActions ?? [])
				: defaults.primary,
	});
	const fill = shouldFillPolicyActions({
		actionGroups: groups,
		direction,
		uiProfile: surface?.uiProfile,
	});
	return { direction, fill, groups, primary };
};

/** What {@link renderActionFooter} needs. */
export interface ActionFooterParams {
	/** The resolved actions. */
	actions: ResolvedActions;
	/** Extra class on the footer root (the surface's `footer`). */
	footerClassName: string;
	/** Ship the DOM without class names. */
	noStyle: boolean;
	/** Test id for the footer. */
	testId: string;
	/** Test id for each sub group. */
	subGroupTestId: string;
	/** Label for an action. */
	label: (action: PolicyUiAction) => string;
	/** Test id for an action's button. */
	buttonTestId: (action: PolicyUiAction) => string;
	/** Click handler. */
	onAction: (action: PolicyUiAction) => void;
}

/**
 * Render a surface's button footer.
 *
 * @param params - Actions, classes and handlers.
 * @returns The footer element.
 */
export const renderActionFooter = function renderActionFooter(
	params: ActionFooterParams
): HTMLElement {
	const { actions, noStyle } = params;
	const footer = h('div', {
		class: noStyle
			? ''
			: cx(classes.actions.actionRoot, params.footerClassName),
		'data-direction': actions.direction,
		'data-fill': actions.fill ? 'true' : undefined,
		'data-split':
			actions.groups.length > 1 && !actions.fill ? 'true' : undefined,
		'data-testid': params.testId,
	});
	for (const group of actions.groups) {
		const groupElement = h('div', {
			class: noStyle ? '' : classes.actions.actionGroup,
			'data-direction': actions.direction,
			'data-fill': actions.fill ? 'true' : undefined,
			'data-testid': params.subGroupTestId,
		});
		for (const action of group) {
			const variant = actions.primary.includes(action) ? 'primary' : 'neutral';
			groupElement.append(
				h(
					'button',
					{
						class: noStyle ? '' : classes.button.button,
						'data-action': action,
						'data-mode': noStyle ? undefined : 'stroke',
						'data-size': noStyle ? undefined : 'small',
						'data-testid': params.buttonTestId(action),
						'data-variant': noStyle ? undefined : variant,
						onclick: () => {
							params.onAction(action);
						},
						type: 'button',
					},
					params.label(action)
				)
			);
		}
		footer.append(groupElement);
	}
	return footer;
};
